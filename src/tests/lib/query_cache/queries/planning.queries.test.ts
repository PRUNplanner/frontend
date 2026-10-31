import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { watch } from "vue";

// first, as in the app: the repository then holds every query module
import "@/lib/query_cache/queryRepository";
import {
	batchChanges,
	planningQueries,
} from "@/lib/query_cache/queries/planning.queries";
import { broadcastChange } from "@/lib/crossTab";
import { reportClientError } from "@/lib/clientErrors";
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { callPatchCX } from "@/features/api/cxData.api";
import { callGetEmpireList } from "@/features/api/empireData.api";

vi.mock("@/lib/crossTab", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/crossTab")>()),
	broadcastChange: vi.fn(),
}));
vi.mock("@/features/api/planData.api", () => ({
	callSavePlan: vi.fn(async (uuid: string) => ({ uuid, modified_at: "v2" })),
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

describe("planning queries tell the other tabs", () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(broadcastChange).mockClear();
	});

	it.each([
		[
			"PatchPlan",
			{ planUuid: "plan-a", data: {} },
			[[PLANS, EMPIRES], ["plan-a"]],
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
		expect(invalidateKey.mock.calls).toEqual([
			[EMPIRES, { exact: false }],
			[PLANS, { exact: false }],
			[[...PLANS, "list"], { exact: true }],
			[[...PLANS, "plan-a"], { exact: true }],
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
