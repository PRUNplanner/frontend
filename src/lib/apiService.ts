import axios, {
	type AxiosInstance,
	type InternalAxiosRequestConfig,
	isAxiosError,
	isCancel,
} from "axios";
import { ZodError, type ZodType, type z } from "zod";
import apiConfig from "@/lib/config";
import { trackException } from "@/lib/analytics/useAnalytics";
import { correlationId } from "@/lib/requestIds";
import { type IClientErrorReport, reportClientError } from "@/lib/clientErrors";
import { issuePathTemplate, pathTemplate } from "@/util/pathTemplate";

/**
 * Service making calls to PRUNplanner backend
 * @author jplacht
 *
 * @export
 * @class ApiService
 * @typedef {ApiService}
 */
// when each API call was sent, for client_ms
const sentAt = new WeakMap<object, number>();

// last network error per GET path: a lone one is a blip (e.g. a backend
// deploy) the next refresh retries, only a repeat is worth reporting
// ponytail: only catches the retry of queries expiring within it (GetAllShared
// expires after 60 min), track the query retry instead if those matter
const NETWORK_REPEAT_MS = 10 * 60_000;
const lastNetworkFailure = new Map<string, number>();

/**
 * Records a GET network error and tells if the same path failed
 * within NETWORK_REPEAT_MS before
 *
 * @param {string} pathTemplate Path template
 * @returns {boolean} Repeated failure
 */
function isRepeatedNetworkFailure(pathTemplate: string): boolean {
	const now = Date.now();
	const last = lastNetworkFailure.get(pathTemplate);
	lastNetworkFailure.set(pathTemplate, now);
	return last !== undefined && now - last < NETWORK_REPEAT_MS;
}

/**
 * Sets the request and session id on calls to the API. The client is
 * the global axios instance, so other origins must not get them.
 *
 * @param {InternalAxiosRequestConfig} config Request config
 * @returns {InternalAxiosRequestConfig} Request config
 */
function setRequestIds(
	config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
	const origin = new URL(axios.getUri(config), location.href).origin;
	if (origin !== new URL(apiConfig.API_BASE_URL).origin) return config;

	config.headers.set("X-Request-ID", crypto.randomUUID());
	config.headers.set("X-Correlation-ID", correlationId());
	sentAt.set(config, performance.now());
	return config;
}

class ApiService {
	// needs to be public for axios-mock-adapter
	public readonly client: AxiosInstance;

	constructor() {
		this.client = axios;
		this.client.defaults.baseURL = apiConfig.API_BASE_URL;
		this.client.interceptors.request.use(setRequestIds);
	}

	/**
	 * Performs a GET request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Res Response Schema
	 * @param {string} path URL
	 * @param {Res} responseSchema Response Schema
	 * @returns {Promise<z.output<Res>>}
	 */
	public async get<Res extends ZodType>(
		path: string,
		responseSchema: Res
	): Promise<z.output<Res>> {
		// the call whose response failed validation
		let request: InternalAxiosRequestConfig | undefined;

		try {
			const { data, config } = await this.client.get(path);
			request = config;
			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "GET", path, request);
		}
	}

	/**
	 * Performs a POST request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Req Request Schema
	 * @template Res Response Schema
	 * @param {string} path URL
	 * @param {z.input<Req>} payload Payload data
	 * @param {Req} requestSchema Request Schema
	 * @param {Res} responseSchema Response Schema
	 * @param {?boolean} [asForm] adds multipart/form-data header
	 * @returns {Promise<z.output<Res>>}
	 */
	public async post<Req extends ZodType, Res extends ZodType>(
		path: string,
		payload: z.input<Req>,
		requestSchema: Req,
		responseSchema: Res,
		asForm?: boolean
	): Promise<z.output<Res>> {
		// the call whose response failed validation
		let request: InternalAxiosRequestConfig | undefined;

		try {
			const body = requestSchema.parse(payload);

			const headers = asForm
				? { headers: { "Content-Type": "multipart/form-data" } }
				: {};

			const { data, config } = await this.client.post(path, body, headers);
			request = config;

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "POST", path, request);
		}
	}

	/**
	 * Performs a PUT request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Req Request Schema
	 * @template Res Response Schema
	 * @param {string} path URL
	 * @param {z.input<Req>} payload Payload data
	 * @param {Req} requestSchema Request Schema
	 * @param {Res} responseSchema Response Schema
	 * @returns {Promise<z.output<Res>>}
	 */
	public async put<Req extends ZodType, Res extends ZodType>(
		path: string,
		payload: z.input<Req>,
		requestSchema: Req,
		responseSchema: Res
	): Promise<z.output<Res>> {
		// the call whose response failed validation
		let request: InternalAxiosRequestConfig | undefined;

		try {
			const body = requestSchema.parse(payload);

			const { data, config } = await this.client.put(path, body);
			request = config;

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "PUT", path, request);
		}
	}

	/**
	 * Performs a PATCH request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Req Request Schema
	 * @template Res Response Schema
	 * @param {string} path URL
	 * @param {z.input<Req>} payload Payload data
	 * @param {Req} requestSchema Request Schema
	 * @param {Res} responseSchema Response Schema
	 * @returns {Promise<z.output<Res>>}
	 */
	public async patch<Req extends ZodType, Res extends ZodType>(
		path: string,
		payload: z.input<Req>,
		requestSchema: Req,
		responseSchema: Res
	): Promise<z.output<Res>> {
		// the call whose response failed validation
		let request: InternalAxiosRequestConfig | undefined;

		try {
			const body = requestSchema.parse(payload);

			const { data, config } = await this.client.patch(path, body);
			request = config;

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "PATCH", path, request);
		}
	}

	/**
	 * Performs a DELETE request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @param {string} path URL
	 * @returns {Promise<boolean>} Response Status
	 */
	public async delete(path: string): Promise<boolean> {
		try {
			return await this.client.delete(path);
		} catch (e) {
			throw this.normalizeError(e, "DELETE", path);
		}
	}

	/**
	 * Sends contract breaks, server and network errors to error tracking.
	 * Of the 4xx only 429 is sent (an expired refresh token is a normal
	 * logout), and never a response discarded for a previous session.
	 * Contract breaks, server and network errors also go to the backend
	 * (Axiom), from every user: 429 the backend already logs itself.
	 *
	 * @private
	 * @param {unknown} err Error
	 * @param {string} method HTTP method
	 * @param {string} path URL
	 * @param {InternalAxiosRequestConfig} [request] Call whose response failed validation
	 */
	private reportError(
		err: unknown,
		method: string,
		path: string,
		request?: InternalAxiosRequestConfig
	): void {
		if (isCancel(err)) return;

		const path_template = pathTemplate(path);
		const error = new Error(`${method} ${path_template}`);

		const failed = isAxiosError(err) ? err.config : request;
		const request_id = failed?.headers.get("X-Request-ID")?.toString();
		const start = failed && sentAt.get(failed);
		const report: Omit<IClientErrorReport, "kind"> = {
			method,
			path_template,
			failed_request_id: request_id,
			client_ms:
				start === undefined
					? undefined
					: Math.round(performance.now() - start),
		};

		if (err instanceof ZodError) {
			// which field and what kind, once per field: never the
			// received values, record keys or a line per list row
			const issues = [
				...new Set(
					err.issues.map(
						(issue) =>
							`${issuePathTemplate(issue.path)}: ${issue.code}`
					)
				),
			];

			error.name = "ApiValidationError";
			trackException(error, {
				path_template,
				method,
				issues,
				request_id,
			});
			reportClientError({ ...report, kind: "validation", issues });
		} else if (isAxiosError(err)) {
			const status = err.response?.status;

			if (
				status === undefined &&
				method === "GET" &&
				!isRepeatedNetworkFailure(path_template)
			)
				return;

			if (status === undefined) error.name = "ApiNetworkError";
			else if (status >= 500) error.name = "ApiServerError";
			else if (status === 429) error.name = "ApiClientError";
			else return;

			if (status) error.message += ` ${status}`;
			trackException(error, {
				path_template,
				method,
				status,
				request_id,
			});

			if (status === undefined)
				reportClientError({ ...report, kind: "network" });
			else if (status >= 500)
				reportClientError({ ...report, kind: "server", status });
		}
	}

	/**
	 * Normalizes error formats for Zod and Axios
	 * @author jplacht
	 *
	 * @private
	 * @param {unknown} err Error
	 * @param {string} method HTTP method
	 * @param {string} path URL
	 * @param {InternalAxiosRequestConfig} [request] Call whose response failed validation
	 * @returns {Error} Error
	 */
	private normalizeError(
		err: unknown,
		method: string,
		path: string,
		request?: InternalAxiosRequestConfig
	): Error {
		this.reportError(err, method, path, request);

		if (err instanceof ZodError) {
			return new Error(`Validation error: ${err.message}`);
		} else if (isAxiosError(err)) {
			const status = err.response?.status;
			const body = err.response?.data;

			const msg =
				body && typeof body === "object"
					? JSON.stringify(body)
					: err.message;

			const newError = new Error(msg);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(newError as any).responseData = body;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(newError as any).status = status;

			return newError;
		}

		return err instanceof Error ? err : new Error(String(err));
	}
}

export const apiService = new ApiService();
