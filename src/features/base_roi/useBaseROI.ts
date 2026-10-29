import { computed, ref, shallowRef, type Ref } from "vue";

// API
import { useQuery } from "@/lib/query_cache/useQuery";
import { measured } from "@/lib/query_cache/queries/queries.util";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { usePlanContext } from "@/features/planning/usePlanContext";
import { usePathfinder } from "@/features/pathfinding/usePathfinder";
import { useExchangeData } from "@/database/services/useExchangeData";
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Unit
import {
	calculateBase,
	planetCandidates,
	recipeCandidates,
	toRowInput,
} from "@/features/base_roi/baseROIRows";
import {
	calculateMetrics,
	filterRows,
	hqStepCost,
} from "@/features/base_roi/baseROIMetrics";
import { getExchangeCodeKey } from "@/features/cx/priceBook";

// Static
import {
	BASE_ROI_EXCHANGES,
	CHUNK_SIZE,
	STANDARD_PLANET,
} from "@/features/base_roi/baseROI.constants";

// Types & Interfaces
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type {
	BaseROIStep,
	IBaseROICandidate,
	IBaseROIRow,
	IBaseROIRowInput,
	IBaseROISeries,
} from "@/features/base_roi/baseROI.types";
import type {
	IGameData,
	IPlanContext,
} from "@/features/planning/engine/engine.types";
import type { Planet } from "@/features/api/schemas/gameData.schemas";

type EngineSettings = Pick<
	BaseROISettings,
	"cogc" | "experts" | "bufferDays" | "maxJumps"
>;

/** gives the browser a turn: scheduler.yield where it exists */
function yieldToBrowser(): Promise<void> {
	const s = (
		globalThis as { scheduler?: { yield?: () => Promise<void> } }
	).scheduler;
	if (s?.yield) return s.yield();
	return new Promise((r) => setTimeout(r, 0));
}

/**
 * Base ROI: every row's engine numbers, calculated on request (the page
 * asks when a setting the engine reads changes: COGC, experts, buffer, max
 * jumps, CX preference), and their metrics and filters, recomputed without
 * the engine for every other setting
 * @author jplacht
 *
 * @param {Ref<BaseROISettings>} settings Settings
 * @param {Ref<string | undefined>} cxUuid CX preference
 */
export function useBaseROI(
	settings: Ref<BaseROISettings>,
	cxUuid: Ref<string | undefined>
) {
	const { loadGameData, createPrices } = usePlanContext();
	const { getExchangeTickerLoaded } = useExchangeData();
	const { getJumpsFrom, systemidAI1, systemidCI1, systemidIC1, systemidNC1 } =
		usePathfinder();
	const planningStore = usePlanningStore();

	const systems: Record<string, string> = {
		AI1: systemidAI1,
		CI1: systemidCI1,
		IC1: systemidIC1,
		NC1: systemidNC1,
	};

	const inputs = shallowRef<IBaseROIRowInput[]>([]);
	const beyond = shallowRef<IBaseROICandidate[]>([]);
	// the engine settings the inputs were calculated with
	const calculatedWith = shallowRef<EngineSettings | null>(null);
	const step = ref<BaseROIStep>("idle");
	const progress = ref({ current: 0, total: 0 });
	// recipe rows are in, planet rows still calculating (first load)
	const planetRowsPending = ref(false);
	const firstLoad = ref(true);

	const series = shallowRef<IBaseROISeries | null>(null);
	const historyFailed = ref(false);

	// planets fetched on this page, never fetched twice
	const planets = new Map<string, Planet>();
	let gameData: IGameData | undefined;
	let run = 0;

	/** the exchanges the CX preference prices from, all four without one */
	function preferenceExchanges(): string[] {
		const codes = new Set<string>();
		if (cxUuid.value) {
			const data = planningStore.getCX(cxUuid.value).cx_data;
			for (const p of [
				...data.cx_empire,
				...data.cx_planets.flatMap((cp) => cp.preferences),
			])
				codes.add(getExchangeCodeKey(p.exchange).exchangeCode);
		}
		const known = BASE_ROI_EXCHANGES.filter((e) => codes.has(e));
		return known.length ? known : [...BASE_ROI_EXCHANGES];
	}

	/** jumps to the nearest of the preference's exchanges, -1 = no route */
	function jumpsOf(): (systemId: string) => number {
		const maps = preferenceExchanges().map((e) => getJumpsFrom(systems[e]));
		return (systemId) => {
			let best = -1;
			for (const m of maps) {
				const j = m.get(systemId);
				if (j !== undefined && (best < 0 || j < best)) best = j;
			}
			return best;
		};
	}

	const hqCost = computed(() => {
		const prices = createPrices(STANDARD_PLANET.planet_natural_id, cxUuid.value);
		return hqStepCost(settings.value.targetPermit, (t) =>
			prices.getPrice(t, "BUY")
		);
	});

	const rows = computed<IBaseROIRow[]>(() => {
		const s = settings.value;
		const experts = calculatedWith.value?.experts ?? s.experts;
		return inputs.value.map((input) => ({
			...input,
			metrics: calculateMetrics(input, { ...s, experts }, hqCost.value),
		}));
	});

	const filtered = computed(() =>
		filterRows(rows.value, beyond.value, settings.value)
	);

	/** fetches the planets the rows need and hasn't fetched yet */
	async function fetchPlanets(
		candidates: IBaseROICandidate[]
	): Promise<void> {
		const ids = [
			...new Set(candidates.map((c) => c.planetNaturalId!)),
		].filter((id) => !planets.has(id));
		if (!ids.length) return;

		const fertile = new Set(
			candidates.filter((c) => c.kind === "farming").map((c) => c.planetNaturalId!)
		);
		if ([...fertile].some((id) => !planets.has(id))) {
			const found: Planet[] = await useQuery("PostPlanetSearch", {
				searchData: {
					materials: [],
					cogc_programs: [],
					environment_rocky: true,
					environment_gaseous: true,
					environment_low_gravity: true,
					environment_high_gravity: true,
					environment_low_pressure: true,
					environment_high_pressure: true,
					environment_low_temperature: true,
					environment_high_temperature: true,
					must_be_fertile: true,
					must_have_localmarket: false,
					must_have_chamberofcommerce: false,
					must_have_warehouse: false,
					must_have_administrationcenter: false,
					must_have_shipyard: false,
				},
			}).execute();
			found.forEach((p) => planets.set(p.planet_natural_id, p));
		}

		const rest = ids.filter((id) => !planets.has(id));
		if (rest.length)
			(
				await useQuery("GetMultiplePlanets", {
					planetNaturalIds: rest,
				}).execute()
			).forEach((p) => planets.set(p.planet_natural_id, p));
	}

	/** engine numbers for candidates in chunks; null when a newer run took over */
	async function calculateRows(
		candidates: IBaseROICandidate[],
		contextOf: (c: IBaseROICandidate) => IPlanContext | undefined,
		engine: EngineSettings,
		id: number
	): Promise<IBaseROIRowInput[] | null> {
		const out: IBaseROIRowInput[] = [];
		for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
			for (const c of candidates.slice(i, i + CHUNK_SIZE)) {
				const ctx = contextOf(c);
				if (!ctx) continue;
				try {
					out.push(
						toRowInput(
							c,
							calculateBase(c, ctx, engine, cxUuid.value),
							ctx,
							getExchangeTickerLoaded
						)
					);
				} catch (error) {
					// a recipe the engine can't run is no row
					console.error(error);
				}
			}
			progress.value.current += Math.min(CHUNK_SIZE, candidates.length - i);
			await yieldToBrowser();
			if (id !== run) return null;
		}
		return out;
	}

	/**
	 * Calculates every row; a newer call stops the running one between two
	 * chunks. On the first load recipe rows show first and planet rows are
	 * merged in once.
	 *
	 * @returns {Promise<boolean>} Whether this run finished
	 */
	async function calculate(): Promise<boolean> {
		const id = ++run;
		try {
			return await calculateRun(id);
		} catch (error) {
			// a failed request: keep what is shown, say so, stop waiting
			console.error(error);
			if (id === run) {
				step.value = "error";
				planetRowsPending.value = false;
			}
			return false;
		}
	}

	async function calculateRun(id: number): Promise<boolean> {
		const start = performance.now();
		const s = settings.value;
		const engine: EngineSettings = {
			cogc: s.cogc,
			experts: s.experts,
			bufferDays: s.bufferDays,
			maxJumps: s.maxJumps,
		};
		const times: Record<string, number> = {};

		step.value = "game";
		progress.value = { current: 0, total: 0 };
		gameData ??= await loadGameData();
		if (id !== run) return false;

		const indexPromise = measured("base-roi:index", () =>
			useQuery("GetPlanetSearchIndex").execute()
		);
		// a run stopped before it awaits the index must not leave it unhandled
		indexPromise.catch(() => undefined);

		// recipe rows: the standard planet, no fetch
		const recipes = recipeCandidates(gameData);
		const standard: IPlanContext = {
			...gameData,
			planet: STANDARD_PLANET,
			prices: createPrices(STANDARD_PLANET.planet_natural_id, cxUuid.value),
		};
		step.value = "recipes";
		progress.value = { current: 0, total: recipes.length };
		const [recipeRows, recipeMs] = await measured(
			"base-roi:recipe-rows",
			() => calculateRows(recipes, () => standard, engine, id)
		);
		times.recipes = recipeMs;
		if (!recipeRows) return false;

		if (firstLoad.value) {
			inputs.value = recipeRows;
			calculatedWith.value = engine;
			planetRowsPending.value = true;
			performance.measure("base-roi:first-rows", { start });
		}

		// planet rows within max jumps
		step.value = "planets";
		const [index, indexMs] = await indexPromise;
		times.index = indexMs;
		if (id !== run) return false;
		const { within, beyond: far } = planetCandidates(
			index,
			gameData,
			jumpsOf(),
			engine.maxJumps
		);
		const [, planetsMs] = await measured("base-roi:planets", () =>
			fetchPlanets(within)
		);
		times.planets = planetsMs;
		if (id !== run) return false;

		step.value = "calculating";
		progress.value = { current: 0, total: within.length };
		const contexts = new Map<string, IPlanContext>();
		const [planetRows, planetRowsMs] = await measured(
			"base-roi:planet-rows",
			() =>
				calculateRows(
					within,
					(c) => {
						const planet = planets.get(c.planetNaturalId!);
						if (!planet) return undefined;
						let ctx = contexts.get(planet.planet_natural_id);
						if (!ctx) {
							ctx = {
								...gameData!,
								planet,
								prices: createPrices(
									planet.planet_natural_id,
									cxUuid.value
								),
							};
							contexts.set(planet.planet_natural_id, ctx);
						}
						return ctx;
					},
					engine,
					id
				)
		);
		times.planetRows = planetRowsMs;
		if (!planetRows) return false;

		inputs.value = [...recipeRows, ...planetRows];
		beyond.value = far;
		calculatedWith.value = engine;
		planetRowsPending.value = false;
		firstLoad.value = false;
		step.value = "done";
		performance.measure("base-roi:table", { start });

		if (import.meta.env.DEV)
			console.info(
				`[base-roi] ${inputs.value.length} rows in ${Math.round(performance.now() - start)} ms`,
				times
			);
		trackEvent("tool:use", { tool_name: "base_roi" });
		void loadHistory(id);
		return true;
	}

	/** daily VWAP of the last 30 days for every exchange a price uses */
	async function loadHistory(id: number): Promise<void> {
		const exchanges = new Set<string>();
		for (const row of inputs.value)
			for (const m of row.materials)
				if (
					m.source.exchange &&
					(BASE_ROI_EXCHANGES as readonly string[]).includes(
						m.source.exchange
					)
				)
					exchanges.add(m.source.exchange);

		historyFailed.value = false;
		try {
			const [loaded] = await measured("base-roi:history", () =>
				Promise.all(
					[...exchanges].map((exchange) =>
						useQuery("GetCXSparklines", {
							exchange,
							days: 30,
							metric: "vwap_daily",
						}).execute()
					)
				)
			);
			if (id !== run) return;
			series.value = Object.fromEntries(
				loaded.map((l) => [l.exchange, l.series])
			);
		} catch {
			if (id === run) historyFailed.value = true;
		}
	}

	/**
	 * One recipe row on a real planet: one planet fetch (query cache) and
	 * one engine pass, the table row stays as it is
	 *
	 * @param {IBaseROIRowInput} row Recipe row
	 * @param {string} planetNaturalId Planet
	 * @returns {Promise<IBaseROIRow>} The row on that planet
	 */
	async function tryOnPlanet(
		row: IBaseROIRowInput,
		planetNaturalId: string
	): Promise<IBaseROIRow> {
		gameData ??= await loadGameData();
		const planet: Planet = await useQuery("GetPlanet", {
			planetNaturalId,
		}).execute();
		const ctx: IPlanContext = {
			...gameData,
			planet,
			prices: createPrices(planetNaturalId, cxUuid.value),
		};
		const engine = calculatedWith.value ?? settings.value;
		const jumps = jumpsOf()(planet.system_id);
		const input: IBaseROIRowInput = {
			...toRowInput(
				row,
				calculateBase(row, ctx, engine, cxUuid.value),
				ctx,
				getExchangeTickerLoaded
			),
			planetNaturalId,
			planetName: planet.planet_name,
			jumps: jumps >= 0 ? jumps : null,
		};
		return {
			...input,
			metrics: calculateMetrics(
				input,
				{ ...settings.value, experts: engine.experts },
				hqCost.value
			),
		};
	}

	return {
		calculate,
		preferenceExchanges,
		tryOnPlanet,
		rows,
		filtered,
		step,
		progress,
		planetRowsPending,
		firstLoad,
		series,
		historyFailed,
	};
}
