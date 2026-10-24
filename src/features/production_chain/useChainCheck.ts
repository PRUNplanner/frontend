import {
	computed,
	onScopeDispose,
	ref,
	shallowRef,
	toRaw,
	watch,
	type ComputedRef,
	type Ref,
	type ShallowRef,
} from "vue";
import { useRoute, useRouter, type LocationQuery } from "vue-router";

// API
import { useQuery } from "@/lib/query_cache/useQuery";

// Composables
import {
	getActiveEmpire,
	usePlanContext,
} from "@/features/planning/usePlanContext";
import { useExchangeData } from "@/database/services/useExchangeData";
import { useCXData } from "@/features/cx/useCXData";
import { usePreferences } from "@/features/preferences/usePreferences";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { groupRecipesByOutput } from "@/features/production_chain/engine/chainSolver";
import { extractionOptions } from "@/features/production_chain/engine/chainExtraction";
import {
	baseLetter,
	checkEmpire,
	tryInPlanner,
} from "@/features/production_chain/engine/chainCheck";
import { encodeChain } from "@/features/production_chain/engine/chainUrl";
import { RESOURCE_MATERIAL_OPTIONS } from "@/features/resource_roi_overview/resourceROIOverview.constants";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { ProductionChainAction } from "@/lib/analytics/useAnalytics.types";
import type { IChainContext } from "@/features/production_chain/engine/chainSolver.types";
import type {
	ICheckFinding,
	ICheckPlan,
	ICheckResult,
} from "@/features/production_chain/engine/chainCheck.types";

const TRACK_DELAY_MS = 1000;
export const DEFAULT_MIN = 200;
export const DEFAULT_PAYBACK = 100;
const TICKER = /^[A-Z0-9]{1,3}$/;
const RESOURCES: ReadonlySet<string> = new Set(
	RESOURCE_MATERIAL_OPTIONS.map((o) => o.value)
);

/** what the check link holds */
export interface ICheckState {
	empire: string | undefined;
	targets: string[];
	min: number;
	setup: boolean;
	payback: number;
	/** step key (base:building:material) → planet id */
	picks: Record<string, string>;
}

type IQueryValue = LocationQuery[string];

const first = (v: IQueryValue): string | undefined =>
	(Array.isArray(v) ? v[0] : v) ?? undefined;

const number = (v: IQueryValue, fallback: number): number => {
	const n = Number(first(v));
	return first(v) !== undefined && Number.isFinite(n) && n >= 0 ? n : fallback;
};

/**
 * The check from URL query values; broken values fall back to the defaults
 * @author jplacht
 *
 * @param {LocationQuery} query Query
 * @returns {ICheckState} Check state
 */
export function decodeCheck(query: LocationQuery): ICheckState {
	const picks: Record<string, string> = {};
	for (const part of (first(query.loc) ?? "").split(",")) {
		const bits = part.split(":");
		if (bits.length === 4 && bits.every(Boolean))
			picks[bits.slice(0, 3).join(":")] = bits[3];
	}
	return {
		empire: first(query.empire) || undefined,
		targets: [
			...new Set(
				(first(query.t) ?? "").split(",").filter((t) => TICKER.test(t))
			),
		],
		min: number(query.min, DEFAULT_MIN),
		setup: first(query.setup) !== "0",
		payback: number(query.pay, DEFAULT_PAYBACK),
		picks,
	};
}

/**
 * A check as URL query values, defaults left out
 * @author jplacht
 *
 * @param {ICheckState} state Check state
 * @returns {Record<string, string>} Query
 */
export function encodeCheck(state: ICheckState): Record<string, string> {
	const query: Record<string, string> = { mode: "check" };
	if (state.empire) query.empire = state.empire;
	if (state.targets.length) query.t = state.targets.join(",");
	if (state.min !== DEFAULT_MIN) query.min = String(state.min);
	if (!state.setup) query.setup = "0";
	if (state.payback !== DEFAULT_PAYBACK) query.pay = String(state.payback);
	const loc = Object.entries(state.picks).map(([k, p]) => `${k}:${p}`);
	if (loc.length) query.loc = loc.join(",");
	return query;
}

/**
 * Check an empire: the user's empires, the chosen empire's plans through
 * the plan engine, the planet index, and the check of its chains. The
 * state lives in the URL.
 * @author jplacht
 */
export function useChainCheck() {
	const route = useRoute();
	const router = useRouter();
	const { getGameData, loadGameData, createPrices, createContext } =
		usePlanContext();
	const { getExchangeTickerLoaded } = useExchangeData();
	const { findEmpireCXUuid } = useCXData();
	const { defaultEmpireUuid } = usePreferences();

	const state: Ref<ICheckState> = ref(decodeCheck(route.query));
	const cxUuid: Ref<string | undefined> = ref(undefined);

	const empires: Ref<PlanEmpireElement[] | null> = ref(null);
	const plans: ShallowRef<ICheckPlan[] | null> = shallowRef(null);
	const index: ShallowRef<PlanetSearchIndexEntry[] | null> = shallowRef(null);
	const loading: Ref<boolean> = ref(true);
	const error: Ref<boolean> = ref(false);

	/** the link's empire isn't one of the user's */
	const notYours = computed(
		() =>
			!!empires.value &&
			!!state.value.empire &&
			!empires.value.some((e) => e.uuid === state.value.empire)
	);
	const empire = computed(() =>
		empires.value?.find((e) => e.uuid === state.value.empire)
	);

	async function loadEmpires(): Promise<void> {
		const list = await useQuery("GetAllEmpires").execute();
		empires.value = list;
		if (!state.value.empire && list.length)
			state.value = {
				...state.value,
				empire:
					list.find((e) => e.uuid === defaultEmpireUuid.value)?.uuid ??
					list[0].uuid,
			};
	}

	async function loadIndex(): Promise<void> {
		if (index.value) return;
		// a cache hit returns the query store's reactive copy
		index.value = toRaw(await useQuery("GetPlanetSearchIndex").execute());
	}

	/** every plan of the empire through the plan engine, at the check's CX */
	async function loadPlans(uuid: string, cx: string | undefined) {
		const list = await useQuery("GetEmpirePlans", {
			empireUuid: uuid,
		}).execute();
		const ids = [...new Set(list.map((p) => p.planet_natural_id))];
		if (ids.length)
			await useQuery("GetMultiplePlanets", {
				planetNaturalIds: ids,
			}).execute();
		const gameData = await loadGameData();
		const sorted = [...list].sort(
			(a, b) =>
				a.plan_name.localeCompare(b.plan_name) || a.uuid.localeCompare(b.uuid)
		);
		const out: ICheckPlan[] = [];
		for (const [i, plan] of sorted.entries()) {
			const context = await createContext(
				gameData,
				plan.planet_natural_id,
				cx
			);
			const calculation = calculatePlan(
				{
					plan,
					empire: getActiveEmpire(uuid, empires.value ?? undefined),
					cxUuid: cx,
					recipeOptions: false,
				},
				context
			);
			out.push({
				id: baseLetter(i),
				uuid: plan.uuid,
				name: plan.plan_name,
				planetId: plan.planet_natural_id,
				cogc: plan.plan_cogc,
				result: calculation.result,
				profit: calculation.overview.profit,
			});
		}
		return out;
	}

	let run = 0;
	async function load(): Promise<void> {
		const mine = ++run;
		loading.value = true;
		error.value = false;
		try {
			if (!empires.value) await loadEmpires();
			// picking the default empire started a load of its own
			if (mine !== run) return;
			const uuid = state.value.empire;
			if (!uuid || notYours.value) {
				plans.value = null;
				return;
			}
			const [list] = await Promise.all([
				loadPlans(uuid, cxUuid.value),
				loadIndex(),
			]);
			if (mine === run) plans.value = list;
		} catch {
			if (mine === run) error.value = true;
		} finally {
			if (mine === run) loading.value = false;
		}
	}

	// a new empire starts at its own CX preference
	watch(
		() => state.value.empire,
		(uuid) => (cxUuid.value = uuid ? findEmpireCXUuid(uuid) : undefined),
		{ immediate: true }
	);
	// one load per empire and CX, also when both change at once
	watch([() => state.value.empire, cxUuid], () => load(), {
		immediate: true,
	});

	const gameData = computed(() => getGameData());
	const recipesByOutput = computed(() =>
		groupRecipesByOutput(
			Object.values(gameData.value.recipesByBuilding).flat()
		)
	);
	const extraction = computed(() =>
		index.value ? extractionOptions(index.value) : undefined
	);
	const planets = computed(() =>
		index.value
			? new Map(index.value.map((p) => [p.planet_natural_id, p]))
			: undefined
	);
	// COGC programs are checked against the time the page opened
	const now = Date.now();

	const ctx: ComputedRef<IChainContext> = computed(() => ({
		recipesByOutput: recipesByOutput.value,
		buildings: gameData.value.buildings,
		materials: gameData.value.materials,
		prices: createPrices("", cxUuid.value),
		getExchange: getExchangeTickerLoaded,
		resources: RESOURCES,
		extraction: extraction.value,
		planets: planets.value,
		now,
	}));

	const result: ComputedRef<ICheckResult | null> = computed(() =>
		plans.value
			? checkEmpire(
					{
						plans: plans.value,
						targets: state.value.targets,
						min: state.value.min,
						setup: state.value.setup,
						payback: state.value.payback,
						picks: state.value.picks,
					},
					ctx.value
				)
			: null
	);

	watch(
		state,
		(value) => router.replace({ query: encodeCheck(value) }),
		{ deep: true }
	);

	// tool:use for a changed check with chains, not for the one the page opened with
	let trackTimer: ReturnType<typeof setTimeout> | undefined;
	watch(
		() => [
			state.value.targets.join(),
			state.value.min,
			state.value.setup,
			state.value.payback,
			state.value.empire,
		],
		() => {
			clearTimeout(trackTimer);
			trackTimer = setTimeout(() => {
				const r = result.value;
				if (!r || !state.value.targets.length) return;
				trackEvent("tool:use", {
					tool_name: "production_chain",
					mode: "check",
					target_count: state.value.targets.length,
					bases_checked: r.totals.checked,
					bases_optimal: r.totals.optimal,
					finding_count: r.findings.length,
				});
			}, TRACK_DELAY_MS);
		}
	);
	onScopeDispose(() => clearTimeout(trackTimer));

	function track(action: ProductionChainAction): void {
		trackEvent("production_chain:action", { action });
	}

	function patch(p: Partial<ICheckState>): void {
		state.value = { ...state.value, ...p };
	}

	function setEmpire(uuid: string): void {
		patch({ empire: uuid, picks: {} });
	}

	function setTargets(targets: string[]): void {
		patch({ targets: [...new Set(targets)] });
	}

	function addAll(): void {
		setTargets([
			...state.value.targets,
			...(result.value?.sold.map((s) => s.ticker) ?? []),
		]);
		track("check_add_all");
	}

	function setSetup(setup: boolean): void {
		patch({ setup });
		track("check_setup_toggle");
	}

	/** a planet for a step; undefined goes back to the suggestion */
	function setPick(key: string, planetId: string | undefined): void {
		const picks = { ...state.value.picks };
		if (planetId) picks[key] = planetId;
		else delete picks[key];
		patch({ picks });
	}

	/** opens Plan a chain with the finding's change */
	function tryFinding(finding: ICheckFinding): void {
		const r = result.value;
		const input = r && tryInPlanner(r, finding);
		if (!input) return;
		track("check_try");
		router.push({
			name: "production-chain",
			query: encodeChain({ input, cx: cxUuid.value }),
		});
	}

	/** the check as a link, for sharing */
	function checkLink(): string {
		const { href } = router.resolve({
			name: "production-chain",
			query: encodeCheck(state.value),
		});
		return new URL(href, window.location.origin).toString();
	}

	return {
		state,
		cxUuid,
		empires,
		empire,
		notYours,
		plans,
		loading,
		error,
		ctx,
		result,
		load,
		setEmpire,
		setTargets,
		addAll,
		setSetup,
		patch,
		setPick,
		tryFinding,
		checkLink,
		track,
	};
}
