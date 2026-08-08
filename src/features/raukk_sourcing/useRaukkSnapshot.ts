import { computed, ComputedRef, ref, Ref, watch } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";
import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

// Composables
import { usePrice } from "@/features/cx/usePrice";
import { useExchangeData } from "@/database/services/useExchangeData";

// Calculations
import { calculateTrueCosts } from "@/features/raukk_sourcing/calculations/trueCost";
import { calculateRepairCostPerDay } from "@/features/raukk_sourcing/calculations/repairCapitalCost";
import {
	buildInputRows,
	buildSourceOptions,
	createRaukkPriceResolver,
	resolveCxExchangeCode,
	splitAggregateDraws,
} from "@/features/raukk_sourcing/raukkSourcingPricing";

// Util
import { inertClone } from "@/util/data";

// Types & Interfaces
import { ICXData } from "@/stores/planningStore.types";
import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import {
	IRaukkPlanConfig,
	IRaukkSnapshot,
} from "@/features/raukk_sourcing/raukkSourcing.types";
import {
	IRaukkExchangePrices,
	IRaukkPriceResolver,
	IRaukkRepairBuilding,
	IRaukkRepairCost,
	IRaukkTrueCostResult,
} from "@/features/raukk_sourcing/calculations/raukkCalculations.types";
import { IRaukkProducerOption } from "@/features/raukk_sourcing/raukkSourcingStore.types";
import {
	IRaukkInputRow,
	IRaukkOutputRow,
	IRaukkSourceOption,
} from "@/features/raukk_sourcing/raukkSourcingUi.types";

/** Reactive plan context the snapshot computation runs against */
export interface IRaukkSnapshotContext {
	planUuid: Ref<string | undefined>;
	planName: Ref<string>;
	planetNaturalId: Ref<string | undefined>;
	cxUuid: Ref<string | undefined>;
	planResult: Ref<IPlanResult>;
}

/**
 * Everything the sourcing tool needs to price, display and freeze one
 * plans true output costs.
 *
 * Prices are pulled asynchronously and cached in local state, the actual
 * cost math stays synchronous: `calculateTrueCosts` gets a resolver that
 * only reads that cache, the plans sourcing configuration and the stored
 * snapshots of the producing plans.
 *
 * Nothing is written to the store until `computeSnapshot` is called, the
 * displayed numbers are always live while the stored snapshot stays the
 * frozen value other plans consume.
 *
 * @author raukk
 *
 * @param {IRaukkSnapshotContext} context Plan Context
 * @returns Sourcing tool state and actions
 */
export async function useRaukkSnapshot(context: IRaukkSnapshotContext) {
	const planningStore = usePlanningStore();
	const sourcingStore = useRaukkSourcingStore();

	const { getPrice } = await usePrice(
		context.cxUuid,
		context.planetNaturalId
	);
	const { getExchangeTicker } = await useExchangeData();

	// price caches, filled by refreshPrices
	const defaultPrices: Ref<Record<string, number>> = ref({});
	const sellPrices: Ref<Record<string, number>> = ref({});
	const exchangePrices: Ref<Record<string, IRaukkExchangePrices>> = ref({});

	const config: ComputedRef<IRaukkPlanConfig> = computed(() =>
		sourcingStore.getConfig(context.planUuid.value ?? "")
	);

	const cxData: ComputedRef<ICXData | undefined> = computed(() => {
		if (!context.cxUuid.value) return undefined;

		try {
			return planningStore.getCX(context.cxUuid.value).cx_data;
		} catch {
			return undefined;
		}
	});

	/**
	 * Producers of a ticker, without the plan itself. Same planet self
	 * consumption is already netted by the material I/O, a plan must
	 * never draw from its own snapshot.
	 */
	function getProducers(ticker: string): IRaukkProducerOption[] {
		return sourcingStore
			.producersOf(ticker)
			.filter((producer) => producer.planUuid !== context.planUuid.value);
	}

	const resolver: ComputedRef<IRaukkPriceResolver> = computed(() =>
		createRaukkPriceResolver({
			sources: config.value.sources,
			getExchange: (ticker: string) => exchangePrices.value[ticker],
			getDefaultPrice: (ticker: string) =>
				defaultPrices.value[ticker] ?? 0,
			getProducers,
		})
	);

	const repairBuildings: ComputedRef<IRaukkRepairBuilding[]> = computed(() =>
		context.planResult.value.production.buildings.map((building) => ({
			name: building.name,
			amount: building.amount,
			constructionMaterials: building.constructionMaterials,
		}))
	);

	const repairCost: ComputedRef<IRaukkRepairCost> = computed(() =>
		calculateRepairCostPerDay(
			repairBuildings.value,
			config.value.repairDay,
			(ticker: string) => resolver.value(ticker).price
		)
	);

	const trueCost: ComputedRef<IRaukkTrueCostResult> = computed(() =>
		calculateTrueCosts({
			planResult: context.planResult.value,
			repairCostPerDayByBuilding: repairCost.value.perBuilding,
			repairMaterialUnitsPerDay: repairCost.value.materialUnitsPerDay,
			resolveInputPrice: resolver.value,
		})
	);

	const inputRows: ComputedRef<IRaukkInputRow[]> = computed(() =>
		buildInputRows(
			context.planResult.value,
			repairCost.value.materialUnitsPerDay,
			config.value.sources,
			resolver.value
		)
	);

	const outputRows: ComputedRef<IRaukkOutputRow[]> = computed(() =>
		Object.values(trueCost.value.outputs)
			.map((output) => {
				const marketPrice: number =
					sellPrices.value[output.ticker] ?? 0;

				return {
					ticker: output.ticker,
					unitsPerDay: output.unitsPerDay,
					costPerUnit: output.costPerUnit,
					breakdown: output.breakdown,
					marketPrice,
					marginPerUnit: marketPrice - output.costPerUnit,
				};
			})
			.sort((a, b) => b.unitsPerDay - a.unitsPerDay)
	);

	/** Stored snapshot of this plan, undefined until first computation */
	const snapshot: ComputedRef<IRaukkSnapshot | undefined> = computed(() =>
		context.planUuid.value
			? sourcingStore.snapshots[context.planUuid.value]
			: undefined
	);

	/** Producers the current configuration draws from */
	const usedSources: ComputedRef<IRaukkProducerOption[]> = computed(() => {
		const seen: Set<string> = new Set();
		const result: IRaukkProducerOption[] = [];

		Object.entries(config.value.sources).forEach(([ticker, source]) => {
			if (source.mode !== "plan") return;

			getProducers(ticker)
				.filter(
					(producer) =>
						source.sourcePlanUuid === "AGG_AVG" ||
						source.sourcePlanUuid === "AGG_MAX" ||
						source.sourcePlanUuid === producer.planUuid
				)
				.forEach((producer) => {
					if (seen.has(producer.planUuid)) return;

					seen.add(producer.planUuid);
					result.push(producer);
				});
		});

		return result;
	});

	/** Upstream snapshots feeding this plan that are flagged stale */
	const staleSources: ComputedRef<IRaukkProducerOption[]> = computed(() =>
		usedSources.value.filter((producer) => producer.stale)
	);

	/**
	 * Source dropdown entries of one ticker.
	 *
	 * @author raukk
	 *
	 * @param {string} ticker Material Ticker
	 * @param {number} prospectiveDrawPerDay Daily need of this plan
	 * @returns {IRaukkSourceOption[]} Dropdown Options
	 */
	function sourceOptions(
		ticker: string,
		prospectiveDrawPerDay: number
	): IRaukkSourceOption[] {
		return buildSourceOptions({
			ticker,
			consumerPlanUuid: context.planUuid.value,
			prospectiveDrawPerDay,
			producers: getProducers(ticker),
			subscriptionOf: sourcingStore.subscription,
			configs: sourcingStore.configs,
			snapshots: sourcingStore.snapshots,
		});
	}

	/** All tickers the tool needs prices for */
	const relevantTickers: ComputedRef<string[]> = computed(() => {
		const tickers: Set<string> = new Set();

		context.planResult.value.materialio.forEach((element) =>
			tickers.add(element.ticker)
		);
		context.planResult.value.production.buildings.forEach((building) =>
			building.constructionMaterials.forEach((material) =>
				tickers.add(material.ticker)
			)
		);

		return Array.from(tickers).sort();
	});

	const isRefreshing: Ref<boolean> = ref(false);

	/**
	 * Reloads CX preference prices, sell prices and exchange data of all
	 * relevant tickers into the local caches.
	 *
	 * A ticker that fails to price degrades to 0 with a console warning
	 * instead of rejecting the whole refresh: `usePrice` already resolves
	 * unknown materials and missing exchange data to 0, so one broken
	 * ticker must not take the tools numbers down with it. The refreshing
	 * flag is always reset, even when something throws.
	 *
	 * @author raukk
	 */
	async function refreshPrices(): Promise<void> {
		isRefreshing.value = true;

		const exchangeCode: string = resolveCxExchangeCode(
			cxData.value,
			context.planetNaturalId.value
		);

		const buy: Record<string, number> = {};
		const sell: Record<string, number> = {};
		const exchange: Record<string, IRaukkExchangePrices> = {};

		try {
			await Promise.all(
				relevantTickers.value.map(async (ticker) => {
					try {
						buy[ticker] = await getPrice(ticker, "BUY");
						sell[ticker] = await getPrice(ticker, "SELL");
					} catch (error) {
						buy[ticker] = 0;
						sell[ticker] = 0;

						console.warn(
							`[raukk] price of '${ticker}' unavailable, using 0`,
							error
						);
					}

					try {
						exchange[ticker] = await getExchangeTicker(
							`${ticker}.${exchangeCode}`
						);
					} catch {
						// thinly traded or unknown exchange, price modes
						// resolve to 0 as usePrice does as well
					}
				})
			);

			defaultPrices.value = buy;
			sellPrices.value = sell;
			exchangePrices.value = exchange;
		} finally {
			isRefreshing.value = false;
		}
	}

	/**
	 * Computes and stores this plans snapshot.
	 *
	 * Aggregate draws are pre split into concrete producer uuids before
	 * storing, the persisted `draws` keys are always plan uuids.
	 *
	 * @author raukk
	 *
	 * @returns {Promise<boolean>} Snapshot was stored
	 */
	async function computeSnapshot(): Promise<boolean> {
		const planUuid: string | undefined = context.planUuid.value;
		if (!planUuid) return false;

		await refreshPrices();

		const result: IRaukkTrueCostResult = trueCost.value;

		sourcingStore.setSnapshot(planUuid, {
			computedAt: new Date().toISOString(),
			stale: false,
			planName: context.planName.value,
			planetNaturalId: context.planetNaturalId.value ?? "",
			outputs: inertClone(result.outputs),
			draws: splitAggregateDraws(result.draws, getProducers),
			config: inertClone(config.value),
		});

		return true;
	}

	watch(
		() => relevantTickers.value.join("#"),
		async () => await refreshPrices()
	);

	await refreshPrices();

	return {
		config,
		inputRows,
		outputRows,
		repairCost,
		snapshot,
		staleSources,
		isRefreshing,
		sourceOptions,
		refreshPrices,
		computeSnapshot,
	};
}
