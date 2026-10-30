// Stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { usePlanningStore } from "@/stores/planningStore";

// Util
import { broadcastChange } from "@/lib/crossTab";
import { toCacheKey } from "@/lib/query_cache/cacheKeys";
import {
	defineMutation,
	defineQuery,
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
	EmpireSaveResponse,
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
import type { JSONValue } from "@/lib/query_cache/queryCache.types";
import type {
	Shared,
	SharedCloneResponse,
	SharedCreateResponse,
} from "@/features/api/schemas/sharingData.schemas";

const EMPIRES = ["planningdata", "empire"];
const PLANS = ["planningdata", "plan"];
const CXS = ["planningdata", "cx"];

interface IChangedKey {
	key: JSONValue;
	exact: boolean;
}

// the running batchChanges: keys to invalidate (deduped) and changed objects
let batch: { keys: Map<string, IChangedKey>; uuids: Set<string> } | null = null;

/**
 * Invalidates the keys and tells the user's other tabs, in one broadcast
 *
 * @param {IChangedKey[]} keys Keys, exact or prefixes
 * @param {string[]} uuids Changed plans, empires or CXs
 */
async function flush(keys: IChangedKey[], uuids: string[]): Promise<void> {
	const queryStore = useQueryStore();
	for (const { key, exact } of keys)
		await queryStore.invalidateKey(key, { exact });
	broadcastChange(
		keys.map((k) => k.key),
		uuids
	);
}

/**
 * Invalidates the keys after a change and tells the user's other tabs;
 * inside `batchChanges` only records them
 *
 * @param {JSONValue[]} prefixes Key prefixes
 * @param {string} [uuid] Changed plan, empire or CX
 * @param {JSONValue[]} [exact=[]] Keys invalidated exactly
 */
async function changed(
	prefixes: JSONValue[],
	uuid?: string,
	exact: JSONValue[] = []
): Promise<void> {
	const keys = [
		...prefixes.map((key) => ({ key, exact: false })),
		...exact.map((key) => ({ key, exact: true })),
	];
	const uuids = uuid ? [uuid] : [];
	if (!batch) return flush(keys, uuids);

	keys.forEach((k) => batch!.keys.set(`${k.exact}:${toCacheKey(k.key)}`, k));
	uuids.forEach((u) => batch!.uuids.add(u));
}

/**
 * Runs a bulk action (a loop of planning mutations) with one invalidation
 * per key and one broadcast at its end, also when `fn` throws, so readers
 * refetch once instead of once per save. Nested calls join the outer one;
 * another save of this tab meanwhile waits with it.
 *
 * @param {() => Promise<T>} fn Bulk action
 * @returns {Promise<T>} What `fn` returns
 */
export async function batchChanges<T>(fn: () => Promise<T>): Promise<T> {
	if (batch) return fn();

	const current = (batch = { keys: new Map(), uuids: new Set() });
	try {
		return await fn();
	} finally {
		batch = null;
		if (current.keys.size)
			await flush([...current.keys.values()], [...current.uuids]);
	}
}

/** Drops every shared plan entry without refetching the list. */
async function dropShared(): Promise<void> {
	await useQueryStore().invalidateKey(["planningdata", "shared"], {
		exact: false,
		skipRefetch: true,
	});
	broadcastChange([["planningdata", "shared"]]);
}

/**
 * Stores plans and seeds each plan's own `GetPlan` entry. An empire's plan
 * list leaves out the empires a plan is in: those aren't seeded, or the
 * opened plan would calculate with the first empire, not its own, and
 * keep the empires a stored copy already has (a reload reads it)
 */
function setPlans(plans: Plan[]): void {
	const store = usePlanningStore();
	store.setPlans(
		plans.map((p) => {
			const kept = store.plans[p.uuid]?.empires;
			return p.empires || !kept ? p : { ...p, empires: kept };
		})
	);

	const queryStore = useQueryStore();
	plans
		.filter((p) => p.empires)
		.forEach((p) =>
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
	DeleteSharedPlan: defineMutation({
		fetchFn: async (params: { sharedUuid: string }): Promise<void> => {
			await callDeleteSharing(params.sharedUuid);
			await dropShared();
		},
	}),
	CreateSharedPlan: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
		}): Promise<SharedCreateResponse> => {
			const data = await callCreateSharing(params.planUuid);
			await dropShared();
			return data;
		},
	}),
	PostCloneSharedPlan: defineMutation({
		fetchFn: async (params: {
			sharedUuid: string;
		}): Promise<SharedCloneResponse> => {
			const data = await callCloneSharedPlan(params.sharedUuid);
			await dropShared();
			await changed([PLANS, EMPIRES], data.uuid);
			return data;
		},
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
	CreateEmpire: defineMutation({
		fetchFn: async (params: {
			data: EmpirePayload;
		}): Promise<PlanEmpire> => {
			const data = await callCreateEmpire(params.data);
			await changed([EMPIRES], data.uuid);
			return data;
		},
	}),
	DeleteEmpire: defineMutation({
		fetchFn: async (params: { empireUuid: string }): Promise<void> => {
			await callDeleteEmpire(params.empireUuid);
			await changed([EMPIRES], params.empireUuid);
		},
	}),
	PatchEmpire: defineMutation({
		fetchFn: async (params: {
			empireUuid: string;
			data: EmpirePayload;
		}): Promise<EmpireSaveResponse> => {
			const data = await callPatchEmpire(params.empireUuid, params.data);
			await changed([EMPIRES], params.empireUuid);
			return data;
		},
	}),
	PatchEmpireState: defineMutation({
		fetchFn: (params: {
			empireUuid: string;
			empireState: EmpireMaterialIOState;
		}): Promise<PlanEmpire> =>
			callPatchEmpireState(params.empireUuid, params.empireState),
	}),
	PatchEmpirePlanJunctions: defineMutation({
		fetchFn: async (params: {
			junctions: PlanEmpireJunction[];
		}): Promise<PlanEmpireElement[]> => {
			const data = await callPatchEmpirePlanJunctions(params.junctions);
			// junctions change both empires and their plans
			await changed([EMPIRES, PLANS]);
			return data;
		},
	}),
	PatchEmpireCXJunctions: defineMutation({
		fetchFn: async (params: {
			junctions: CXEmpireJunction[];
		}): Promise<CX[]> => {
			const data = await callUpdateCXJunctions(params.junctions);
			await changed([EMPIRES, CXS]);
			return data;
		},
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
	CreateCX: defineMutation({
		fetchFn: async (params: { cxName: string }): Promise<CX> => {
			const data = await callCreateCX(params.cxName);
			await changed([CXS], data.uuid);
			return data;
		},
	}),
	PatchCX: defineMutation({
		fetchFn: async (params: {
			cxName: string;
			cxUuid: string;
			data: CXData;
			baseModifiedAt?: string;
		}): Promise<CX> => {
			const data = await callPatchCX(
				params.cxName,
				params.cxUuid,
				params.data,
				params.baseModifiedAt
			);
			await changed([CXS], params.cxUuid);
			usePlanningStore().setCX(data);
			return data;
		},
	}),
	DeleteCX: defineMutation({
		fetchFn: async (params: { cxUuid: string }): Promise<void> => {
			await callDeleteCX(params.cxUuid);
			await changed([CXS], params.cxUuid);
		},
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
	CreatePlan: defineMutation({
		fetchFn: async (params: {
			data: PlanCreateData;
		}): Promise<PlanSaveCreateResponse> => {
			const data = await callCreatePlan(params.data);
			await changed([PLANS, EMPIRES], data.uuid);
			return data;
		},
	}),
	PatchPlan: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			data: PlanSaveData;
		}): Promise<PlanSaveCreateResponse> => {
			const data = await callSavePlan(params.planUuid, params.data);
			await changed([PLANS, EMPIRES], params.planUuid);
			return data;
		},
	}),
	ClonePlan: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			cloneName: string;
		}): Promise<Plan> => {
			const data = await callClonePlan(params.planUuid, params.cloneName);
			await changed([EMPIRES], data.uuid, [[...PLANS, "list"]]);
			return data;
		},
	}),
	DeletePlan: defineMutation({
		fetchFn: async (params: { planUuid: string }): Promise<void> => {
			await callDeletePlan(params.planUuid);
			usePlanningStore().deletePlan(params.planUuid);
			await changed([EMPIRES], params.planUuid, [
				[...PLANS, "list"],
				[...PLANS, params.planUuid],
			]);
		},
	}),
};
