import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useQuery } from "@/lib/query_cache/useQuery";

vi.mock("@/lib/query_cache/queryRepository", () => ({
	getQueryDefinition: () => ({
		key: () => ["testQuery"],
		expireTime: 1000,
		persist: false,
		fetchFn: vi.fn(),
	}),
}));

describe("useQuery", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it("returns the reactive state and execute only", () => {
		// @ts-expect-error mock repository
		const query = useQuery("testQuery");

		expect(Object.keys(query).sort()).toEqual(["execute", "state"]);
		expect(query.state.value).toBeUndefined();
	});
});
