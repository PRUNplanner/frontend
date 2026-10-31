import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { watch } from "vue";

// first, as in the app: the repository then holds every query module
import "@/lib/query_cache/queryRepository";
import {
	batchChanges,
	planningQueries,
} from "@/lib/query_cache/queries/planning.queries";
import { invalidate } from "@/lib/query_cache/queries/queries.util";
import { resetLoadedModules } from "@/lib/sessionReset";
import { broadcastChange } from "@/lib/crossTab";
import { reportClientError } from "@/lib/clientErrors";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { toCacheKey } from "@/lib/query_cache/cacheKeys";
import { usePlanningStore } from "@/stores/planningStore";
import { callPatchCX } from "@/features/api/cxData.api";
import {
	callGetPlan,
	callGetPlanVersions,
	callSavePlan,
} from "@/features/api/planData.api";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { JSONValue } from "@/lib/query_cache/queryCache.types";
import { callGetEmpireList } from "@/features/api/empireData.api";

vi.mock("@/lib/crossTab", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/crossTab")>()),
	broadcastChange: vi.fn(),
}));
vi.mock("@/features/api/planData.api", () => ({
	callSavePlan: vi.fn(async (uuid: string) => ({
		uuid,
		plan_name: "P",
		modified_at: "v2",
	})),
	callGetPlan: vi.fn(async (uuid: string) => ({ uuid, plan_name: "P" })),
	callCreatePlan: vi.fn(async () => ({ uuid: "new", modified_at: "v1" })),
	callDeletePlan: vi.fn(async () => true),
	callClonePlan: vi.fn(async () => ({ uuid: "clone" })),
	callClonePlanVersion: vi.fn(async () => ({ uuid: "clone-v" })),
	callRenamePlanVersion: vi.fn(async () => ({ uuid: "v-1", name: "n" })),
	callGetPlanVersions: vi.fn(async () => []),
	callGetPlanVersion: vi.fn(async () => ({ uuid: "v-1" })),
	callGetPlanDraft: vi.fn(async () => null),
	callSavePlanDraft: vi.fn(async () => "u1"),
	callDeletePlanDraft: vi.fn(async () => undefined),
}));
vi.mock("@/features/api/empireData.api", () => ({
	callPatchEmpire: vi.fn(async () => ({ modified_at: "v2" })),
	callCreateEmpire: vi.fn(async () => ({ uuid: "empire-new" })),
	callDeleteEmpire: vi.fn(async () => true),
	callPatchEmpirePlanJunctions: vi.fn(async () => []),
	callGetEmpireList: vi.fn(async () => []),
}));
vi.mock("@/lib/clientErrors", () => ({ reportClientError: vi.fn() }));
vi.mock("@/features/api/cxData.api", () => ({
	callPatchCX: vi.fn(async () => ({ uuid: "cx-a", modified_at: "v2" })),
	callCreateCX: vi.fn(async () => ({ uuid: "cx-new" })),
	callDeleteCX: vi.fn(async () => true),
	callUpdateCXJunctions: vi.fn(async () => []),
}));
vi.mock("@/features/api/sharingData.api", () => ({
	callCreateSharing: vi.fn(async () => ({})),
	callDeleteSharing: vi.fn(async () => true),
	callCloneSharedPlan: vi.fn(async () => ({ uuid: "clone-shared" })),
}));

const PLANS = ["planningdata", "plan"];
const EMPIRES = ["planningdata", "empire"];
const CXS = ["planningdata", "cx"];

// PatchPlan refreshes the version list on a timer
beforeEach(() => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});
afterEach(() => {
	// a logout drops the refreshes still waiting
	resetLoadedModules();
	vi.clearAllTimers();
	vi.useRealTimers();
});

describe("planning queries tell the other tabs", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(broadcastChange).mockClear();
	});

	it.each([
		[
			"PatchPlan",
			{ planUuid: "plan-a", data: {} },
			[
				[
					[...EMPIRES, "plans"],
					[...PLANS, "list"],
					// the name before is unknown here
					[...EMPIRES, "list"],
					[...PLANS, "plan-a"],
				],
				["plan-a"],
			],
		],
		["CreatePlan", { data: {} }, [[PLANS, EMPIRES], ["new"]]],
		[
			"DeletePlan",
			{ planUuid: "plan-a" },
			[[EMPIRES, [...PLANS, "list"], [...PLANS, "plan-a"]], ["plan-a"]],
		],
		[
			"ClonePlan",
			{ planUuid: "plan-a", cloneName: "c" },
			[[EMPIRES, [...PLANS, "list"]], ["clone"]],
		],
		[
			"ClonePlanVersion",
			{ planUuid: "plan-a", versionUuid: "v-1" },
			[[EMPIRES, [...PLANS, "list"]], ["clone-v"]],
		],
		[
			"RenamePlanVersion",
			{ planUuid: "plan-a", versionUuid: "v-1", name: "n" },
			[[[...PLANS, "plan-a", "versions"]], []],
		],
		[
			"PatchEmpire",
			{ empireUuid: "empire-a", data: {} },
			[[EMPIRES], ["empire-a"]],
		],
		["CreateEmpire", { data: {} }, [[EMPIRES], ["empire-new"]]],
		["DeleteEmpire", { empireUuid: "empire-a" }, [[EMPIRES], ["empire-a"]]],
		["PatchEmpirePlanJunctions", { junctions: [] }, [[EMPIRES, PLANS], []]],
		["PatchEmpireCXJunctions", { junctions: [] }, [[EMPIRES, CXS], []]],
		["CreateCX", { cxName: "n" }, [[CXS], ["cx-new"]]],
		["DeleteCX", { cxUuid: "cx-a" }, [[CXS], ["cx-a"]]],
		[
			"PatchCX",
			{ cxName: "n", cxUuid: "cx-a", data: {}, baseModifiedAt: "v1" },
			[[CXS], ["cx-a"]],
		],
		[
			"CreateSharedPlan",
			{ planUuid: "plan-a" },
			[[["planningdata", "shared"]]],
		],
		[
			"DeleteSharedPlan",
			{ sharedUuid: "s" },
			[[["planningdata", "shared"]]],
		],
	])("%s", async (name, params, args) => {
		const query = planningQueries[name as keyof typeof planningQueries];
		// @ts-expect-error params per query
		await query.fetchFn(params);

		expect(broadcastChange).toHaveBeenCalledTimes(1);
		expect(broadcastChange).toHaveBeenCalledWith(...args);
	});

	it("PostCloneSharedPlan: the shared list and the new plan", async () => {
		await planningQueries.PostCloneSharedPlan.fetchFn({ sharedUuid: "s" });

		expect(vi.mocked(broadcastChange).mock.calls).toEqual([
			[[["planningdata", "shared"]]],
			[[PLANS, EMPIRES], ["clone-shared"]],
		]);
	});

	it("draft writes tell nobody, they are never cached", async () => {
		const q = planningQueries;
		await q.SavePlanDraft.fetchFn({
			planUuid: "plan-a",
			// @ts-expect-error mock data
			data: {},
		});
		await q.DeletePlanDraft.fetchFn({
			planUuid: "plan-a",
			draftUpdatedAt: "u1",
		});
		expect(await q.GetPlanDraft.fetchFn({ planUuid: "plan-a" })).toBeNull();
		expect(q.GetPlanDraft.cache).toBe(false);
		expect(broadcastChange).not.toHaveBeenCalled();

		// versions sit under their plan: a save refreshes them
		expect(q.GetPlanVersions.key({ planUuid: "plan-a" })).toEqual([
			...PLANS,
			"plan-a",
			"versions",
		]);
		expect(q.GetPlanVersions.autoRefetch).toBe(true);
		expect(await q.GetPlanVersions.fetchFn({ planUuid: "plan-a" })).toEqual(
			[]
		);
		expect(
			q.GetPlanVersion.key({ planUuid: "plan-a", versionUuid: "v-1" })
		).toEqual([...PLANS, "plan-a", "version", "v-1"]);
		expect(
			await q.GetPlanVersion.fetchFn({
				planUuid: "plan-a",
				versionUuid: "v-1",
			})
		).toEqual({ uuid: "v-1" });
	});

	it("PatchCX sends the base version", async () => {
		await planningQueries.PatchCX.fetchFn({
			cxName: "n",
			cxUuid: "cx-a",
			// @ts-expect-error mock data
			data: {},
			baseModifiedAt: "v1",
		});

		expect(callPatchCX).toHaveBeenCalledWith("n", "cx-a", {}, "v1");
	});
});

describe("batchChanges", () => {
	const q = planningQueries;
	let invalidateKey: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		invalidateKey = vi.spyOn(useQueryStore(), "invalidateKey");
	});

	it("invalidates each key once and broadcasts once at the end", async () => {
		const result = await batchChanges(async () => {
			// @ts-expect-error mock data
			await q.CreateEmpire.fetchFn({ data: {} });
			// @ts-expect-error mock data
			await q.CreatePlan.fetchFn({ data: {} });
			await q.DeletePlan.fetchFn({ planUuid: "plan-a" });
			expect(invalidateKey).not.toHaveBeenCalled();
			expect(broadcastChange).not.toHaveBeenCalled();
			return "done";
		});

		expect(result).toBe("done");
		expect(vi.mocked(broadcastChange).mock.calls).toEqual([
			[
				[EMPIRES, PLANS, [...PLANS, "list"], [...PLANS, "plan-a"]],
				["empire-new", "new", "plan-a"],
			],
		]);
		// the plan keys are under the plans prefix
		expect(invalidateKey.mock.calls).toEqual([
			[EMPIRES, { exact: false }],
			[PLANS, { exact: false }],
		]);
	});

	it("joins a nested batch to the outer one", async () => {
		await batchChanges(async () => {
			await batchChanges(() => q.DeleteCX.fetchFn({ cxUuid: "cx-a" }));
			expect(broadcastChange).not.toHaveBeenCalled();
			// @ts-expect-error mock data
			await q.PatchEmpire.fetchFn({ empireUuid: "empire-a", data: {} });
		});

		expect(broadcastChange).toHaveBeenCalledOnce();
		expect(broadcastChange).toHaveBeenCalledWith(
			[CXS, EMPIRES],
			["cx-a", "empire-a"]
		);
	});

	it("still flushes what was saved when fn throws, and rethrows", async () => {
		await expect(
			batchChanges(async () => {
				// @ts-expect-error mock data
				await q.CreatePlan.fetchFn({ data: {} });
				throw new Error("second save failed");
			})
		).rejects.toThrow("second save failed");

		expect(broadcastChange).toHaveBeenCalledOnce();
		expect(broadcastChange).toHaveBeenCalledWith([PLANS, EMPIRES], ["new"]);
	});

	it("broadcasts nothing without a change", async () => {
		await batchChanges(async () => {});

		expect(broadcastChange).not.toHaveBeenCalled();
	});

	// the navigation: a dropped empire list is loaded again right away
	function mountEmpireReader(): void {
		const store = useQueryStore();
		watch(
			() => !store.peekQueryState(["planningdata", "empire", "list"]),
			(missing) => {
				if (missing)
					store.execute("GetAllEmpires", undefined).catch(() => {});
			},
			{ immediate: true, flush: "sync" }
		);
	}

	it("8 saves in a batch: the empire list is fetched once, no loop", async () => {
		mountEmpireReader();
		await vi.waitFor(() =>
			expect(callGetEmpireList).toHaveBeenCalledOnce()
		);
		vi.mocked(callGetEmpireList).mockClear();

		await batchChanges(async () => {
			for (let i = 0; i < 8; i++)
				// @ts-expect-error mock data
				await q.CreatePlan.fetchFn({ data: {} });
		});
		await vi.waitFor(() => expect(callGetEmpireList).toHaveBeenCalled());

		expect(callGetEmpireList).toHaveBeenCalledOnce();
		expect(reportClientError).not.toHaveBeenCalled();
	});

	it("8 saves without a batch trip the guard", async () => {
		mountEmpireReader();
		await vi.waitFor(() =>
			expect(callGetEmpireList).toHaveBeenCalledOnce()
		);

		for (let i = 0; i < 8; i++)
			// @ts-expect-error mock data
			await q.CreatePlan.fetchFn({ data: {} });

		expect(reportClientError).toHaveBeenCalledOnce();
	});
});

describe("PatchPlan uses its answer", () => {
	const q = planningQueries;
	const key = [...PLANS, "plan-a"];
	let invalidateKey: ReturnType<typeof vi.spyOn>;

	function seedPlan(name: string): Plan {
		const plan = { uuid: "plan-a", plan_name: name, modified_at: "v1" };
		// @ts-expect-error mock data
		usePlanningStore().setPlan(plan);
		// @ts-expect-error mock data
		useQueryStore().addCacheState("GetPlan", { planUuid: "plan-a" }, plan);
		return plan as Plan;
	}

	function save() {
		// @ts-expect-error mock data
		return q.PatchPlan.fetchFn({ planUuid: "plan-a", data: {} });
	}

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		invalidateKey = vi.spyOn(useQueryStore(), "invalidateKey");
	});

	it("stores the answer in the store and the GetPlan entry, no fetch", async () => {
		seedPlan("P");

		const saved = await save();

		expect(usePlanningStore().plans["plan-a"]).toStrictEqual(saved);
		expect(useQueryStore().peekQueryState(key)?.data).toBe(saved);
		expect(
			await useQueryStore().execute("GetPlan", { planUuid: "plan-a" })
		).toBe(saved);
		expect(callGetPlan).not.toHaveBeenCalled();
	});

	it("no rename: plan list and empire plan lists, not the empire list", async () => {
		seedPlan("P");

		await save();

		expect(invalidateKey.mock.calls).toEqual([
			[[...EMPIRES, "plans"], { exact: false }],
			[[...PLANS, "list"], { exact: true }],
		]);
		// the other tabs refetch the plan and its versions
		expect(broadcastChange).toHaveBeenCalledWith(
			[[...EMPIRES, "plans"], [...PLANS, "list"], key],
			["plan-a"]
		);
	});

	const versions = [...PLANS, "plan-a", "versions"];
	const refreshes = () =>
		invalidateKey.mock.calls.filter(
			(c: unknown[]) =>
				toCacheKey(c[0] as JSONValue) === toCacheKey(versions)
		).length;

	it("a save refreshes the version list 1 s later", async () => {
		seedPlan("P");

		await save();
		await vi.advanceTimersByTimeAsync(999);
		expect(refreshes()).toBe(0);
		await vi.advanceTimersByTimeAsync(1);
		expect(refreshes()).toBe(1);
	});

	it("saves 1.1 s apart: at most 4 refreshes in 10 s, the last save's included", async () => {
		seedPlan("P");

		for (let i = 0; i < 10; i++) {
			await save();
			if (i < 9) await vi.advanceTimersByTimeAsync(1100);
		}
		// 9.9 s: refreshed at 1, 4 and 7 s, the next one waits
		expect(refreshes()).toBe(3);
		await vi.advanceTimersByTimeAsync(3000);
		expect(refreshes()).toBe(4);
	});

	it("10 saves 1 s apart with the version list shown: no loop", async () => {
		seedPlan("P");
		const store = useQueryStore();
		await store.execute("GetPlanVersions", { planUuid: "plan-a" });

		for (let i = 0; i < 10; i++) {
			await save();
			await vi.advanceTimersByTimeAsync(1000);
		}
		await vi.advanceTimersByTimeAsync(3000);

		// the page load's fetch and one per refresh
		expect(
			vi.mocked(callGetPlanVersions).mock.calls.length
		).toBeLessThanOrEqual(5);
		expect(reportClientError).not.toHaveBeenCalled();
	});

	it("a rename invalidates the empire list once", async () => {
		seedPlan("old name");

		await save();

		expect(invalidateKey).toHaveBeenCalledWith([...EMPIRES, "list"], {
			exact: true,
		});
		expect(vi.mocked(broadcastChange).mock.calls[0][0]).toContainEqual([
			...EMPIRES,
			"list",
		]);
	});

	it("a failed save changes nothing", async () => {
		const plan = seedPlan("P");
		vi.mocked(callSavePlan).mockRejectedValueOnce(
			Object.assign(new Error("conflict"), { status: 409 })
		);

		await expect(save()).rejects.toThrow("conflict");

		expect(usePlanningStore().plans["plan-a"]).toStrictEqual(plan);
		expect(useQueryStore().peekQueryState(key)?.data).toBe(plan);
		expect(invalidateKey).not.toHaveBeenCalled();
		expect(broadcastChange).not.toHaveBeenCalled();
	});

	it("in a batch the plan's own key is still only broadcast", async () => {
		seedPlan("P");

		await batchChanges(async () => {
			await save();
			await save();
		});

		expect(invalidateKey).not.toHaveBeenCalledWith(key, expect.anything());
		expect(broadcastChange).toHaveBeenCalledOnce();
		expect(vi.mocked(broadcastChange).mock.calls[0][0]).toContainEqual(key);
		expect(useQueryStore().peekQueryState(key)?.data).toMatchObject({
			modified_at: "v2",
		});
	});

	it("10 saves with mounted plan and empire readers: no fetch, no loop", async () => {
		seedPlan("P");
		const store = useQueryStore();
		// readers that load a dropped entry again right away
		const readers: [JSONValue, () => Promise<unknown>][] = [
			[
				[...EMPIRES, "list"],
				() => store.execute("GetAllEmpires", undefined),
			],
			[key, () => store.execute("GetPlan", { planUuid: "plan-a" })],
		];
		for (const [k, load] of readers)
			watch(
				() => !store.peekQueryState(k),
				(missing) => {
					if (missing) load().catch(() => {});
				},
				{ immediate: true, flush: "sync" }
			);
		await vi.waitFor(() =>
			expect(callGetEmpireList).toHaveBeenCalledOnce()
		);
		vi.mocked(callGetEmpireList).mockClear();

		for (let i = 0; i < 10; i++) await save();

		expect(callGetEmpireList).not.toHaveBeenCalled();
		expect(callGetPlan).not.toHaveBeenCalled();
		expect(reportClientError).not.toHaveBeenCalled();
	});
});

describe("invalidate", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it("a key under another one refetches once, not twice", async () => {
		// what another tab gets after a save
		const store = useQueryStore();
		await store.execute("GetPlanVersions", { planUuid: "plan-a" });
		vi.mocked(callGetPlanVersions).mockClear();

		await invalidate(
			[...PLANS, "plan-a", "versions"],
			[...PLANS, "plan-a"]
		);
		await vi.waitFor(() =>
			expect(
				store.peekQueryState([...PLANS, "plan-a", "versions"])?.loading
			).toBe(false)
		);

		expect(callGetPlanVersions).toHaveBeenCalledOnce();
	});
});
