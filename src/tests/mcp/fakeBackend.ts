import { vi } from "vitest";

// Test data
import materials from "@/tests/test_data/api_data_materials.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import recipes from "@/tests/test_data/api_data_recipes.json";
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import planet from "@/tests/test_data/api_data_planet_etherwind.json";
import plan from "@/tests/test_data/api_data_plan_etherwind.json";
import empires from "@/tests/test_data/api_data_empire_list.json";
import cxs from "@/tests/test_data/api_data_cx_list.json";
import searchIndex from "@/tests/test_data/api_data_planet_search_index.json";

export const PLAN_UUID = plan.uuid;
// the plan's first empire, Sky Productions, priced with "PRUN CX REAL"
export const EMPIRE_UUID = "32aed118-c4ed-4a4e-9eb4-3cf6aa0068da";
export const API_KEY = "abcd1234.secret-part";

export const fixtures = {
	materials,
	buildings,
	recipes,
	exchanges,
	planet,
	plan,
	empires,
	cxs,
	searchIndex,
};

const ROUTES: [RegExp, unknown][] = [
	[/^\/data\/materials\/$/, materials],
	[/^\/data\/buildings\/$/, buildings],
	[/^\/data\/recipes\/$/, recipes],
	[/^\/data\/exchanges\/$/, exchanges],
	[/^\/data\/planets\/search-index\/$/, searchIndex],
	[/^\/data\/planet\/[^/]+\/$/, planet],
	[/^\/planning\/plan\/$/, [plan]],
	[/^\/planning\/plan\/[^/]+\/$/, plan],
	[/^\/planning\/empire\/$/, empires],
	// like the backend: an empire's plans come without their empires
	[/^\/planning\/empire\/[^/]+\/plans\/$/, [{ ...plan, empires: undefined }]],
	[/^\/planning\/cx\/$/, cxs],
];

export interface IFakeBackend {
	fetch: typeof fetch;
	requests: {
		method: string;
		path: string;
		headers: Headers;
		body?: unknown;
	}[];
}

/** a write's answer: status (default 200) and JSON body (none: 204) */
export interface WriteAnswer {
	status?: number;
	body?: unknown;
}

/**
 * A fetch for http://backend answering from the test data; `status`
 * makes every keyed request fail with that status (e.g. 401);
 * `extraRoutes` answer first (a tool's own endpoints in its test);
 * `onWrite` answers POST, PUT, PATCH and DELETE (default 204)
 */
export function fakeBackend(
	status?: number,
	extraRoutes: [RegExp, unknown][] = [],
	onWrite?: (method: string, path: string, body: unknown) => WriteAnswer
): IFakeBackend {
	const requests: IFakeBackend["requests"] = [];
	const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input));
		const headers = new Headers(init?.headers);
		const method = init?.method ?? "GET";
		const body =
			typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
		requests.push({ method, path: url.pathname, headers, body });
		if (status && headers.has("Authorization"))
			return new Response("{}", { status });
		// the planet batch is a read: the planet for each id, like the backend
		if (method === "POST" && url.pathname === "/data/planets/multiple/")
			return new Response(
				JSON.stringify(
					(body as string[]).map((id) => ({
						...planet,
						planet_natural_id: id,
					}))
				),
				{ status: 200 }
			);
		if (method !== "GET") {
			const answer = onWrite?.(method, url.pathname, body) ?? {};
			return answer.body === undefined
				? new Response(null, { status: answer.status ?? 204 })
				: new Response(JSON.stringify(answer.body), {
						status: answer.status ?? 200,
					});
		}
		const route = [...extraRoutes, ...ROUTES].find(([re]) =>
			re.test(url.pathname)
		);
		if (!route) return new Response("{}", { status: 404 });
		return new Response(JSON.stringify(route[1]), { status: 200 });
	});
	return { fetch: fake as unknown as typeof fetch, requests };
}
