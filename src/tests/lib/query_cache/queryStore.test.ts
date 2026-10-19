import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { readFileSync } from "node:fs";
import { computed, isReactive } from "vue";
import { isFresh, useQueryStore } from "@/lib/query_cache/queryStore";
import { toCacheKey } from "@/lib/query_cache/cacheKeys";
import { useUserActivity } from "@/features/user_activity/useUserActivity";
import { userActivity } from "@/features/user_activity/userActivityStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";

// a request that stays in flight until the test resolves it
const slow = vi.hoisted(() => ({
	resolvers: [] as ((value: unknown) => void)[],
}));

// mock repository
vi.mock("@/lib/query_cache/queryRepository", () => {
	const repository: Record<string, unknown> = {
		slowQuery: {
			key: () => ["slowQuery"],
			autoRefetch: false,
			fetchFn: () =>
				new Promise((resolve) => slow.resolvers.push(resolve)),
		},
		slowMutation: {
			mutation: true,
			fetchFn: (params: unknown) =>
				new Promise((resolve) =>
					slow.resolvers.push(() => resolve(params))
				),
		},
		failingMutation: {
			mutation: true,
			fetchFn: () => Promise.reject(new Error("409")),
		},
		// a read whose result is dropped after the call
		uncachedQuery: {
			key: () => ["uncachedQuery"],
			cache: false,
			fetchFn: vi.fn(
				() => new Promise((resolve) => slow.resolvers.push(resolve))
			),
		},
		testQuery: {
			key: (params: any) => ["testQuery", params],
			expireTime: 1000,
			autoRefetch: false,
			fetchFn: vi.fn(async (params) => {
				return { result: `data-${params}` };
			}),
		},
		GetPlanet: {
			key: (params: any) => ["gamedata", "planet", params.planetNaturalId],
			expireTime: 1000,
			autoRefetch: true,
			fetchFn: vi.fn(async (params) => ({
				planet_natural_id: params.planetNaturalId,
			})),
		},
		// returns every id but "XX-000x", like the backend for unknown ids
		GetMultiplePlanets: {
			key: (params: any) => [
				"gamedata",
				"planet",
				"multiple",
				params.planetNaturalIds,
			],
			expireTime: 1000,
			autoRefetch: true,
			fetchFn: vi.fn(async (params) =>
				params.planetNaturalIds
					.filter((id: string) => id !== "XX-000x")
					.map((id: string) => ({ planet_natural_id: id, fresh: true }))
			),
		},
		autoRefetchQuery: {
			key: (params: any) => ["autoRefetchQuery", params],
			expireTime: 1000,
			autoRefetch: true,
			fetchFn: vi.fn(async (params) => {
				return { result: `auto-${params}` };
			}),
		},
	};
	return { getQueryDefinition: (name: string) => repository[name] };
});

describe("useQueryStore", () => {
	let store: ReturnType<typeof useQueryStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		vi.useFakeTimers();
		vi.setSystemTime(0);
	});

	it("should execute and cache data", async () => {
		// @ts-expect-error mock query repository
		const data = await store.execute("testQuery", "foo");
		expect(data).toEqual({ result: "data-foo" });

		// cached immediately
		const cached = store.peekQueryState(["testQuery", "foo"]);
		expect(cached?.data).toEqual({ result: "data-foo" });
		expect(cached?.loading).toBe(false);
	});

	it("should return cached data if still fresh", async () => {
		// @ts-expect-error mock query repository
		await store.execute("testQuery", "bar");
		const spy = vi.spyOn(
			store as any,
			"execute" // won't actually re-call fetchFn
		);

		// @ts-expect-error mock query repository
		const data2 = await store.execute("testQuery", "bar");
		expect(data2).toEqual({ result: "data-bar" });
		expect(spy).toHaveBeenCalledOnce();
	});

	it("should refetch after expiration", async () => {
		// @ts-expect-error mock query repository
		const first = await store.execute("testQuery", "baz");
		expect(first).toEqual({ result: "data-baz" });

		vi.advanceTimersByTime(2000); // expire

		// @ts-expect-error mock query repository
		const second = await store.execute("testQuery", "baz");
		expect(second).toEqual({ result: "data-baz" });
	});

	it("should force refetch even if fresh", async () => {
		// @ts-expect-error mock query repository
		await store.execute("testQuery", "force");
		// @ts-expect-error mock query repository
		const data = await store.execute("testQuery", "force", {
			forceRefetch: true,
		});
		expect(data).toEqual({ result: "data-force" });
	});

	it("should invalidate key and delete state", async () => {
		// @ts-expect-error mock query repository
		await store.execute("testQuery", "invalidate");
		expect(store.peekQueryState(["testQuery", "invalidate"])).toBeDefined();

		await store.invalidateKey(["testQuery", "invalidate"]);
		expect(
			store.peekQueryState(["testQuery", "invalidate"])
		).toBeUndefined();
	});

	it("should manually add cache state via addCacheState", async () => {
		// reset store
		store.$reset();

		const data = { result: "manual-data" };
		const key = ["testQuery", { foo: 1 }];
		// @ts-expect-error mock query repository
		store.addCacheState("testQuery", { foo: 1 }, data);

		// the key comes from the definition
		const state = store.peekQueryState(key);
		expect(state).toBeDefined();
		expect(state?.data).toEqual(data);
		expect(state?.loading).toBe(false);
		expect(state?.error).toBeNull();
		expect(state?.params).toEqual({ foo: 1 });

		// calling addCacheState again should NOT overwrite existing state
		// @ts-expect-error mock query repository
		store.addCacheState("testQuery", { foo: 1 }, { result: "new" });
		const stateAfter = store.peekQueryState(key);
		expect(stateAfter?.data).toEqual(data);
	});
	it("should $reset correctly", async () => {
		// @ts-expect-error mock query repository
		await store.execute("testQuery", "reset");
		expect(Object.keys(store.cacheState).length).toBeGreaterThan(0);

		store.$reset();
		expect(Object.keys(store.cacheState)).toHaveLength(0);
	});
});

import * as userActivityModule from "@/features/user_activity/useUserActivity";
import { ref } from "vue";

describe("checkEntryStatusAndRefresh (Pinia store)", () => {
	let store: ReturnType<typeof useQueryStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();

		vi.useFakeTimers();
		vi.setSystemTime(new Date(0));
		vi.clearAllMocks();

		vi.spyOn(userActivityModule, "useUserActivity").mockImplementation(
			() => ({
				lastActivity: ref(0),
				lastForcedActivity: ref(0),
				shouldDelay: vi.fn().mockReturnValue(false),
			})
		);
		store.cacheState = {};
	});

	it("skips refresh when user is inactive", () => {
		// Get the mocked userActivity object
		const userActivity = useUserActivity(); //

		// Override shouldDelay for this test
		(userActivity.shouldDelay as Mock).mockReturnValue(true);

		// Prepare cacheState
		store.cacheState = {
			// @ts-expect-error mock data
			'{"id":1}': {
				definitionName: "testDef",
				params: { id: 1 },
				expireTime: 1000,
				timestamp: 0,
				loading: false,
				error: null,
			},
		};

		// Call the function under test
		store.checkEntryStatusAndRefresh();

		// Expect nothing changed
		expect(store.cacheState).toHaveProperty('{"id":1}');
	});
});

describe("useQueryStore: stale in-flight requests", () => {
	let store: ReturnType<typeof useQueryStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		slow.resolvers.length = 0;
	});

		const cachedSlow = () => store.cacheState[toCacheKey(["slowQuery"])];

		it("do not write into the cache after $reset (logout)", async () => {
			// @ts-expect-error mock query repository
			const pending = store.execute("slowQuery", undefined);
			store.$reset();

			slow.resolvers[0]("old user data");
			// the caller still gets its result
			await expect(pending).resolves.toBe("old user data");
			expect(cachedSlow()).toBeUndefined();
		});

		it("do not overwrite a newer forced refetch", async () => {
			// @ts-expect-error mock query repository
			const first = store.execute("slowQuery", undefined);
			// @ts-expect-error mock query repository
			const second = store.execute("slowQuery", undefined, {
				forceRefetch: true,
			});

			slow.resolvers[1]("new");
			await second;
			slow.resolvers[0]("old");
			await first;

			expect(cachedSlow()?.data).toBe("new");
			expect(cachedSlow()?.loading).toBe(false);
		});

		it("never dedupe mutations sharing a key", async () => {
			// @ts-expect-error mock query repository
			const first = store.execute("slowMutation", "a");
			// @ts-expect-error mock query repository
			const second = store.execute("slowMutation", "b");

			slow.resolvers.forEach((resolve) => resolve(undefined));

			expect(slow.resolvers).toHaveLength(2);
			await expect(first).resolves.toBe("a");
			await expect(second).resolves.toBe("b");
		});

		it("do not write back after invalidateKey", async () => {
			// @ts-expect-error mock query repository
			const pending = store.execute("slowQuery", undefined);
			await store.invalidateKey(["slowQuery"], { skipRefetch: true });

			slow.resolvers[0]("stale");
			await pending;

			expect(cachedSlow()).toBeUndefined();
		});
});

describe("checkEntryStatusAndRefresh: expired planets", () => {
	let store: ReturnType<typeof useQueryStore>;
	const getPlanet = getQueryDefinition("GetPlanet").fetchFn as Mock;
	const getMultiple = getQueryDefinition("GetMultiplePlanets")
		.fetchFn as Mock;
	const planetState = (id: string) =>
		store.cacheState[toCacheKey(["gamedata", "planet", id])];

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		vi.useFakeTimers();
		vi.setSystemTime(1000); // a 0 timestamp counts as never fetched
		vi.clearAllMocks();
		vi.spyOn(userActivity, "shouldDelay").mockReturnValue(false);
	});

	function seedPlanets(ids: string[]) {
		ids.forEach((id) =>
			store.addCacheState("GetPlanet", { planetNaturalId: id }, {
				planet_natural_id: id,
			} as any)
		);
	}

	it("refetches them in one multiple request, none per planet", async () => {
		seedPlanets(["AB-001c", "AB-002c", "AB-003c"]);
		vi.setSystemTime(3000);

		store.checkEntryStatusAndRefresh();
		expect(planetState("AB-001c").loading).toBe(true);
		await vi.runAllTimersAsync();

		expect(getPlanet).not.toHaveBeenCalled();
		expect(getMultiple).toHaveBeenCalledTimes(1);
		expect(getMultiple).toHaveBeenCalledWith({
			planetNaturalIds: ["AB-001c", "AB-002c", "AB-003c"],
		});
		expect(planetState("AB-002c")).toMatchObject({
			data: { planet_natural_id: "AB-002c", fresh: true },
			timestamp: 3000,
			loading: false,
			error: null,
		});
	});

	it("takes planets an expiring multiple query covers from its result", async () => {
		await store.execute("GetMultiplePlanets", {
			planetNaturalIds: ["AB-001c", "AB-002c"],
		});
		seedPlanets(["AB-001c", "AB-002c"]);
		getMultiple.mockClear();
		vi.setSystemTime(3000);

		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		expect(getPlanet).not.toHaveBeenCalled();
		expect(getMultiple).toHaveBeenCalledTimes(1);
		expect(planetState("AB-001c")).toMatchObject({
			data: { fresh: true },
			timestamp: 3000,
			loading: false,
		});
	});

	it("marks planets missing from the result as errored, no refetch loop", async () => {
		seedPlanets(["AB-001c", "XX-000x"]);
		vi.setSystemTime(3000);

		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();
		vi.setSystemTime(6000);
		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		expect(planetState("XX-000x").error).toBeInstanceOf(Error);
		expect(planetState("XX-000x").loading).toBe(false);
		// the second tick only refetches the found planet
		expect(getMultiple).toHaveBeenLastCalledWith({
			planetNaturalIds: ["AB-001c"],
		});
	});

	it("keeps the planets on a failed request, errored", async () => {
		getMultiple.mockRejectedValueOnce(new Error("offline"));
		seedPlanets(["AB-001c"]);
		vi.setSystemTime(3000);

		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		expect(planetState("AB-001c")).toMatchObject({
			data: { planet_natural_id: "AB-001c" },
			loading: false,
		});
		expect(planetState("AB-001c").error?.message).toBe("offline");
	});
});

describe("checkEntryStatusAndRefresh: failed refreshes", () => {
	let store: ReturnType<typeof useQueryStore>;
	// @ts-expect-error mock query repository
	const autoFetch = getQueryDefinition("autoRefetchQuery").fetchFn as Mock;
	// @ts-expect-error mock query repository
	const testFetch = getQueryDefinition("testQuery").fetchFn as Mock;
	const getMultiple = getQueryDefinition("GetMultiplePlanets")
		.fetchFn as Mock;
	const autoState = () =>
		store.cacheState[toCacheKey(["autoRefetchQuery", "a"])];

	// like apiService's normalizeError: status set, undefined if offline
	const apiError = (status: number | undefined) =>
		Object.assign(new Error(`failed ${status}`), { status });

	// a successful fetch at 1000, then a failed refresh at 3000
	async function failRefresh(err: Error) {
		// @ts-expect-error mock query repository
		await store.execute("autoRefetchQuery", "a");
		autoFetch.mockRejectedValueOnce(err);
		vi.setSystemTime(3000);
		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();
		autoFetch.mockClear();
	}

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		vi.clearAllMocks();
		vi.spyOn(userActivity, "shouldDelay").mockReturnValue(false);
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it.each([undefined, 500])(
		"retries a transient error (status %s) one expireTime after it",
		async (status) => {
			await failRefresh(apiError(status));

			// the last success stays the timestamp
			expect(autoState()).toMatchObject({
				data: { result: "auto-a" },
				timestamp: 1000,
				errorAt: 3000,
			});

			vi.setSystemTime(3500);
			store.checkEntryStatusAndRefresh();
			expect(autoFetch).not.toHaveBeenCalled();

			autoFetch.mockResolvedValueOnce({ result: "fresh" });
			vi.setSystemTime(4500);
			store.checkEntryStatusAndRefresh();
			await vi.runAllTimersAsync();

			expect(autoFetch).toHaveBeenCalledOnce();
			expect(autoState()).toMatchObject({
				data: { result: "fresh" },
				error: null,
				timestamp: 4500,
			});
		}
	);

	it.each([
		["a 404", apiError(404)],
		["a validation error", new Error("Validation error: id")],
	])("never retries %s", async (_, err) => {
		await failRefresh(err);

		vi.setSystemTime(60_000);
		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		expect(autoFetch).not.toHaveBeenCalled();
		expect(autoState().error).toBe(err);
	});

	it("keeps an errored entry that is not refreshed, without refetch", async () => {
		testFetch.mockRejectedValueOnce(apiError(undefined));
		// @ts-expect-error mock query repository
		await expect(store.execute("testQuery", "a")).rejects.toThrow();

		vi.setSystemTime(60_000);
		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		expect(testFetch).toHaveBeenCalledOnce();
		expect(store.cacheState[toCacheKey(["testQuery", "a"])]).toBeDefined();
	});

	it("retries planets after a failed batch refresh", async () => {
		store.addCacheState("GetPlanet", { planetNaturalId: "AB-001c" }, {
			planet_natural_id: "AB-001c",
		} as any);
		getMultiple.mockRejectedValueOnce(apiError(undefined));
		vi.setSystemTime(3000);
		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		const planet = () =>
			store.cacheState[toCacheKey(["gamedata", "planet", "AB-001c"])];
		expect(planet()).toMatchObject({ timestamp: 1000, errorAt: 3000 });

		vi.setSystemTime(4500);
		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		expect(getMultiple).toHaveBeenCalledTimes(2);
		expect(planet()).toMatchObject({
			data: { fresh: true },
			error: null,
			timestamp: 4500,
		});
	});
});

describe("useQueryStore: raw cache data", () => {
	let store: ReturnType<typeof useQueryStore>;
	// @ts-expect-error mock query repository
	const testFetch = getQueryDefinition("testQuery").fetchFn as Mock;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		vi.useFakeTimers();
		vi.setSystemTime(0);
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("a cache hit returns the object the fetch returned, not a proxy", async () => {
		const result = { nested: { list: [{ value: 1 }] } };
		testFetch.mockResolvedValueOnce(result);

		// @ts-expect-error mock query repository
		const first = (await store.execute("testQuery", "raw")) as typeof result;
		// @ts-expect-error mock query repository
		const hit = (await store.execute("testQuery", "raw")) as typeof result;

		expect(testFetch).toHaveBeenCalledOnce();
		expect(hit).toBe(first);
		expect(hit).toBe(result);
		expect(isReactive(hit)).toBe(false);
		expect(isReactive(hit.nested)).toBe(false);
		expect(isReactive(hit.nested.list[0])).toBe(false);
		expect(store.peekQueryState(["testQuery", "raw"])?.data).toBe(result);
	});

	it("a computed on peekQueryState re-runs on refetch, invalidate and $reset", async () => {
		const key = ["testQuery", "peek"];
		const data = computed(() => store.peekQueryState(key)?.data);

		// @ts-expect-error mock query repository
		await store.execute("testQuery", "peek");
		expect(data.value).toEqual({ result: "data-peek" });

		testFetch.mockResolvedValueOnce({ result: "again" });
		// @ts-expect-error mock query repository
		await store.execute("testQuery", "peek", { forceRefetch: true });
		expect(data.value).toEqual({ result: "again" });

		await store.invalidateKey(key);
		expect(data.value).toBeUndefined();

		// @ts-expect-error mock query repository
		await store.execute("testQuery", "peek");
		expect(data.value).toEqual({ result: "data-peek" });
		store.$reset();
		expect(data.value).toBeUndefined();
	});

	it("a cache hit writes nothing: same entry, no computed re-run", async () => {
		const key = ["testQuery", "hit"];
		// @ts-expect-error mock query repository
		await store.execute("testQuery", "hit");
		const entry = store.cacheState[toCacheKey(key)];

		let runs = 0;
		const data = computed(() => {
			runs++;
			return store.peekQueryState(key)?.data;
		});
		void data.value;
		runs = 0;

		for (let i = 0; i < 3; i++) {
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "hit");
			void data.value;
		}

		expect(testFetch).toHaveBeenCalledOnce();
		expect(store.cacheState[toCacheKey(key)]).toBe(entry);
		expect(runs).toBe(0);
	});

	it("a timed-out request fails every caller of its key and leaves loading", async () => {
		// what apiService's normalizeError makes of an axios timeout
		const timeout = Object.assign(new Error("timeout of 30000ms exceeded"), {
			status: undefined,
		});
		testFetch.mockImplementationOnce(
			() =>
				new Promise((_, reject) => setTimeout(() => reject(timeout), 30_000))
		);

		// @ts-expect-error mock query repository
		const first = store.execute("testQuery", "hung");
		// @ts-expect-error mock query repository
		const second = store.execute("testQuery", "hung");
		const settled = Promise.allSettled([first, second]);
		await vi.advanceTimersByTimeAsync(30_000);

		expect(await settled).toEqual([
			{ status: "rejected", reason: timeout },
			{ status: "rejected", reason: timeout },
		]);
		expect(testFetch).toHaveBeenCalledOnce();
		expect(store.cacheState[toCacheKey(["testQuery", "hung"])]).toMatchObject({
			loading: false,
			error: timeout,
		});
	});
});

describe("useQueryStore: mutations and uncached reads", () => {
	let store: ReturnType<typeof useQueryStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		slow.resolvers.length = 0;
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("a mutation leaves no cache entry, during or after the call", async () => {
		// @ts-expect-error mock query repository
		const pending = store.execute("slowMutation", "a");
		expect(Object.keys(store.cacheState)).toHaveLength(0);

		slow.resolvers[0](undefined);
		await expect(pending).resolves.toBe("a");
		expect(Object.keys(store.cacheState)).toHaveLength(0);
	});

	it("a failing mutation logs, rethrows and leaves no entry", async () => {
		await expect(
			// @ts-expect-error mock query repository
			store.execute("failingMutation", undefined)
		).rejects.toThrow("409");
		expect(console.error).toHaveBeenCalledOnce();
		expect(Object.keys(store.cacheState)).toHaveLength(0);
	});

	it("a forced prefix refetch while a mutation runs doesn't re-run it", async () => {
		// @ts-expect-error mock query repository
		const pending = store.execute("slowMutation", "a");
		await store.invalidateKey([], { exact: false, forceRefetch: true });

		slow.resolvers.forEach((resolve) => resolve(undefined));
		await pending;
		expect(slow.resolvers).toHaveLength(1);
	});

	it("an uncached read is deduped in flight and dropped afterwards", async () => {
		// @ts-expect-error mock query repository
		const fetchFn = getQueryDefinition("uncachedQuery").fetchFn as Mock;
		// @ts-expect-error mock query repository
		const first = store.execute("uncachedQuery", undefined);
		// @ts-expect-error mock query repository
		const second = store.execute("uncachedQuery", undefined);

		slow.resolvers.forEach((resolve) => resolve("prefs"));
		await expect(first).resolves.toBe("prefs");
		await expect(second).resolves.toBe("prefs");
		expect(fetchFn).toHaveBeenCalledOnce();
		expect(store.cacheState[toCacheKey(["uncachedQuery"])]).toBeUndefined();
	});
});

describe("isFresh", () => {
	it("an entry without expireTime is always fresh", () => {
		expect(isFresh({ timestamp: 0 }, 1e12)).toBe(true);
	});

	it("is fresh up to expireTime after the last success", () => {
		expect(isFresh({ timestamp: 1000, expireTime: 500 }, 1500)).toBe(true);
		expect(isFresh({ timestamp: 1000, expireTime: 500 }, 1501)).toBe(false);
	});

	it("an error doesn't change it: timestamp stays the last success", () => {
		const entry = {
			timestamp: 1000,
			expireTime: 500,
			error: new Error("x"),
			errorAt: 1400,
		};
		expect(isFresh(entry, 1450)).toBe(true);
		expect(isFresh(entry, 1600)).toBe(false);
	});
});

it("queryStore.ts names no query", () => {
	const source = readFileSync("src/lib/query_cache/queryStore.ts", "utf8");
	expect(source).not.toMatch(/"(Get|Post|Patch|Delete|Create|Clone)[A-Z]/);
});
