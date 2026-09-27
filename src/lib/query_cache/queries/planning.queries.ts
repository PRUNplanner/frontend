// Stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { usePlanningStore } from "@/stores/planningStore";

// Util
import {
	defineQuery,
	invalidate,
	staleMinutes,
} from "@/lib/query_cache/queries/queries.util";

// API Calls
import {
	callClonePlan,
	callCreatePlan,
	callDeletePlan,
	callGetPlan,
	callGetPlanlist,
	callGetShared,
	callSavePlan,
} from "@/features/api/planData.api";
import {
	callCreateEmpire,
	callDeleteEmpire,
	callGetEmpireList,
	callGetEmpirePlans,
	callPatchEmpire,
	callPatchEmpirePlanJunctions,
	callPatchEmpireState,
} from "@/features/api/empireData.api";
import {
	callCreateCX,
	callDeleteCX,
	callGetCXList,
	callPatchCX,
	callUpdateCXJunctions,
} from "@/features/api/cxData.api";
import {
	callCloneSharedPlan,
	callCreateSharing,
	callDeleteSharing,
	callGetSharedList,
} from "@/features/api/sharingData.api";

// Types & Interfaces
import type {
	CX,
	CXData,
	CXEmpireJunction,
} from "@/features/api/schemas/cxData.schemas";
import type {
	EmpireMaterialIOState,
	EmpirePayload,
	PlanEmpireElement,
	PlanEmpireJunction,
} from "@/features/api/schemas/empireData.schemas";
import type {
	Plan,
	PlanCreateData,
	PlanEmpire,
	PlanSaveCreateResponse,
	PlanSaveData,
	PlanShare,
} from "@/features/api/schemas/planningData.schemas";
import type {
	Shared,
	SharedCloneResponse,
	SharedCreateResponse,
} from "@/features/api/schemas/sharingData.schemas";

const EMPIRES = ["planningdata", "empire"];
const PLANS = ["planningdata", "plan"];
const CXS = ["planningdata", "cx"];

/** Drops every shared plan entry without refetching the list. */
function dropShared(): Promise<void> {
	return useQueryStore().invalidateKey(["planningdata", "shared"], {
		exact: false,
		skipRefetch: true,
	});
}

/** Stores plans and seeds each plan's own `GetPlan` entry. */
function setPlans(plans: Plan[]): void {
	usePlanningStore().setPlans(plans);

	const queryStore = useQueryStore();
	plans.forEach((p) =>
		queryStore.addCacheState("GetPlan", { planUuid: p.uuid }, p)
	);
}

export const planningQueries = {
	// Sharing
	GetSharedPlan: defineQuery({
		key: (params) => ["planningdata", "shared", params.sharedPlanUuid],
		fetchFn: (params: { sharedPlanUuid: string }): Promise<PlanShare> =>
			callGetShared(params.sharedPlanUuid),
		expireTime: 10_000,
	}),
	GetAllShared: defineQuery({
		key: () => ["planningdata", "shared", "list"],
		fetchFn: async (): Promise<Shared[]> => {
			const data = await callGetSharedList();
			usePlanningStore().setSharedList(data);
			return data;
		},
		autoRefetch: true,
		expireTime: staleMinutes(60),
	}),
	DeleteSharedPlan: defineQuery({
		key: (params) => [
			"planningdata",
			"shared",
			"delete",
			params.sharedUuid,
		],
		fetchFn: async (params: { sharedUuid: string }): Promise<boolean> => {
			const data = await callDeleteSharing(params.sharedUuid);
			await dropShared();
			return data;
		},
		persist: false,
	}),
	CreateSharedPlan: defineQuery({
		key: (params) => ["planningdata", "shared", "create", params.planUuid],
		fetchFn: async (params: {
			planUuid: string;
		}): Promise<SharedCreateResponse> => {
			const data = await callCreateSharing(params.planUuid);
			await dropShared();
			return data;
		},
		persist: false,
	}),
	PostCloneSharedPlan: defineQuery({
		key: (params) => ["planningdata", "shared", "clone", params.sharedUuid],
		fetchFn: async (params: {
			sharedUuid: string;
		}): Promise<SharedCloneResponse> => {
			const data = await callCloneSharedPlan(params.sharedUuid);
			await dropShared();
			return data;
		},
		persist: false,
	}),

	// Empires
	GetAllEmpires: defineQuery({
		key: () => ["planningdata", "empire", "list"],
		fetchFn: async (): Promise<PlanEmpireElement[]> => {
			const data = await callGetEmpireList();
			usePlanningStore().setEmpires(data);
			return data;
		},
	}),
	GetEmpirePlans: defineQuery({
		key: (params) => ["planningdata", "empire", "plans", params.empireUuid],
		// errors must propagate, [] would be cached as an empty empire
		fetchFn: async (params: { empireUuid: string }): Promise<Plan[]> => {
			const data = await callGetEmpirePlans(params.empireUuid);
			setPlans(data);
			return data;
		},
	}),
	CreateEmpire: defineQuery({
		key: () => ["planningdata", "empire", "create"],
		fetchFn: async (params: {
			data: EmpirePayload;
		}): Promise<PlanEmpire> => {
			const data = await callCreateEmpire(params.data);
			await invalidate(EMPIRES);
			return data;
		},
		persist: false,
	}),
	DeleteEmpire: defineQuery({
		key: (params) => [
			"planningdata",
			"empire",
			"delete",
			params.empireUuid,
		],
		fetchFn: async (params: { empireUuid: string }): Promise<boolean> => {
			const data = await callDeleteEmpire(params.empireUuid);
			await invalidate(EMPIRES);
			return data;
		},
		persist: false,
	}),
	PatchEmpire: defineQuery({
		key: (params) => ["planningdata", "empire", "patch", params.empireUuid],
		fetchFn: async (params: {
			empireUuid: string;
			data: EmpirePayload;
		}): Promise<PlanEmpire> => {
			const data = await callPatchEmpire(params.empireUuid, params.data);
			await invalidate(EMPIRES);
			return data;
		},
		persist: false,
	}),
	PatchEmpireState: defineQuery({
		key: (params) => ["planningdata", "empire", "state", params.empireUuid],
		fetchFn: (params: {
			empireUuid: string;
			empireState: EmpireMaterialIOState;
		}): Promise<PlanEmpire> =>
			callPatchEmpireState(params.empireUuid, params.empireState),
		persist: false,
	}),
	PatchEmpirePlanJunctions: defineQuery({
		key: () => ["planningdata", "empire", "plan", "junctions"],
		fetchFn: async (params: {
			junctions: PlanEmpireJunction[];
		}): Promise<PlanEmpireElement[]> => {
			const data = await callPatchEmpirePlanJunctions(params.junctions);
			// junctions change both empires and their plans
			await invalidate(EMPIRES, PLANS);
			return data;
		},
		persist: false,
	}),
	PatchEmpireCXJunctions: defineQuery({
		key: () => ["planningdata", "empire", "cx", "junctions"],
		fetchFn: async (params: {
			junctions: CXEmpireJunction[];
		}): Promise<CX[]> => {
			const data = await callUpdateCXJunctions(params.junctions);
			await invalidate(EMPIRES, CXS);
			return data;
		},
		persist: false,
	}),

	// CX
	GetAllCX: defineQuery({
		key: () => ["planningdata", "cx"],
		fetchFn: async (): Promise<CX[]> => {
			const data = await callGetCXList();
			usePlanningStore().setCXs(data);
			return data;
		},
	}),
	CreateCX: defineQuery({
		key: () => ["planningdata", "cx", "create"],
		fetchFn: async (params: { cxName: string }): Promise<CX> => {
			const data = await callCreateCX(params.cxName);
			await invalidate(CXS);
			return data;
		},
		persist: false,
	}),
	PatchCX: defineQuery({
		key: (params) => ["planningdata", "cx", "patch", params.cxUuid],
		fetchFn: async (params: {
			cxName: string;
			cxUuid: string;
			data: CXData;
		}): Promise<CX> => {
			const data = await callPatchCX(
				params.cxName,
				params.cxUuid,
				params.data
			);
			await invalidate(CXS);
			usePlanningStore().setCX(params.cxUuid, data.cx_name, data.cx_data);
			return data;
		},
		persist: false,
	}),
	DeleteCX: defineQuery({
		key: (params) => ["planningdata", "cx", "delete", params.cxUuid],
		fetchFn: async (params: { cxUuid: string }): Promise<boolean> => {
			const data = await callDeleteCX(params.cxUuid);
			await invalidate(CXS);
			return data;
		},
		persist: false,
	}),

	// Plans
	GetPlan: defineQuery({
		key: (params) => ["planningdata", "plan", params.planUuid],
		fetchFn: async (params: { planUuid: string }): Promise<Plan> => {
			const data = await callGetPlan(params.planUuid);
			usePlanningStore().setPlan(data);
			return data;
		},
	}),
	GetAllPlans: defineQuery({
		key: () => ["planningdata", "plan", "list"],
		// errors must propagate, [] would be cached as "no plans"
		fetchFn: async (): Promise<Plan[]> => {
			const data = await callGetPlanlist();
			setPlans(data);
			return data;
		},
	}),
	CreatePlan: defineQuery({
		key: () => ["planningdata", "plan", "create"],
		fetchFn: async (params: {
			data: PlanCreateData;
		}): Promise<PlanSaveCreateResponse> => {
			const data = await callCreatePlan(params.data);
			await invalidate(PLANS, EMPIRES);
			return data;
		},
		persist: false,
	}),
	PatchPlan: defineQuery({
		key: (params) => ["planningdata", "plan", "patch", params.planUuid],
		fetchFn: async (params: {
			planUuid: string;
			data: PlanSaveData;
		}): Promise<PlanSaveCreateResponse> => {
			const data = await callSavePlan(params.planUuid, params.data);
			await invalidate(PLANS, EMPIRES);
			return data;
		},
		persist: false,
	}),
	ClonePlan: defineQuery({
		key: (params) => ["planningdata", "plan", "clone", params.planUuid],
		fetchFn: async (params: {
			planUuid: string;
			cloneName: string;
		}): Promise<Plan> => {
			const data = await callClonePlan(params.planUuid, params.cloneName);
			await invalidate(EMPIRES);
			await useQueryStore().invalidateKey([...PLANS, "list"]);
			return data;
		},
		persist: false,
	}),
	DeletePlan: defineQuery({
		key: (params) => ["planningdata", "plan", "delete", params.planUuid],
		fetchFn: async (params: { planUuid: string }): Promise<boolean> => {
			const data = await callDeletePlan(params.planUuid);
			const queryStore = useQueryStore();
			await invalidate(EMPIRES);
			await queryStore.invalidateKey([...PLANS, "list"]);
			await queryStore.invalidateKey([...PLANS, params.planUuid]);
			usePlanningStore().deletePlan(params.planUuid);
			return data;
		},
		persist: false,
	}),
};
