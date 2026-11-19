// Types & Interfaces
import type { z } from "zod";

/** why a tool call failed, as logged in `mcp_tool_called.outcome` */
export type ToolErrorCode =
	| "auth_error"
	| "read_only_key"
	| "conflict"
	| "rate_limited"
	| "backend_error"
	| "tool_error";

/** A failure the assistant sees as the tool's error text */
export class ToolError extends Error {
	constructor(
		message: string,
		readonly code: ToolErrorCode = "tool_error"
	) {
		super(message);
	}
}

export interface IBackendStats {
	calls: number;
	ms: number;
}

export type WriteMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export interface IBackend {
	/**
	 * GET a backend path and validate the JSON body
	 *
	 * @param path Path below the API URL, e.g. "/planning/plan/"
	 * @param schema Zod schema of the body
	 * @param auth Send the user's API key (game data is public)
	 */
	get<S extends z.ZodType>(
		path: string,
		schema: S,
		auth?: boolean
	): Promise<z.infer<S>>;
	/**
	 * A write with the user's key: the payload is checked with the app's
	 * payload schema first, the answer with `response` (none: ignored)
	 */
	send<S extends z.ZodType>(
		method: WriteMethod,
		path: string,
		body: unknown,
		payload: z.ZodType | null,
		response?: S
	): Promise<z.infer<S>>;
	readonly stats: IBackendStats;
}

export interface IBackendOptions {
	apiUrl: string;
	// "<prefix>.<secret>", undefined for public game data only
	apiKey?: string;
	userAgent: string;
	fetch?: typeof fetch;
}

const KEY_PAGE = "https://prunplanner.org/apikey";

/** the backend's error body, as far as a tool can use it */
async function errorBody(
	response: Response
): Promise<{ code?: string; text?: string }> {
	try {
		const body = (await response.json()) as Record<string, unknown>;
		const code = typeof body.code === "string" ? body.code : undefined;
		const { code: _c, ...rest } = body;
		// DRF: {"detail": "..."} or {"field": ["message", ...]}
		const text =
			typeof body.detail === "string"
				? body.detail
				: Object.entries(rest)
						.map(([k, v]) => `${k}: ${[v].flat().join(" ")}`)
						.join("; ");
		return { code, text: text.slice(0, 500) || undefined };
	} catch {
		return {};
	}
}

/**
 * A backend client for one tool call: GETs, and writes for the write
 * tools; it counts the requests for the call's log line
 * @author jplacht
 *
 * @param {IBackendOptions} options API URL, key and user agent
 * @returns {IBackend} Client
 */
export function createBackend(options: IBackendOptions): IBackend {
	const doFetch = options.fetch ?? fetch;
	const stats: IBackendStats = { calls: 0, ms: 0 };

	async function request(
		method: "GET" | WriteMethod,
		path: string,
		auth: boolean,
		body?: unknown
	): Promise<Response> {
		const headers: Record<string, string> = {
			Accept: "application/json",
			"User-Agent": options.userAgent,
		};
		if (auth && options.apiKey)
			headers.Authorization = `Api-Key ${options.apiKey}`;
		if (body !== undefined) headers["Content-Type"] = "application/json";

		const started = performance.now();
		stats.calls++;
		let response: Response;
		try {
			response = await doFetch(options.apiUrl + path, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
			});
		} catch {
			throw new ToolError(
				"PRUNplanner's API can't be reached right now.",
				"backend_error"
			);
		} finally {
			stats.ms += performance.now() - started;
		}
		if (response.ok) return response;

		const write = method !== "GET";
		const { code, text } = write
			? await errorBody(response)
			: ({} as { code?: string; text?: string });
		if (response.status === 403 && code === "api_key_read_only")
			throw new ToolError(
				`This API key is read-only, so nothing was changed. To let the assistant change your plans, empires and CX preferences, create a read-write key at ${KEY_PAGE} and use it here.`,
				"read_only_key"
			);
		// a write the backend refuses (e.g. a plan of another user), not the key
		if (
			write &&
			response.status === 403 &&
			!code?.startsWith("api_key") &&
			!/api key/i.test(text ?? "")
		)
			throw new ToolError(
				`PRUNplanner refused the change${text ? `: ${text}` : "."}`,
				"tool_error"
			);
		if (response.status === 401 || response.status === 403)
			throw new ToolError(
				code && text
					? text
					: `API key invalid or revoked. Create a new one at ${KEY_PAGE}.`,
				"auth_error"
			);
		if (response.status === 429)
			throw new ToolError(
				`PRUNplanner is limiting these requests right now (too many in a minute${response.headers.get("Retry-After") ? `; retry after ${response.headers.get("Retry-After")} s` : ""}). Try again shortly.`,
				"rate_limited"
			);
		if (response.status === 404)
			throw new ToolError(`Not found: ${path}`, "tool_error");
		if (response.status === 409)
			throw new ToolError(
				"Changed in PRUNplanner since it was read (another tab or device). Read it again and retry.",
				"conflict"
			);
		if (write && response.status === 400)
			throw new ToolError(
				`PRUNplanner refused the change${text ? `: ${text}` : "."}`,
				"tool_error"
			);
		throw new ToolError(
			`PRUNplanner's API answered ${response.status} for ${path}.`,
			"backend_error"
		);
	}

	async function parse<S extends z.ZodType>(
		response: Response,
		path: string,
		schema: S
	): Promise<z.infer<S>> {
		const parsed = schema.safeParse(
			await response.json().catch(() => undefined)
		);
		if (!parsed.success)
			throw new ToolError(
				`Unexpected data from PRUNplanner's API for ${path}.`,
				"backend_error"
			);
		return parsed.data;
	}

	async function get<S extends z.ZodType>(
		path: string,
		schema: S,
		auth = true
	): Promise<z.infer<S>> {
		return parse(await request("GET", path, auth), path, schema);
	}

	async function send<S extends z.ZodType>(
		method: WriteMethod,
		path: string,
		body: unknown,
		payload: z.ZodType | null,
		response?: S
	): Promise<z.infer<S>> {
		// the same check the app's apiService makes before it sends
		if (payload && !payload.safeParse(body).success)
			throw new ToolError(
				`The change for ${path} doesn't have the shape PRUNplanner expects.`,
				"tool_error"
			);
		const answer = await request(
			method,
			path,
			true,
			body === null ? undefined : body
		);
		if (!response) return undefined as z.infer<S>;
		return parse(answer, path, response);
	}

	return { get, send, stats };
}
