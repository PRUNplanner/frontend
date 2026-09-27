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
import {
	ICXEmpireJunction,
	IPlanEmpireJunction,
} from "@/features/manage/manage.types";
import {
	ICX,
	ICXData,
	IPlan,
	IPlanEmpire,
	IPlanEmpireElement,
	IPlanShare,
} from "@/stores/planningStore.types";
import {
	IShared,
	ISharedCloneResponse,
	ISharedCreateResponse,
} from "@/features/api/sharingData.types";
import {
	IEmpireCreatePayload,
	IEmpireMaterialIOState,
	IEmpirePatchPayload,
} from "@/features/empire/empire.types";
import {
	IPlanCreateData,
	IPlanSaveData,
} from "@/features/planning_data/usePlan.types";
import { PlanSaveCreateResponseType } from "@/features/api/schemas/planningData.schemas";

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
function setPlans(plans: IPlan[]): void {
	usePlanningStore().setPlans(plans);

	const queryStore = useQueryStore();
	plans.forEach((p) =>
		queryStore.addCacheState("GetPlan", { planUuid: p.uuid! }, p)
	);
}

export const planningQueries = {
	// Sharing
	GetSharedPlan: defineQuery({
		key: (params) => ["planningdata", "shared", params.sharedPlanUuid],
		fetchFn: (params: { sharedPlanUuid: string }): Promise<IPlanShare> =>
			callGetShared(params.sharedPlanUuid),
		expireTime: 10_000,
	}),
	GetAllShared: defineQuery({
		key: () => ["planningdata", "shared", "list"],
		fetchFn: async (): Promise<IShared[]> => {
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
		}): Promise<ISharedCreateResponse> => {
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
		}): Promise<ISharedCloneResponse> => {
			const data = await callCloneSharedPlan(params.sharedUuid);
			await dropShared();
			return data;
		},
		persist: false,
	}),

	// Empires
	GetAllEmpires: defineQuery({
		key: () => ["planningdata", "empire", "list"],
		fetchFn: async (): Promise<IPlanEmpireElement[]> => {
			const data = await callGetEmpireList();
			usePlanningStore().setEmpires(data);
			return data;
		},
	}),
	GetEmpirePlans: defineQuery({
		key: (params) => ["planningdata", "empire", "plans", params.empireUuid],
		// errors must propagate, [] would be cached as an empty empire
		fetchFn: async (params: { empireUuid: string }): Promise<IPlan[]> => {
			const data = await callGetEmpirePlans(params.empireUuid);
			setPlans(data);
			return data;
		},
	}),
	CreateEmpire: defineQuery({
		key: () => ["planningdata", "empire", "create"],
		fetchFn: async (params: {
			data: IEmpireCreatePayload;
		}): Promise<IPlanEmpire> => {
			const data = await callCreateEmpire(params.data);
			await invalidate(EMPIRES);
			return data;
		},
		persist: false,
	}),
	DeleteEmpire: defineQuery({
		key: (params) => ["planningdata", "empire", "delete", params.empireUuid],
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
			data: IEmpirePatchPayload;
		}): Promise<IPlanEmpire> => {
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
			empireState: IEmpireMaterialIOState;
		}): Promise<IPlanEmpire> =>
			callPatchEmpireState(params.empireUuid, params.empireState),
		persist: false,
	}),
	PatchEmpirePlanJunctions: defineQuery({
		key: () => ["planningdata", "empire", "plan", "junctions"],
		fetchFn: async (params: {
			junctions: IPlanEmpireJunction[];
		}): Promise<IPlanEmpireElement[]> => {
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
			junctions: ICXEmpireJunction[];
		}): Promise<ICX[]> => {
			const data = await callUpdateCXJunctions(params.junctions);
			await invalidate(EMPIRES, CXS);
			return data;
		},
		persist: false,
	}),

	// CX
	GetAllCX: defineQuery({
		key: () => ["planningdata", "cx"],
		fetchFn: async (): Promise<ICX[]> => {
			const data = await callGetCXList();
			usePlanningStore().setCXs(data);
			return data;
		},
	}),
	CreateCX: defineQuery({
		key: () => ["planningdata", "cx", "create"],
		fetchFn: async (params: { cxName: string }): Promise<ICX> => {
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
			data: ICXData;
		}): Promise<ICX> => {
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
		fetchFn: async (params: { planUuid: string }): Promise<IPlan> => {
			const data = await callGetPlan(params.planUuid);
			usePlanningStore().setPlan(data);
			return data;
		},
	}),
	GetAllPlans: defineQuery({
		key: () => ["planningdata", "plan", "list"],
		// errors must propagate, [] would be cached as "no plans"
		fetchFn: async (): Promise<IPlan[]> => {
			const data = await callGetPlanlist();
			setPlans(data);
			return data;
		},
	}),
	CreatePlan: defineQuery({
		key: () => ["planningdata", "plan", "create"],
		fetchFn: async (params: {
			data: IPlanCreateData;
		}): Promise<PlanSaveCreateResponseType> => {
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
			data: IPlanSaveData;
		}): Promise<PlanSaveCreateResponseType> => {
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
		}): Promise<IPlan> => {
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
