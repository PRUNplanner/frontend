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

	it("reports no error, loading or data before any state exists", () => {
		// @ts-expect-error mock repository
		const query = useQuery("testQuery");

		expect(query.state.value).toBeUndefined();
		expect(query.error).toBe(false);
		expect(query.loading).toBe(false);
		expect(query.data).toBeUndefined();
	});
});
