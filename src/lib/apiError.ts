/**
 * Thrown by apiService; a module of its own, so tests that mock apiService
 * keep it.
 *
 * An error response of the API (`status` undefined for a network error or
 * timeout), as thrown by apiService. The fields are declared, not
 * initialised: only response errors carry a `status` key, which the query
 * cache reads to retry transient failures.
 */
export class ApiError extends Error {
	declare status?: number;
	declare responseData?: unknown;
	// seconds until a throttled call (429) may be sent again
	declare retryAfter?: number;
	// per-field messages a caller parsed from `responseData`
	declare fieldErrors?: Record<string, string[]>;
}

/** A payload or response that failed its Zod schema: no `status` */
export class ApiValidationError extends ApiError {
	override name = "ApiValidationError";
}

/**
 * Tells an API error response apart from other errors. Duck-typed on
 * `status`, so errors built as plain `Error`s with a status (tests) pass.
 *
 * @param {unknown} e Error
 * @returns {boolean} API error response
 */
export function isApiError(e: unknown): e is ApiError {
	return e instanceof Error && "status" in e;
}
