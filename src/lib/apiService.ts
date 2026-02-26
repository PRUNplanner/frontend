import axios, { AxiosInstance, isAxiosError } from "axios";
import { ZodError, ZodType } from "zod";
import config from "@/lib/config";

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

		// Set default headers to disable cache
		this.client.defaults.headers.get["Cache-Control"] =
			"no-cache, no-store, must-revalidate";
		this.client.defaults.headers.get["Pragma"] = "no-cache";
		this.client.defaults.headers.get["Expires"] = "0";
	}

	/**
	 * Performs a GET request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Response Response Type
	 * @param {string} path URL
	 * @param {ZodType<Response>} responseSchema Response Schema
	 * @returns {Promise<Response>}
	 */
	public async get<Response>(
		path: string,
		responseSchema: ZodType<Response>
	): Promise<Response> {
		try {
			const { data } = await this.client.get(path);
			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e);
		}
	}

	/**
	 * Performs a POST request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Request Request Type
	 * @template Response Response Type
	 * @param {string} path URL
	 * @param {unknown} payload Payload data
	 * @param {ZodType<Request>} requestSchema Request Schema
	 * @param {ZodType<Response>} responseSchema Response Schema
	 * @param {?boolean} [asForm] adds multipart/form-data header
	 * @returns {Promise<Response>}
	 */
	public async post<Request, Response>(
		path: string,
		payload: unknown,
		requestSchema: ZodType<Request>,
		responseSchema: ZodType<Response>,
		asForm?: boolean
	): Promise<Response> {
		try {
			const body = requestSchema.parse(payload);

			const headers = asForm
				? { headers: { "Content-Type": "multipart/form-data" } }
				: {};

			const { data } = await this.client.post(path, body, headers);

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e);
		}
	}

	/**
	 * Performs a PUT request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Request Request Type
	 * @template Response Response Type
	 * @param {string} path URL
	 * @param {unknown} payload Payload data
	 * @param {ZodType<Request>} requestSchema Request Schema
	 * @param {ZodType<Response>} responseSchema Response Schema
	 * @returns {Promise<Response>}
	 */
	public async put<Request, Response>(
		path: string,
		payload: unknown,
		requestSchema: ZodType<Request>,
		responseSchema: ZodType<Response>
	): Promise<Response> {
		try {
			const body = requestSchema.parse(payload);

			const { data } = await this.client.put(path, body);

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e);
		}
	}

	/**
	 * Performs a PATCH request towards the backend
	 * @author jplacht
	 *
	 * @public
	 * @async
	 * @template Request Request Type
	 * @template Response Response Type
	 * @param {string} path URL
	 * @param {unknown} payload Payload data
	 * @param {ZodType<Request>} requestSchema Request Schema
	 * @param {ZodType<Response>} responseSchema Response Schema
	 * @returns {Promise<Response>}
	 */
	public async patch<Request, Response>(
		path: string,
		payload: unknown,
		requestSchema: ZodType<Request>,
		responseSchema: ZodType<Response>
	): Promise<Response> {
		try {
			const body = requestSchema.parse(payload);

			const { data } = await this.client.patch(path, body);

			return responseSchema.parse(data);
		} catch (e) {
			throw this.normalizeError(e);
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
			throw this.normalizeError(e);
		}
	}

	/**
	 * Normalizes error formats for Zod and Axios
	 * @author jplacht
	 *
	 * @private
	 * @param {unknown} err Error
	 * @returns {Error} Error
	 */
	private normalizeError(err: unknown): Error {
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

			(newError as any).responseData = body;
			(newError as any).status = status;

			return newError;
		}

		return err instanceof Error ? err : new Error(String(err));
	}
}

export const apiService = new ApiService();
