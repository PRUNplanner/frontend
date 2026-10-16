import {
	computed,
	onScopeDispose,
	ref,
	shallowRef,
	watch,
	type Ref,
} from "vue";
import { debounce } from "lodash-es";

// Composables
import { useQuery } from "@/lib/query_cache/useQuery";
import {
	getActiveEmpire,
	usePlanContext,
} from "@/features/planning/usePlanContext";
import { useExchangeData } from "@/database/services/useExchangeData";

// Engine
import { createPriceBook, type IPriceBook } from "@/features/cx/priceBook";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";

// Util
import { deepClone } from "@/util/data";
import {
	calculateMaterialCOGMs,
	priceMaterials,
	toPlanBase,
} from "@/features/exchanges/exchangePlanData.util";

// Types & Interfaces
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IExchangePlanBase } from "@/features/exchanges/useExchangePlanData.types";

// unsaved edits re-price after this pause
const REPRICE_DEBOUNCE_MS = 250;

interface IExchangePlanDataSource {
	plans: () => Plan[];
	empires: () => PlanEmpireElement[];
	cx: () => CX | undefined;
	// the rules as edited, unsaved included
	cxData: () => CXData | undefined;
	// also the plans of empires that don't use the preference
	includeOthers: () => boolean;
}

/**
 * The plans an Exchanges page prices: every plan of every empire using
 * the preference, calculated once with the plan engine, and their prices
 * and COGMs from the edited rules. Edits re-price without recalculating.
 */
export function useExchangePlanData(source: IExchangePlanDataSource) {
	const { loadGameData, createContext } = usePlanContext();
	const { getExchangeTickerLoaded } = useExchangeData();

	const bases = shallowRef<IExchangePlanBase[]>([]);
	const isCalculating: Ref<boolean> = ref(false);
	const progressCurrent: Ref<number> = ref(0);
	const progressTotal: Ref<number> = ref(0);

	// each plan once: linked ones in the first empire using the preference
	const planList = computed(() => {
		const cx = source.cx();
		const list: { uuid: string; empireUuid: string; linked: boolean }[] =
			[];
		const seen = new Set<string>();
		const add = (uuid: string, empireUuid: string, linked: boolean) => {
			if (seen.has(uuid)) return;
			seen.add(uuid);
			list.push({ uuid, empireUuid, linked });
		};

		const linkedEmpires = new Set(cx?.empires.map((e) => e.uuid));
		cx?.empires.forEach((e) =>
			e.plans.forEach((p) => add(p.uuid, e.uuid, true))
		);
		if (source.includeOthers())
			source
				.empires()
				.filter((e) => !linkedEmpires.has(e.uuid))
				.forEach((e) => e.plans.forEach((p) => add(p.uuid, e.uuid, false)));
		return list;
	});

	// price-free, so neither CX nor edits are part of the key
	const cache = new Map<string, IExchangePlanBase>();
	let run = 0;

	async function calculate(): Promise<void> {
		const current = ++run;
		const plans = new Map(source.plans().map((p) => [p.uuid, p]));
		const empires = source.empires();
		const todo = planList.value.filter((p) => plans.has(p.uuid));

		isCalculating.value = true;
		progressTotal.value = todo.length;
		progressCurrent.value = 0;

		try {
			// a direct visit may have no game data cached yet, and the page's
			// own loaders may still be fetching: wait for everything the
			// engine reads. Cached queries, a no-op once loaded.
			const planets = [
				...new Set(todo.map((i) => plans.get(i.uuid)!.planet_natural_id)),
			].sort();
			const loads: Promise<unknown>[] = [
				useQuery("GetMaterials").execute(),
				useQuery("GetExchanges").execute(),
				useQuery("GetBuildings").execute(),
				useQuery("GetRecipes").execute(),
			];
			if (planets.length)
				loads.push(
					useQuery("GetMultiplePlanets", {
						planetNaturalIds: planets,
					}).execute()
				);
			// one failed load only costs the plans that need it
			await Promise.all(loads.map((l) => l.catch(console.error)));

			const gameData = await loadGameData();
			const result: IExchangePlanBase[] = [];

			for (const item of todo) {
				if (current !== run) return;
				const plan = plans.get(item.uuid)!;
				const empire = getActiveEmpire(item.empireUuid, empires);
				const key = [
					plan.uuid,
					plan.modified_at,
					item.empireUuid,
					empires.find((e) => e.uuid === item.empireUuid)?.modified_at,
				].join("#");

				let base = cache.get(key);
				if (!base) {
					try {
						const calculation = calculatePlan(
							{
								plan,
								empire,
								cxUuid: undefined,
								recipeOptions: false,
							},
							await createContext(
								gameData,
								plan.planet_natural_id,
								undefined
							)
						);
						base = toPlanBase(
							{
								planUuid: plan.uuid,
								planName: plan.plan_name ?? "",
								planet: plan.planet_natural_id,
								empireUuid: item.empireUuid,
								linked: item.linked,
							},
							calculation
						);
						cache.set(key, base);
						// yield back to Vue so the page stays usable
						await new Promise((r) => setTimeout(r, 0));
					} catch (err) {
						// e.g. its planet failed to load: skip this plan only
						console.error(err);
					}
				}
				if (base) result.push({ ...base, linked: item.linked });
				progressCurrent.value++;
			}

			if (current === run) bases.value = result;
		} catch (err) {
			// e.g. game data missing: keep what was shown
			console.error(err);
		} finally {
			if (current === run) isCalculating.value = false;
		}
	}

	watch(
		() => [
			planList.value,
			source.plans().map((p) => `${p.uuid}#${p.modified_at}`),
			source.empires().map((e) => `${e.uuid}#${e.modified_at}`),
		],
		() => void calculate(),
		{ immediate: true, deep: true }
	);
	onScopeDispose(() => run++);

	// the edited rules, debounced; a copy, edits may mutate in place
	const snapshot = () => {
		const data = source.cxData();
		return data ? deepClone(data) : undefined;
	};
	const pricedData = shallowRef<CXData | undefined>(snapshot());
	const updatePriced = debounce(
		() => (pricedData.value = snapshot()),
		REPRICE_DEBOUNCE_MS
	);
	watch(source.cxData, updatePriced, { deep: true });
	onScopeDispose(() => updatePriced.cancel());

	/**
	 * A price book for a planet from given CX data
	 *
	 * @param {string} planet Planet natural id
	 * @param {CXData | undefined} cxData CX data, undefined for Universe
	 * @returns {IPriceBook} Price book
	 */
	function priceBookFor(
		planet: string | undefined,
		cxData: CXData | undefined
	): IPriceBook {
		return createPriceBook(
			cxData ? () => cxData : undefined,
			planet,
			getExchangeTickerLoaded
		);
	}

	// one book per planet and priced state
	const books = computed(() => {
		const data = pricedData.value;
		const byPlanet = new Map<string, IPriceBook>();
		return (planet: string) => {
			let book = byPlanet.get(planet);
			if (!book) {
				book = priceBookFor(planet, data);
				byPlanet.set(planet, book);
			}
			return book;
		};
	});

	const materialRows = computed(() =>
		priceMaterials(bases.value, books.value)
	);

	const linkedBases = computed(() => bases.value.filter((b) => b.linked));

	// COGM from the linked plans only
	const materialCOGMs = computed(() =>
		calculateMaterialCOGMs(linkedBases.value, books.value)
	);

	/**
	 * Materials one planet's plans buy or sell, priced
	 *
	 * @param {string} planet Planet natural id
	 * @returns Rows of that planet
	 */
	function planetMaterialRows(planet: string) {
		return priceMaterials(
			bases.value.filter((b) => b.planet === planet),
			books.value
		);
	}

	return {
		bases,
		isCalculating,
		progressCurrent,
		progressTotal,
		pricedData,
		materialRows,
		materialCOGMs,
		planetMaterialRows,
		priceBookFor,
		bookForPlanet: books,
	};
}
