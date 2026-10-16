import { computed, type Ref, ref, shallowRef, watch } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useBuildingData } from "@/database/services/useBuildingData";
import { usePlanetData } from "@/database/services/usePlanetData";
import { useCXData } from "@/features/cx/useCXData";
import { usePrice } from "@/features/cx/usePrice";
import { useMaterialIOUtil } from "@/features/planning/util/materialIO.util";
import {
	getActiveEmpire,
	usePlanContext,
} from "@/features/planning/usePlanContext";
import { usePreferences } from "@/features/preferences/usePreferences";

// Util
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { getBuildingConstructionMaterials } from "@/features/planning/engine/buildings";
import { planResultCacheKey } from "@/features/empire/empire.util";
import { priceRepairMaterials } from "@/features/repair_analysis/repairAnalysis.util";
import {
	bestDays,
	countByTicker,
	matchPlans,
	oldestBuilding,
	productionBuildings,
	repairBill,
	subtractStore,
	summarizeBuildings,
	waitingCostPerDay,
} from "@/features/fio_repair/fioRepair.util";

// Types & Interfaces
import type { IPriceBook } from "@/features/cx/priceBook";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IMaterialIOMinimal } from "@/features/planning/usePlanCalculation.types";
import type { IRepairMaterialList } from "@/features/repair_analysis/useRepairAnalysis.types";
import type {
	IFIORepairBase,
	IFIORepairCandidate,
} from "@/features/fio_repair/fioRepair.types";

/**
 * Repair status of every FIO base: targets from the matched plan's best
 * days (or the interval), the repair bill and the cost of waiting, priced
 * with the default Exchange Preference at empire level. Call load() once
 * game and planning data are there; picked plans calculate on demand.
 * @author jplacht
 *
 * @param {Ref<Plan[]>} plans User's plans
 * @param {Ref<PlanEmpireElement[]>} empires User's empires
 * @param {Ref<boolean>} usePlans Targets from matched plans
 */
export function useFIORepair(
	plans: Ref<Plan[]>,
	empires: Ref<PlanEmpireElement[]>,
	usePlans: Ref<boolean>
) {
	const planningStore = usePlanningStore();
	const { buildingsMap } = useBuildingData();
	const { getPlanet } = usePlanetData();
	const { findEmpireCXUuid } = useCXData();
	const { enhanceMaterialIOMinimal } = useMaterialIOUtil();
	const { loadGameData, createContext } = usePlanContext();
	const {
		defaultCXUuid,
		fioRepairIntervalDays,
		fioRepairDueSoonDays,
		fioRepairPlanLinks,
	} = usePreferences();

	const now = Date.now();
	const sites = computed(() =>
		Object.values(planningStore.fio_sites_planets)
	);

	/*
	 * Prices: the default Exchange Preference, no planet, so only its
	 * empire-level rules apply; a deleted preference falls back to none
	 */
	const cxUuid = computed(() =>
		defaultCXUuid.value && planningStore.cxs[defaultCXUuid.value]
			? defaultCXUuid.value
			: undefined
	);
	const { getPriceBook } = usePrice(cxUuid, ref(undefined));
	const book = shallowRef<IPriceBook>();
	let priceRun = 0;
	async function loadPrices(): Promise<void> {
		const current = ++priceRun;
		const loaded = await getPriceBook();
		if (current === priceRun) book.value = loaded;
	}

	const planets = shallowRef(new Map<string, Planet>());
	const loaded = ref(false);

	const costs = computed(() => {
		const map = planets.value;
		const cache = new Map<string, IMaterialIOMinimal[]>();
		return (planet: string, ticker: string): IMaterialIOMinimal[] => {
			const key = `${planet}#${ticker}`;
			let materials = cache.get(key);
			if (!materials) {
				const building = buildingsMap.value[ticker];
				materials = building
					? getBuildingConstructionMaterials(
							building,
							map.get(planet)
						)
					: [];
				cache.set(key, materials);
			}
			return materials;
		};
	});

	/*
	 * Plan matching and best days
	 */
	const matches = computed(() =>
		matchPlans(
			sites.value.map((s) => ({
				planet: s.PlanetIdentifier,
				siteId: s.SiteId,
				counts: countByTicker(productionBuildings(s, now)),
			})),
			plans.value,
			empires.value,
			fioRepairPlanLinks.value
		)
	);

	const keyOf = (c: IFIORepairCandidate) =>
		planResultCacheKey(
			c.plan.uuid,
			c.empire?.uuid,
			findEmpireCXUuid(c.empire?.uuid)
		);

	const best = shallowRef(new Map<string, Record<string, number>>());
	const progress = ref({ current: 0, total: 0 });
	let calcRun: Promise<void> = Promise.resolve();

	/**
	 * Calculates the matched and picked plans not calculated yet, one after
	 * the other like FIO Burn, yielding to the DOM between plans
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	function calculate(): Promise<void> {
		calcRun = calcRun
			.catch(() => {})
			.then(async () => {
				const todo = new Map<string, IFIORepairCandidate>();
				for (const m of Object.values(matches.value))
					if (m.candidate && !best.value.has(keyOf(m.candidate)))
						todo.set(keyOf(m.candidate), m.candidate);
				if (!todo.size) return;

				progress.value = { current: 0, total: todo.size };
				const gameData = await loadGameData();
				for (const [key, c] of todo) {
					const cx = findEmpireCXUuid(c.empire?.uuid);
					try {
						const ctx = await createContext(
							gameData,
							c.plan.planet_natural_id,
							cx
						);
						const { result } = calculatePlan(
							{
								plan: c.plan,
								empire: getActiveEmpire(
									c.empire?.uuid,
									empires.value
								),
								cxUuid: cx,
								recipeOptions: false,
							},
							ctx
						);
						best.value = new Map(best.value).set(
							key,
							bestDays(result, ctx.prices)
						);
					} catch (err) {
						console.error(err);
					}
					progress.value.current++;
					await new Promise((r) => setTimeout(r, 0));
				}
			});
		return calcRun;
	}

	/**
	 * Loads the bases' planets and prices, then calculates the plans
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function load(): Promise<void> {
		const map = new Map<string, Planet>();
		await Promise.all(
			sites.value.map((s) =>
				getPlanet(s.PlanetIdentifier)
					.then((p) => map.set(s.PlanetIdentifier, p))
					.catch(console.error)
			)
		);
		planets.value = map;
		await loadPrices();
		loaded.value = true;
		await calculate();
	}

	watch(cxUuid, () => {
		if (loaded.value) loadPrices().catch(console.error);
	});
	// a new pick, or a plan that matches now
	watch(matches, () => {
		if (loaded.value) calculate().catch(console.error);
	});

	const constructionCost = (
		prices: IPriceBook,
		materials: IMaterialIOMinimal[]
	) =>
		materials.reduce(
			(s, m) => s + m.input * prices.getPrice(m.ticker, "BUY"),
			0
		);

	const price = (prices: IPriceBook, bill: IMaterialIOMinimal[]) =>
		priceRepairMaterials(enhanceMaterialIOMinimal(bill), prices);

	/*
	 * Bases, most urgent first
	 */
	const bases = computed<IFIORepairBase[]>(() => {
		const prices = book.value;
		if (!prices || !loaded.value) return [];
		const costOf = costs.value;

		return sites.value
			.map((site) => {
				const planet = site.PlanetIdentifier;
				const buildings = productionBuildings(site, now);
				if (!buildings.length) return undefined;

				const match = matches.value[planet];
				const days =
					usePlans.value && match.candidate
						? best.value.get(keyOf(match.candidate))
						: undefined;
				const summary = summarizeBuildings(
					buildings,
					(t) => days?.[t] ?? fioRepairIntervalDays.value,
					fioRepairDueSoonDays.value
				);
				const oldest = oldestBuilding(buildings);
				const name = planets.value.get(planet)?.planet_name;

				return {
					planet,
					name:
						site.PlanetName ||
						(name && name !== planet ? name : planet),
					siteId: site.SiteId,
					match,
					buildings,
					...summary,
					since: oldest.days,
					wasRepaired: oldest.wasRepaired,
					condition: Math.min(...buildings.map((b) => b.condition)),
					bill: price(
						prices,
						repairBill(buildings, (t) => costOf(planet, t), 0)
					),
					waiting: waitingCostPerDay(buildings, (t) =>
						constructionCost(prices, costOf(planet, t))
					),
				};
			})
			.filter((b): b is IFIORepairBase => b !== undefined)
			.sort(
				(a, b) =>
					(a.due ?? -Infinity) - (b.due ?? -Infinity) ||
					a.name.localeCompare(b.name)
			);
	});

	/**
	 * The repair flight of a base: what to load when the ship unloads in
	 * `arrival` days, optionally less what the base store holds
	 * @author jplacht
	 *
	 * @param {IFIORepairBase} base Base
	 * @param {number} arrival Days until the ship unloads
	 * @param {boolean} useStore Subtract the base store
	 * @returns {{ load: IRepairMaterialList; fromStore: IMaterialIOMinimal[]; extra: number }}
	 * Load, what the store covers, and the extra cost vs. repairing today
	 */
	function flight(
		base: IFIORepairBase,
		arrival: number,
		useStore: boolean
	): {
		load: IRepairMaterialList;
		fromStore: IMaterialIOMinimal[];
		extra: number;
	} {
		const prices = book.value!;
		const bill = repairBill(
			base.buildings,
			(t) => costs.value(base.planet, t),
			arrival
		);
		const store: Record<string, number> = {};
		if (useStore)
			for (const item of planningStore.fio_storage_planets[base.planet]
				?.StorageItems ?? [])
				store[item.MaterialTicker] =
					(store[item.MaterialTicker] ?? 0) + item.MaterialAmount;
		const { load, fromStore } = subtractStore(bill, store);
		return {
			load: price(prices, load),
			fromStore,
			extra: price(prices, bill).cost - base.bill.cost,
		};
	}

	return {
		bases,
		progress,
		load,
		flight,
	};
}
