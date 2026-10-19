import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useQuery } from "@/lib/query_cache/useQuery";

vi.mock("@/lib/query_cache/queryRepository", () => ({
	getQueryDefinition: (name: string) =>
		name === "testMutation"
			? { mutation: true, fetchFn: vi.fn(async () => "saved") }
			: {
					key: () => ["testQuery"],
					expireTime: 1000,
					fetchFn: vi.fn(async () => "data"),
				},
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

it("a mutation's state stays undefined", async () => {
	setActivePinia(createPinia());
	// @ts-expect-error mock repository
	const query = useQuery("testMutation");

	await expect(query.execute()).resolves.toBe("saved");
	expect(query.state.value).toBeUndefined();
});
