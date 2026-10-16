import { describe, it, expect } from "vitest";

import {
	API_ENDPOINTS,
	endpointFormats,
	resolvePath,
} from "@/features/api_keys/apiEndpoints";

const VALUES = {
	empire: "e-uuid",
	plan: "p-uuid",
	cx: "c-uuid",
	planet: "OT-580b",
	ticker: "RAT",
	exchange: "AI1",
};

describe("apiEndpoints", () => {
	it("lists the 17 endpoints with unique ids", () => {
		expect(API_ENDPOINTS).toHaveLength(17);
		expect(new Set(API_ENDPOINTS.map((e) => e.id)).size).toBe(17);
	});

	it("resolves every template and offers an input per placeholder", () => {
		API_ENDPOINTS.forEach((e) => {
			[e.path, e.csvPath].filter(Boolean).forEach((template) => {
				const path = resolvePath(template!, VALUES);
				expect(path).not.toBeNull();
				expect(path).not.toMatch(/[{}]/);
				expect(path).toMatch(/^[a-z].*\/$/);
				[...template!.matchAll(/\{(\w+)\}/g)].forEach((m) =>
					expect(e.params).toContain(m[1])
				);
			});
		});
	});

	it("needs a key for all but the public ones and exchange prices", () => {
		const open = API_ENDPOINTS.filter((e) => !e.needsKey).map((e) => e.id);
		expect(open).toEqual([
			"exchanges",
			"materials",
			"recipes",
			"buildings",
			"planet",
			"planet_popr",
			"market_history",
		]);
	});

	it("offers CSV first where there is a CSV variant", () => {
		const csv = API_ENDPOINTS.filter((e) => e.csvPath).map((e) => e.id);
		expect(csv).toEqual([
			"empire_material_io",
			"empire_plans_material_io",
			"empire_plans",
			"fio_storage",
			"exchanges",
		]);
		expect(endpointFormats(API_ENDPOINTS[0])).toEqual(["csv", "json"]);
		expect(endpointFormats(API_ENDPOINTS[5])).toEqual(["json"]);
	});

	it("builds no path while a value is missing", () => {
		expect(resolvePath("planning/plan/{plan}/", {})).toBeNull();
		expect(resolvePath("planning/plan/{plan}/", { plan: "  " })).toBeNull();
		expect(resolvePath("data/planet/{planet}/", { planet: " OT-580b " })).toBe(
			"data/planet/OT-580b/"
		);
	});

	it("encodes typed values", () => {
		expect(resolvePath("data/planet/{planet}/", { planet: "a/b?c" })).toBe(
			"data/planet/a%2Fb%3Fc/"
		);
	});
});
