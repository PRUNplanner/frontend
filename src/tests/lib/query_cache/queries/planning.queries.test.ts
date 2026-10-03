import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { planningQueries } from "@/lib/query_cache/queries/planning.queries";
import { broadcastChange } from "@/lib/crossTab";
import { callPatchCX } from "@/features/api/cxData.api";

vi.mock("@/lib/crossTab", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/crossTab")>()),
	broadcastChange: vi.fn(),
}));
vi.mock("@/features/api/planData.api", () => ({
	callSavePlan: vi.fn(async (uuid: string) => ({ uuid, modified_at: "v2" })),
	callCreatePlan: vi.fn(async () => ({ uuid: "new", modified_at: "v1" })),
	callDeletePlan: vi.fn(async () => true),
	callClonePlan: vi.fn(async () => ({ uuid: "clone" })),
}));
vi.mock("@/features/api/empireData.api", () => ({
	callPatchEmpire: vi.fn(async () => ({ modified_at: "v2" })),
	callCreateEmpire: vi.fn(async () => ({ uuid: "empire-new" })),
	callDeleteEmpire: vi.fn(async () => true),
	callPatchEmpirePlanJunctions: vi.fn(async () => []),
}));
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
			[[PLANS, EMPIRES], "plan-a"],
		],
		["CreatePlan", { data: {} }, [[PLANS, EMPIRES], "new"]],
		[
			"DeletePlan",
			{ planUuid: "plan-a" },
			[[EMPIRES, [...PLANS, "list"], [...PLANS, "plan-a"]], "plan-a"],
		],
		[
			"ClonePlan",
			{ planUuid: "plan-a", cloneName: "c" },
			[[EMPIRES, [...PLANS, "list"]], "clone"],
		],
		[
			"PatchEmpire",
			{ empireUuid: "empire-a", data: {} },
			[[EMPIRES], "empire-a"],
		],
		["CreateEmpire", { data: {} }, [[EMPIRES], "empire-new"]],
		["DeleteEmpire", { empireUuid: "empire-a" }, [[EMPIRES], "empire-a"]],
		[
			"PatchEmpirePlanJunctions",
			{ junctions: [] },
			[[EMPIRES, PLANS], undefined],
		],
		[
			"PatchEmpireCXJunctions",
			{ junctions: [] },
			[[EMPIRES, CXS], undefined],
		],
		["CreateCX", { cxName: "n" }, [[CXS], "cx-new"]],
		["DeleteCX", { cxUuid: "cx-a" }, [[CXS], "cx-a"]],
		[
			"PatchCX",
			{ cxName: "n", cxUuid: "cx-a", data: {}, baseModifiedAt: "v1" },
			[[CXS], "cx-a"],
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
			[[PLANS, EMPIRES], "clone-shared"],
		]);
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
