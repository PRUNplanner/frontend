import axios, { type AxiosInstance, isAxiosError, isCancel } from "axios";
import { ZodError, type ZodType, type z } from "zod";
import config from "@/lib/config";
import { trackException } from "@/lib/analytics/useAnalytics";
import { issuePathTemplate, pathTemplate } from "@/util/pathTemplate";

/**
 * Service making calls to PRUNplanner backend
 * @author jplacht
 *
 * @export
 * @class ApiService
 * @typedef {ApiService}
 */
class ApiService {
	// needs to be public for axios-mock-adapter
	public readonly client: AxiosInstance;

	constructor() {
		this.client = axios;
		this.client.defaults.baseURL = config.API_BASE_URL;
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
		try {
			const { data } = await this.client.get(path);
			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "GET", path);
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
		try {
			const body = requestSchema.parse(payload);

			const headers = asForm
				? { headers: { "Content-Type": "multipart/form-data" } }
				: {};

			const { data } = await this.client.post(path, body, headers);

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "POST", path);
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
		try {
			const body = requestSchema.parse(payload);

			const { data } = await this.client.put(path, body);

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "PUT", path);
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
		try {
			const body = requestSchema.parse(payload);

			const { data } = await this.client.patch(path, body);

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e, "PATCH", path);
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
	 * Of the 4xx only 429 and a 401 of the token refresh are sent, and
	 * never a response discarded for a previous session.
	 *
	 * @private
	 * @param {unknown} err Error
	 * @param {string} method HTTP method
	 * @param {string} path URL
	 */
	private reportError(err: unknown, method: string, path: string): void {
		if (isCancel(err)) return;

		const path_template = pathTemplate(path);
		const error = new Error(`${method} ${path_template}`);

		if (err instanceof ZodError) {
			error.name = "ApiValidationError";
			trackException(error, {
				path_template,
				method,
				// which field and what kind, once per field: never the
				// received values, record keys or a line per list row
				issues: [
					...new Set(
						err.issues.map(
							(issue) =>
								`${issuePathTemplate(issue.path)}: ${issue.code}`
						)
					),
				],
			});
		} else if (isAxiosError(err)) {
			const status = err.response?.status;

			if (status === undefined) error.name = "ApiNetworkError";
			else if (status >= 500) error.name = "ApiServerError";
			else if (
				status === 429 ||
				(status === 401 && path.includes("/user/refresh/"))
			)
				error.name = "ApiClientError";
			else return;

			if (status) error.message += ` ${status}`;
			trackException(error, { path_template, method, status });
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
	 * @returns {Error} Error
	 */
	private normalizeError(err: unknown, method: string, path: string): Error {
		this.reportError(err, method, path);

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
