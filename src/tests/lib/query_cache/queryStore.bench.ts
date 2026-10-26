import { describe, vi } from "vitest";
import { bench } from "@/tests/bench";
import { computed } from "vue";
import { createPinia, setActivePinia } from "pinia";

import { useQueryStore } from "@/lib/query_cache/queryStore";

// test data
import planet_search_index from "@/tests/test_data/api_data_planet_search_index.json";
import { largePlan } from "@/tests/features/planning/usePlanCalculation.fixtures";

const plans = Array.from({ length: 200 }, (_, i) => ({
	...largePlan(),
	uuid: `plan-${i}`,
}));

vi.mock("@/lib/query_cache/queryRepository", () => {
	const repository: Record<string, unknown> = {
		index: {
			key: () => ["index"],
			fetchFn: async () => planet_search_index,
		},
		plans: {
			key: () => ["plans"],
			fetchFn: async () => plans,
		},
		// a write; main marks it with persist: false and a static key
		mutation: {
			mutation: true,
			key: () => ["mutation"],
			persist: false,
			fetchFn: async (params: unknown) => params,
		},
		GetPlan: {
			key: (params: { planUuid: string }) => ["plan", params.planUuid],
			fetchFn: async () => null,
		},
	};
	return { getQueryDefinition: (name: string) => repository[name] };
});

// what a page does with a result: read every field once
function walk(value: unknown): number {
	if (typeof value === "number") return value;
	if (value === null || typeof value !== "object") return 0;
	let sum = 0;
	for (const v of Object.values(value)) sum += walk(v);
	return sum;
}

setActivePinia(createPinia());
const store = useQueryStore();
// @ts-expect-error mock query repository
await store.execute("index");
// @ts-expect-error mock query repository
await store.execute("plans");

describe("queryStore: read and traverse", () => {
	bench("planet search index: fresh execute + walk", async () => {
		// @ts-expect-error mock query repository
		walk(await store.execute("index", undefined, { forceRefetch: true }));
	});

	bench("planet search index: cache hit + walk", async () => {
		// @ts-expect-error mock query repository
		walk(await store.execute("index"));
	});

	bench("200 large plans: fresh execute + walk", async () => {
		// @ts-expect-error mock query repository
		walk(await store.execute("plans", undefined, { forceRefetch: true }));
	});

	bench("200 large plans: cache hit + walk", async () => {
		// @ts-expect-error mock query repository
		walk(await store.execute("plans"));
	});
});

describe("queryStore: seeding", () => {
	bench("200 addCacheState plans", () => {
		store.$reset();
		plans.forEach((plan) =>
			store.addCacheState("GetPlan", { planUuid: plan.uuid }, plan)
		);
	});
});

describe("queryStore: hits and mutations", () => {
	bench(
		"1,000 cache hits with a peekQueryState computed watching",
		async () => {
			// @ts-expect-error mock query repository
			await store.execute("index");
			const watched = computed(() => store.peekQueryState(["index"]));
			for (let i = 0; i < 1000; i++) {
				// @ts-expect-error mock query repository
				await store.execute("index");
				void watched.value;
			}
		}
	);

	bench("200 mutation calls", async () => {
		for (let i = 0; i < 200; i++)
			// @ts-expect-error mock query repository
			await store.execute("mutation", i);
	});
});
