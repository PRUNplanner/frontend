// Stores
import { useQueryStore } from "@/lib/query_cache/queryStore";
import { usePlanningStore } from "@/stores/planningStore";

// Util
import { broadcastChange } from "@/lib/crossTab";
import { onSessionReset } from "@/lib/sessionReset";
import { isSubset, toCacheKey } from "@/lib/query_cache/cacheKeys";
import {
	defineMutation,
	defineQuery,
	staleMinutes,
} from "@/lib/query_cache/queries/queries.util";

// API Calls
import {
	callClonePlan,
	callActivatePlanVersion,
	callClonePlanVersion,
	callCreatePlan,
	callDeletePlan,
	callDeletePlanDraft,
	callDeletePlanVersion,
	callGetPlan,
	callGetPlanDraft,
	callGetPlanlist,
	callGetPlanVersion,
	callGetPlanVersions,
	callGetShared,
	callRenamePlanVersion,
	callSavePlan,
	callSavePlanDraft,
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
	PlanDraft,
	PlanDraftSaveData,
	PlanEmpire,
	PlanSaveCreateResponse,
	PlanSaveData,
	PlanShare,
	PlanVersion,
	PlanVersionListItem,
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
	// false: only the other tabs invalidate it, this one has it already
	local: boolean;
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
	const local = keys.filter((k) => k.local);
	// a key a local prefix covers would be dropped twice (two refetches)
	for (const k of local)
		if (!local.some((o) => o !== k && !o.exact && isSubset(o.key, k.key)))
			await queryStore.invalidateKey(k.key, { exact: k.exact });
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
 * @param {JSONValue[]} [remote=[]] Key prefixes only the other tabs invalidate
 */
async function changed(
	prefixes: JSONValue[],
	uuid?: string,
	exact: JSONValue[] = [],
	remote: JSONValue[] = []
): Promise<void> {
	const keys: IChangedKey[] = [
		...prefixes.map((key) => ({ key, exact: false, local: true })),
		...exact.map((key) => ({ key, exact: true, local: true })),
		...remote.map((key) => ({ key, exact: false, local: false })),
	];
	const uuids = uuid ? [uuid] : [];
	if (!batch) return flush(keys, uuids);

	keys.forEach((k) => {
		const id = `${k.exact}:${toCacheKey(k.key)}`;
		// invalidated here as soon as one change needs it
		if (!batch!.keys.get(id)?.local) batch!.keys.set(id, k);
	});
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

// the saving tab's version list (the plan page always shows it): 1 s
// after a save, at least 3 s after the last refresh, and a refresh still
// waiting covers the saves meanwhile. So at most 4 per 10 s, under the
// fetch budget of 5 with the page load's fetch
const VERSIONS_DELAY_MS = 1000;
const VERSIONS_GAP_MS = 3000;
const versionRefresh = new Map<
	string,
	{ timer?: ReturnType<typeof setTimeout>; last: number }
>();
onSessionReset(() => {
	versionRefresh.forEach((s) => clearTimeout(s.timer));
	versionRefresh.clear();
});

/**
 * Invalidates a plan's version list (it refetches) soon, throttled
 *
 * @param {string} planUuid Saved plan
 */
function refreshVersionsSoon(planUuid: string): void {
	const state = versionRefresh.get(planUuid) ?? { last: -Infinity };
	versionRefresh.set(planUuid, state);
	if (state.timer) return;

	const delay = Math.max(
		VERSIONS_DELAY_MS,
		state.last + VERSIONS_GAP_MS - Date.now()
	);
	state.timer = setTimeout(() => {
		state.timer = undefined;
		state.last = Date.now();
		void useQueryStore().invalidateKey([...PLANS, planUuid, "versions"], {
			exact: true,
		});
	}, delay);
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
		}): Promise<Plan> => {
			const queryStore = useQueryStore();
			const planningStore = usePlanningStore();
			const key = [...PLANS, params.planUuid];
			const nameBefore: string | undefined =
				planningStore.plans[params.planUuid]?.plan_name ??
				queryStore.peekQueryState<unknown, Plan>(key)?.data?.plan_name;

			const data = await callSavePlan(params.planUuid, params.data);

			// the answer is the saved plan: this tab doesn't fetch it again
			planningStore.setPlan(data);
			queryStore.addCacheState(
				"GetPlan",
				{ planUuid: params.planUuid },
				data,
				true
			);

			// the empire list holds only the plans' names and planets
			const renamed =
				nameBefore === undefined || data.plan_name !== nameBefore;
			await changed(
				[[...EMPIRES, "plans"]],
				params.planUuid,
				[
					[...PLANS, "list"],
					...(renamed ? [[...EMPIRES, "list"]] : []),
				],
				// other tabs reload the plan and its versions
				[key]
			);
			refreshVersionsSoon(params.planUuid);
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

	// Plan versions: under the plan key, so a save (PatchPlan) refreshes them
	GetPlanVersions: defineQuery({
		key: (params) => [...PLANS, params.planUuid, "versions"],
		// the save control shows the active version: refetch after a save
		autoRefetch: true,
		fetchFn: async (params: {
			planUuid: string;
		}): Promise<PlanVersionListItem[]> =>
			callGetPlanVersions(params.planUuid),
	}),
	// a version never changes, only its name (not part of the snapshot)
	GetPlanVersion: defineQuery({
		key: (params) => [
			...PLANS,
			params.planUuid,
			"version",
			params.versionUuid,
		],
		fetchFn: async (params: {
			planUuid: string;
			versionUuid: string;
		}): Promise<PlanVersion> =>
			callGetPlanVersion(params.planUuid, params.versionUuid),
	}),
	RenamePlanVersion: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			versionUuid: string;
			name: string;
		}): Promise<PlanVersionListItem> => {
			const data = await callRenamePlanVersion(
				params.planUuid,
				params.versionUuid,
				params.name
			);
			await changed([], undefined, [
				[...PLANS, params.planUuid, "versions"],
			]);
			return data;
		},
	}),
	ClonePlanVersion: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			versionUuid: string;
		}): Promise<Plan> => {
			const data = await callClonePlanVersion(
				params.planUuid,
				params.versionUuid
			);
			await changed([EMPIRES], data.uuid, [[...PLANS, "list"]]);
			return data;
		},
	}),
	// writes the plan as a save does: other tabs follow through remoteChange
	ActivatePlanVersion: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			versionUuid: string;
			draftUpdatedAt: string | null;
		}): Promise<Plan> => {
			const data = await callActivatePlanVersion(
				params.planUuid,
				params.versionUuid,
				params.draftUpdatedAt
			);
			usePlanningStore().setPlan(data);
			await changed([PLANS, EMPIRES], params.planUuid);
			return data;
		},
	}),
	DeletePlanVersion: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			versionUuid: string;
		}): Promise<void> => {
			await callDeletePlanVersion(params.planUuid, params.versionUuid);
			await changed([], undefined, [
				[...PLANS, params.planUuid, "versions"],
			]);
		},
	}),
	// Drafts: never cached, read fresh every time; writes invalidate nothing
	GetPlanDraft: defineQuery({
		key: (params) => ["planningdata", "plan_draft", params.planUuid],
		cache: false,
		fetchFn: async (params: {
			planUuid: string;
		}): Promise<PlanDraft | null> => callGetPlanDraft(params.planUuid),
	}),
	SavePlanDraft: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			data: PlanDraftSaveData;
		}): Promise<string> => callSavePlanDraft(params.planUuid, params.data),
	}),
	DeletePlanDraft: defineMutation({
		fetchFn: async (params: {
			planUuid: string;
			draftUpdatedAt: string;
		}): Promise<void> =>
			callDeletePlanDraft(params.planUuid, params.draftUpdatedAt),
	}),
};
