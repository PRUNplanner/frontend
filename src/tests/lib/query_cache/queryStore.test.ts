import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { readFileSync } from "node:fs";
import { computed, isReactive } from "vue";
import {
	isFresh,
	QueryLoopError,
	useQueryStore,
} from "@/lib/query_cache/queryStore";
import { reportClientError } from "@/lib/clientErrors";
import { toCacheKey } from "@/lib/query_cache/cacheKeys";
import { useUserActivity } from "@/features/user_activity/useUserActivity";
import { userActivity } from "@/features/user_activity/userActivityStore";
import { getQueryDefinition } from "@/lib/query_cache/queryRepository";

// a request that stays in flight until the test resolves it
const slow = vi.hoisted(() => ({
	resolvers: [] as ((value: unknown) => void)[],
	rejecters: [] as ((reason: unknown) => void)[],
}));

// the persisted copy persistedQuery reads first
const persisted = vi.hoisted(() => ({
	initialData: (): Promise<{ data: unknown; fetchedAt: number } | null> =>
		Promise.resolve(null),
}));

vi.mock("@/lib/clientErrors", () => ({ reportClientError: vi.fn() }));

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
		slowFailingQuery: {
			key: () => ["slowFailingQuery"],
			fetchFn: () =>
				new Promise((_, reject) => slow.rejecters.push(reject)),
		},
		// rejects with text, like a throw of a non-Error
		textRejectQuery: {
			key: () => ["textRejectQuery"],
			fetchFn: () => Promise.reject("boom"),
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
			key: (params: any) => [
				"gamedata",
				"planet",
				params.planetNaturalId,
			],
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
					.map((id: string) => ({
						planet_natural_id: id,
						fresh: true,
					}))
			),
		},
		// a read with a persisted copy, see `persisted`
		persistedQuery: {
			key: () => ["persistedQuery"],
			expireTime: 1000,
			autoRefetch: true,
			initialData: vi.fn(() => persisted.initialData()),
			fetchFn: vi.fn(async () => "fetched"),
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

	it("retries a 429 once its Retry-After passed, not before", async () => {
		await failRefresh(
			Object.assign(apiError(429), { retryAfter: 60 })
		);

		vi.setSystemTime(3000 + 59_000);
		store.checkEntryStatusAndRefresh();
		expect(autoFetch).not.toHaveBeenCalled();

		autoFetch.mockResolvedValueOnce({ result: "fresh" });
		vi.setSystemTime(3000 + 61_000);
		store.checkEntryStatusAndRefresh();
		await vi.runAllTimersAsync();

		expect(autoFetch).toHaveBeenCalledOnce();
		expect(autoState()).toMatchObject({ data: { result: "fresh" } });
	});

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

		// the mock repository has no real query key
		const execute = store.execute as unknown as (
			key: string,
			params: string
		) => Promise<typeof result>;
		const first = await execute("testQuery", "raw");
		const hit = await execute("testQuery", "raw");

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
		const timeout = Object.assign(
			new Error("timeout of 30000ms exceeded"),
			{
				status: undefined,
			}
		);
		testFetch.mockImplementationOnce(
			() =>
				new Promise((_, reject) =>
					setTimeout(() => reject(timeout), 30_000)
				)
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
		expect(
			store.cacheState[toCacheKey(["testQuery", "hung"])]
		).toMatchObject({
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

describe("useQueryStore: edge cases", () => {
	let store: ReturnType<typeof useQueryStore>;
	// @ts-expect-error mock query repository
	const autoFetch = getQueryDefinition("autoRefetchQuery").fetchFn as Mock;
	// @ts-expect-error mock query repository
	const testFetch = getQueryDefinition("testQuery").fetchFn as Mock;
	const getMultiple = getQueryDefinition("GetMultiplePlanets")
		.fetchFn as Mock;
	const state = (key: string[]) => store.cacheState[toCacheKey(key)];

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		store = useQueryStore();
		vi.clearAllMocks();
		slow.rejecters.length = 0;
		vi.spyOn(userActivity, "shouldDelay").mockReturnValue(false);
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	describe("failed requests", () => {
		it("keep a rejection that is no Error as an Error", async () => {
			await expect(
				// @ts-expect-error mock query repository
				store.execute("textRejectQuery", undefined)
			).rejects.toBe("boom");

			expect(state(["textRejectQuery"]).error).toEqual(new Error("boom"));
		});

		it("do not write an error after $reset", async () => {
			// @ts-expect-error mock query repository
			const pending = store.execute("slowFailingQuery", undefined);
			store.$reset();

			slow.rejecters[0](new Error("late"));

			await expect(pending).rejects.toThrow("late");
			expect(store.cacheState).toStrictEqual({});
		});
	});

	describe("invalidateKey", () => {
		it("does nothing for an exact key nobody cached", async () => {
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "a");

			await store.invalidateKey(["testQuery", "other"]);

			expect(state(["testQuery", "a"])).toBeDefined();
			expect(testFetch).toHaveBeenCalledOnce();
		});

		it("leaves entries outside the prefix when not exact", async () => {
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "a");
			// @ts-expect-error mock query repository
			await store.execute("autoRefetchQuery", "a");

			await store.invalidateKey(["testQuery"], {
				exact: false,
				skipRefetch: true,
			});

			expect(state(["testQuery", "a"])).toBeUndefined();
			expect(state(["autoRefetchQuery", "a"])).toBeDefined();
		});

		it("refetches an auto refetch entry unless told not to", async () => {
			// @ts-expect-error mock query repository
			await store.execute("autoRefetchQuery", "a");
			autoFetch.mockClear();

			await store.invalidateKey(["autoRefetchQuery", "a"], {
				skipRefetch: true,
			});
			expect(autoFetch).not.toHaveBeenCalled();

			// @ts-expect-error mock query repository
			await store.execute("autoRefetchQuery", "a");
			autoFetch.mockClear();
			await store.invalidateKey(["autoRefetchQuery", "a"]);
			expect(autoFetch).toHaveBeenCalledOnce();
			expect(autoFetch).toHaveBeenCalledWith("a");
		});

		it("refetches any entry when forced", async () => {
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "a");
			testFetch.mockClear();

			await store.invalidateKey(["testQuery", "a"], {
				forceRefetch: true,
			});

			expect(testFetch).toHaveBeenCalledWith("a");
		});
	});

	it("addCacheState does not seed a write", () => {
		// @ts-expect-error mock query repository
		store.addCacheState("slowMutation", "a", "data");

		expect(store.cacheState).toStrictEqual({});
	});

	describe("status watcher", () => {
		it("leaves expired entries alone while the user is away", async () => {
			// @ts-expect-error mock query repository
			await store.execute("autoRefetchQuery", "a");
			autoFetch.mockClear();
			vi.spyOn(userActivity, "shouldDelay").mockReturnValue(true);
			vi.setSystemTime(5000);

			store.checkEntryStatusAndRefresh();
			await vi.advanceTimersByTimeAsync(0);

			expect(autoFetch).not.toHaveBeenCalled();
		});

		it("deletes an expired entry that is not refetched", async () => {
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "a");
			vi.setSystemTime(5000);

			store.checkEntryStatusAndRefresh();
			await vi.advanceTimersByTimeAsync(0);

			expect(state(["testQuery", "a"])).toBeUndefined();
			expect(testFetch).toHaveBeenCalledOnce();
		});

		it("checks every 10 seconds, started once", async () => {
			// @ts-expect-error mock query repository
			await store.execute("autoRefetchQuery", "a");
			autoFetch.mockClear();
			store.startStatusWatcher();
			expect(vi.getTimerCount()).toBe(1);

			await vi.advanceTimersByTimeAsync(10_000);

			expect(autoFetch).toHaveBeenCalledOnce();
		});

		describe("planet batches", () => {
			const planet = (id: string) => ({ planet_natural_id: id }) as never;
			const planetKey = (id: string) => ["gamedata", "planet", id];

			it("ignores an expiring multiple query without expired planets", async () => {
				await store.execute("GetMultiplePlanets", {
					planetNaturalIds: ["AB-001c"],
				});
				getMultiple.mockClear();
				vi.setSystemTime(5000);

				store.checkEntryStatusAndRefresh();
				await vi.advanceTimersByTimeAsync(0);

				expect(getMultiple).toHaveBeenCalledOnce();
				expect(getMultiple).toHaveBeenCalledWith({
					planetNaturalIds: ["AB-001c"],
				});
			});

			it("refreshes planets the expiring multiple query does not cover", async () => {
				await store.execute("GetMultiplePlanets", {
					planetNaturalIds: ["AB-001c"],
				});
				store.addCacheState(
					"GetPlanet",
					{ planetNaturalId: "CD-002c" },
					planet("CD-002c")
				);
				getMultiple.mockClear();
				vi.setSystemTime(5000);

				store.checkEntryStatusAndRefresh();
				await vi.advanceTimersByTimeAsync(0);

				expect(getMultiple.mock.calls).toStrictEqual([
					[{ planetNaturalIds: ["AB-001c"] }],
					[{ planetNaturalIds: ["CD-002c"] }],
				]);
				expect(state(planetKey("CD-002c"))).toMatchObject({
					data: { fresh: true },
					loading: false,
					error: null,
				});
			});

			it("drops results that arrive after the cache was reset", async () => {
				store.addCacheState(
					"GetPlanet",
					{ planetNaturalId: "AB-001c" },
					planet("AB-001c")
				);
				let resolve!: (rows: unknown[]) => void;
				getMultiple.mockReturnValueOnce(
					new Promise((r) => (resolve = r))
				);
				vi.setSystemTime(5000);
				store.checkEntryStatusAndRefresh();
				expect(state(planetKey("AB-001c")).loading).toBe(true);

				store.$reset();
				resolve([{ planet_natural_id: "AB-001c", fresh: true }]);
				await vi.advanceTimersByTimeAsync(0);

				expect(store.cacheState).toStrictEqual({});
			});

			it("keeps a rejection that is no Error as an Error", async () => {
				store.addCacheState(
					"GetPlanet",
					{ planetNaturalId: "AB-001c" },
					planet("AB-001c")
				);
				getMultiple.mockRejectedValueOnce("offline");
				vi.setSystemTime(5000);

				store.checkEntryStatusAndRefresh();
				await vi.advanceTimersByTimeAsync(0);

				expect(state(planetKey("AB-001c")).error).toEqual(
					new Error("offline")
				);
			});
		});
	});
});

describe("useQueryStore: initialData", () => {
	let store: ReturnType<typeof useQueryStore>;
	const definition = () => getQueryDefinition("persistedQuery" as any) as any;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		vi.useFakeTimers();
		vi.setSystemTime(10_000);
		definition().initialData.mockClear();
		definition().fetchFn.mockClear();
	});

	const run = (options?: { forceRefetch?: boolean }) =>
		// @ts-expect-error mock query repository
		store.execute("persistedQuery", undefined, options);

	it("returns a fresh persisted copy without fetching", async () => {
		persisted.initialData = async () => ({
			data: "cached",
			fetchedAt: 9_500,
		});

		expect(await run()).toBe("cached");
		expect(definition().fetchFn).not.toHaveBeenCalled();
		const state = store.peekQueryState(["persistedQuery"]);
		expect(state?.data).toBe("cached");
		// fresh from when it was fetched, not from now
		expect(state?.timestamp).toBe(9_500);
	});

	it("fetches when there is no persisted copy", async () => {
		persisted.initialData = async () => null;

		expect(await run()).toBe("fetched");
		expect(definition().fetchFn).toHaveBeenCalledOnce();
	});

	it("returns an expired copy and refetches it once in the background", async () => {
		persisted.initialData = async () => ({ data: "old", fetchedAt: 0 });

		const [a, b] = await Promise.all([run(), run()]);
		expect([a, b]).toEqual(["old", "old"]);
		// both callers shared one read
		expect(definition().initialData).toHaveBeenCalledOnce();

		await vi.waitFor(() =>
			expect(store.peekQueryState(["persistedQuery"])?.data).toBe(
				"fetched"
			)
		);
		expect(definition().fetchFn).toHaveBeenCalledOnce();
		// the refresh is fresh: the next call neither reads nor fetches
		expect(await run()).toBe("fetched");
		expect(definition().initialData).toHaveBeenCalledOnce();
		expect(definition().fetchFn).toHaveBeenCalledOnce();
	});

	it("is skipped by a forced refetch and once the entry has data", async () => {
		persisted.initialData = async () => ({
			data: "cached",
			fetchedAt: 9_500,
		});

		expect(await run({ forceRefetch: true })).toBe("fetched");
		vi.advanceTimersByTime(5_000);
		// expired entry with data: fetched again, never read from the copy
		expect(await run()).toBe("fetched");
		expect(definition().initialData).not.toHaveBeenCalled();
		expect(definition().fetchFn).toHaveBeenCalledTimes(2);
	});
});

describe("useQueryStore: fetch budget", () => {
	let store: ReturnType<typeof useQueryStore>;
	// @ts-expect-error mock query repository
	const testFetch = getQueryDefinition("testQuery").fetchFn as Mock;
	// @ts-expect-error mock query repository
	const autoFetch = getQueryDefinition("autoRefetchQuery").fetchFn as Mock;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useQueryStore();
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		vi.clearAllMocks();
		vi.spyOn(userActivity, "shouldDelay").mockReturnValue(false);
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	// what the sidebar did: drop the key and its request, ask again
	async function loop(times: number) {
		for (let i = 0; i < times; i++) {
			await store.invalidateKey(["testQuery", "a"]);
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "a").catch(() => {});
		}
	}

	it("allows 5 fetches in 10 s, then none for 30 s, and reports once", async () => {
		await loop(50);
		expect(testFetch).toHaveBeenCalledTimes(5);

		vi.setSystemTime(1000 + 29_000);
		await loop(50);
		expect(testFetch).toHaveBeenCalledTimes(5);

		vi.setSystemTime(1000 + 31_000);
		await loop(50);
		// a new budget, spent and blocked again
		expect(testFetch).toHaveBeenCalledTimes(10);
		expect(reportClientError).toHaveBeenCalledOnce();
		expect(reportClientError).toHaveBeenCalledWith({
			kind: "query_loop",
			query: "testQuery",
			fetches: 6,
		});
	});

	it("counts fetches, not cache hits or mutations", async () => {
		for (let i = 0; i < 20; i++) {
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "a");
		}
		expect(testFetch).toHaveBeenCalledOnce();
		expect(reportClientError).not.toHaveBeenCalled();
	});

	it("returns the last data while blocked", async () => {
		for (let i = 0; i < 5; i++) {
			// @ts-expect-error mock query repository
			await store.execute("testQuery", "a", { forceRefetch: true });
		}
		testFetch.mockClear();

		await expect(
			// @ts-expect-error mock query repository
			store.execute("testQuery", "a", { forceRefetch: true })
		).resolves.toEqual({ result: "data-a" });
		expect(testFetch).not.toHaveBeenCalled();
	});

	it("rejects without data; the status watcher doesn't retry it, the end of the block fetches once", async () => {
		const key = ["autoRefetchQuery", "a"];
		for (let i = 0; i < 5; i++) {
			await store.invalidateKey(key, { exact: true, skipRefetch: true });
			// @ts-expect-error mock query repository
			await store.execute("autoRefetchQuery", "a");
		}
		await store.invalidateKey(key, { exact: true, skipRefetch: true });

		await expect(
			// @ts-expect-error mock query repository
			store.execute("autoRefetchQuery", "a")
		).rejects.toBeInstanceOf(QueryLoopError);

		autoFetch.mockClear();
		await vi.advanceTimersByTimeAsync(29_000);
		store.checkEntryStatusAndRefresh();
		expect(autoFetch).not.toHaveBeenCalled();
		expect(store.cacheState[toCacheKey(key)].error).toBeInstanceOf(
			QueryLoopError
		);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(autoFetch).toHaveBeenCalledOnce();
		const entry = store.cacheState[toCacheKey(key)];
		expect(entry.error).toBeNull();
		expect(entry.data).not.toBeNull();
	});

	it("doesn't fetch after the block when the entry is gone", async () => {
		await loop(6);
		await store.invalidateKey(["testQuery", "a"]);
		testFetch.mockClear();

		await vi.advanceTimersByTimeAsync(31_000);

		expect(testFetch).not.toHaveBeenCalled();
	});

	it("logout cancels the fetch after the block", async () => {
		await loop(6);
		store.$reset();
		// @ts-expect-error mock query repository
		store.addCacheState("testQuery", "a", { result: "kept" });
		testFetch.mockClear();

		await vi.advanceTimersByTimeAsync(31_000);

		expect(testFetch).not.toHaveBeenCalled();
	});

	it("counts the fetch after the block, so a real loop stays capped", async () => {
		await loop(50);
		await vi.advanceTimersByTimeAsync(30_000);
		// the 5 of the budget, then the one after the block
		expect(testFetch).toHaveBeenCalledTimes(6);

		await loop(50);
		expect(testFetch).toHaveBeenCalledTimes(10);
		expect(reportClientError).toHaveBeenCalledOnce();
	});
});
