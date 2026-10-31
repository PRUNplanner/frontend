import { isSubset, toCacheKey } from "@/lib/query_cache/cacheKeys";
import { queryRepository } from "@/lib/query_cache/queryRepository";
import { describe, it, expect } from "vitest";

import type { JSONValue } from "@/lib/query_cache/queryCache.types";

describe("toCacheKey", () => {
	it("serializes primitive values", () => {
		expect(toCacheKey(null)).toBe("null");
		expect(toCacheKey(true)).toBe("true");
		expect(toCacheKey(42)).toBe("42");
		expect(toCacheKey("hello")).toBe('"hello"');
	});

	it("serializes arrays", () => {
		expect(toCacheKey([1, 2, 3])).toBe("[1,2,3]");
		expect(toCacheKey(["a", { b: 2 }])).toBe('["a",{"b":2}]');
	});

	it("serializes objects with sorted keys", () => {
		const obj1 = { b: 2, a: 1 };
		const obj2 = { a: 1, b: 2 };
		expect(toCacheKey(obj1)).toBe(toCacheKey(obj2));
	});

	it("handles nested objects", () => {
		const nested = { z: { b: 2, a: 1 }, x: 3 };
		expect(toCacheKey(nested)).toBe('{"x":3,"z":{"a":1,"b":2}}');
	});

	it("handles empty structures", () => {
		expect(toCacheKey({})).toBe("{}");
		expect(toCacheKey([])).toBe("[]");
	});
});

describe("isSubset", () => {
	it("different types", () => {
		expect(isSubset(true, 1)).toBe(false);
	});

	it("subset is longer than fullset", () => {
		expect(isSubset([1, 2, 3], [1])).toBe(false);
	});

	it("compares primitive values", () => {
		expect(isSubset(1, 1)).toBe(true);
		expect(isSubset("a", "b")).toBe(false);
	});

	it("compares arrays", () => {
		expect(isSubset([1], [1, 2])).toBe(true);
		expect(isSubset([1, 2], [1, 2])).toBe(true);
		expect(isSubset([1, 3], [1, 2])).toBe(false);
	});

	it("compares nested arrays", () => {
		expect(isSubset([[1]], [[1]])).toBe(true);
		expect(isSubset([[1]], [[2]])).toBe(false);
	});

	it("compares objects", () => {
		expect(isSubset({ a: 1 }, { a: 1, b: 2 })).toBe(true);
		expect(isSubset({ a: 1, b: 2 }, { a: 1 })).toBe(false);
	});

	it("compares nested objects", () => {
		const sub = { a: { b: 1 } };
		const full = { a: { b: 1, c: 2 }, d: 3 };
		expect(isSubset(sub, full)).toBe(true);
	});

	it("handles mixed types", () => {
		expect(isSubset({ a: 1 }, [1])).toBe(false);
		expect(isSubset([1], { a: 1 })).toBe(false);
		expect(isSubset(["a"], { 0: "a" })).toBe(false);
	});

	it("handles null values", () => {
		expect(isSubset(null, null)).toBe(true);
		expect(isSubset(null, {})).toBe(false);
	});

	it("returns false when nested object values differ", () => {
		const sub = { a: { b: 1 } };
		const full = { a: { b: 2 } }; // same key structure, different value
		expect(isSubset(sub, full)).toBe(false);
	});
});

describe("every query's cache key", () => {
	// every param a key builder reads
	const params = {
		days: 7,
		empireUuid: "empire",
		exchange: "AI1",
		exchangeTicker: "NC1",
		materialTicker: "DW",
		metric: "vwap",
		planUuid: "plan",
		planetNaturalId: "OT-580b",
		planetNaturalIds: ["OT-580b", "KW-688c"],
		searchData: { materials: ["FEO"], must_be_fertile: true },
		searchId: "search",
		sharedPlanUuid: "shared",
		tickers: ["DW", "RAT"],
		versionUuid: "version",
	};

	it("keeps its string", () => {
		const keys = Object.fromEntries(
			Object.entries(queryRepository)
				.filter(([, def]) => "key" in def)
				.map(([name, def]) => [
					name,
					toCacheKey(
						(def as { key: (p: unknown) => JSONValue }).key(params)
					),
				])
		);

		expect(keys).toMatchInlineSnapshot(`
			{
			  "GetAPIKeys": "["user","api","keys"]",
			  "GetAllCX": "["planningdata","cx"]",
			  "GetAllEmpires": "["planningdata","empire","list"]",
			  "GetAllPlans": "["planningdata","plan","list"]",
			  "GetAllShared": "["planningdata","shared","list"]",
			  "GetAnalyticsPlanetInsights": "["analytics","planet_insights","OT-580b"]",
			  "GetBuildings": "["gamedata","buildings"]",
			  "GetCXSparklines": "["gamedata","cxsparklines","AI1",7,"vwap",["DW","RAT"]]",
			  "GetEmpirePlans": "["planningdata","empire","plans","empire"]",
			  "GetExchanges": "["gamedata","exchanges"]",
			  "GetExplorationData": "["gamedata","marketexploration","NC1","DW"]",
			  "GetFIOStorage": "["gamedata","fio","storage"]",
			  "GetMarketExchanges": "["gamedata","market","exchanges"]",
			  "GetMarketSummary": "["gamedata","market","summary"]",
			  "GetMaterials": "["gamedata","materials"]",
			  "GetMultiplePlanets": "["gamedata","planet","multiple",["OT-580b","KW-688c"]]",
			  "GetPlan": "["planningdata","plan","plan"]",
			  "GetPlanDraft": "["planningdata","plan_draft","plan"]",
			  "GetPlanVersion": "["planningdata","plan","plan","version","version"]",
			  "GetPlanVersions": "["planningdata","plan","plan","versions"]",
			  "GetPlanet": "["gamedata","planet","OT-580b"]",
			  "GetPlanetLastPOPR": "["gamedata","planet","popr","last","OT-580b"]",
			  "GetPlanetSearchIndex": "["gamedata","planet","search-index"]",
			  "GetPlanetSearchSingle": "["gamedata","planet","search","search"]",
			  "GetPreferences": "["user","profile"]",
			  "GetRecipes": "["gamedata","recipes"]",
			  "GetSharedPlan": "["planningdata","shared","shared"]",
			  "PostPlanetSearch": "["gamedata","planet","search",{"materials":["FEO"],"must_be_fertile":true}]",
			}
		`);
	});
});
