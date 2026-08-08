// Pure pricing and option helpers of the raukk sourcing tool.
// No store, Pinia or Vue access: every function takes plain data so the
// logic stays unit testable in isolation.

// Calculation Utils
import { resolveMarketPrice } from "@/features/raukk_sourcing/calculations/priceMode";

// Types & Interfaces
import { ICXData } from "@/stores/planningStore.types";
import {
	IRaukkOutputCost,
	IRaukkSnapshot,
	IRaukkTickerSource,
	RAUKK_SOURCE_AGGREGATE,
} from "@/features/raukk_sourcing/raukkSourcing.types";
import {
	IRaukkMaterialUnits,
	IRaukkPriceResolver,
	IRaukkResolvedPrice,
} from "@/features/raukk_sourcing/calculations/raukkCalculations.types";
import { IRaukkProducerOption } from "@/features/raukk_sourcing/raukkSourcingStore.types";
import {
	IRaukkInputBuckets,
	IRaukkInputRow,
	IRaukkInputRowSource,
	IRaukkPriceResolverContext,
	IRaukkSourceOption,
	IRaukkSourceOptionInput,
} from "@/features/raukk_sourcing/raukkSourcingUi.types";

/** Exchange used for market modes when no CX preference resolves */
const DEFAULT_EXCHANGE_CODE: string = "UNIVERSE";

/**
 * Narrows a stored source value to one of the aggregate sentinels.
 *
 * @author raukk
 *
 * @param {string} value Stored source value
 * @returns {boolean} Value is an aggregate sentinel
 */
export function isAggregateSource(
	value: string
): value is RAUKK_SOURCE_AGGREGATE {
	return value === "AGG_AVG" || value === "AGG_MAX";
}

/**
 * Price of an aggregate source over a set of producers.
 *
 * `AGG_AVG` is the output weighted average of the producers transfer
 * prices, `AGG_MAX` the highest one. Producers without any output fall
 * back to a plain average so a snapshot with zero units still prices.
 *
 * @author raukk
 *
 * @param {IRaukkProducerOption[]} producers Producing Plans
 * @param {RAUKK_SOURCE_AGGREGATE} aggregate Aggregate Kind
 * @returns {number} Unit price
 */
export function aggregateProducerPrice(
	producers: IRaukkProducerOption[],
	aggregate: RAUKK_SOURCE_AGGREGATE
): number {
	if (producers.length === 0) return 0;

	if (aggregate === "AGG_MAX")
		return producers.reduce(
			(max, producer) => Math.max(max, producer.costPerUnit),
			producers[0].costPerUnit
		);

	const unitsTotal: number = producers.reduce(
		(sum, producer) => sum + producer.unitsPerDay,
		0
	);

	if (unitsTotal <= 0)
		return (
			producers.reduce((sum, producer) => sum + producer.costPerUnit, 0) /
			producers.length
		);

	return (
		producers.reduce(
			(sum, producer) =>
				sum + producer.costPerUnit * producer.unitsPerDay,
			0
		) / unitsTotal
	);
}

/**
 * Builds the price resolver `calculateTrueCosts` consumes.
 *
 * Resolution order per ticker:
 *  - no configuration entry: the plans existing CX preference price,
 *    matching the behavior of the untouched plan calculation
 *  - `{ mode: "market" }`: exchange data at the configured price mode
 *  - `{ mode: "plan" }`: the source snapshots `costPerUnit`, reported
 *    with its plan uuid so the daily units land in `draws`
 *
 * Aggregates report the sentinel itself as `fromPlanUuid`, their draws
 * are pre split into concrete uuids afterwards by
 * {@link splitAggregateDraws}. A configured source whose snapshot
 * vanished silently falls back to the market default, an edge to a plan
 * that no longer produces the ticker must not book a draw.
 *
 * @author raukk
 *
 * @param {IRaukkPriceResolverContext} context Resolver Context
 * @returns {IRaukkPriceResolver} Price Resolver
 */
export function createRaukkPriceResolver(
	context: IRaukkPriceResolverContext
): IRaukkPriceResolver {
	return (ticker: string): IRaukkResolvedPrice => {
		const source: IRaukkTickerSource | undefined = context.sources[ticker];

		if (source === undefined)
			return { price: context.getDefaultPrice(ticker) };

		if (source.mode === "market")
			return {
				price: resolveMarketPrice(
					context.getExchange(ticker),
					source.priceMode
				),
			};

		const producers: IRaukkProducerOption[] = context.getProducers(ticker);

		if (isAggregateSource(source.sourcePlanUuid)) {
			if (producers.length === 0)
				return { price: context.getDefaultPrice(ticker) };

			return {
				price: aggregateProducerPrice(producers, source.sourcePlanUuid),
				fromPlanUuid: source.sourcePlanUuid,
			};
		}

		const producer: IRaukkProducerOption | undefined = producers.find(
			(p) => p.planUuid === source.sourcePlanUuid
		);

		if (!producer) return { price: context.getDefaultPrice(ticker) };

		return {
			price: producer.costPerUnit,
			fromPlanUuid: producer.planUuid,
		};
	};
}

/**
 * Replaces aggregate draw keys with concrete producer plan uuids.
 *
 * Both aggregates draw from the whole producer pool, they only differ in
 * the price the consumer charges itself (weighted average versus worst
 * case). The drawn amount is therefore split proportional to the
 * producers daily output, evenly when none of them produces anything.
 * Persisted `draws` keys are always concrete plan uuids.
 *
 * @author raukk
 *
 * @param {Record<string, IRaukkMaterialUnits>} draws Raw draws
 * @param {(ticker: string) => IRaukkProducerOption[]} getProducers Lookup
 * @returns {Record<string, IRaukkMaterialUnits>} Concrete draws
 */
export function splitAggregateDraws(
	draws: Record<string, IRaukkMaterialUnits>,
	getProducers: (ticker: string) => IRaukkProducerOption[]
): Record<string, IRaukkMaterialUnits> {
	const result: Record<string, IRaukkMaterialUnits> = {};

	function book(planUuid: string, ticker: string, units: number): void {
		if (units === 0) return;

		const planDraws: IRaukkMaterialUnits = result[planUuid] ?? {};
		planDraws[ticker] = (planDraws[ticker] ?? 0) + units;
		result[planUuid] = planDraws;
	}

	Object.entries(draws).forEach(([key, tickers]) => {
		if (!isAggregateSource(key)) {
			Object.entries(tickers).forEach(([ticker, units]) =>
				book(key, ticker, units)
			);
			return;
		}

		Object.entries(tickers).forEach(([ticker, units]) => {
			const producers: IRaukkProducerOption[] = getProducers(ticker);
			if (producers.length === 0) return;

			const unitsTotal: number = producers.reduce(
				(sum, producer) => sum + producer.unitsPerDay,
				0
			);

			producers.forEach((producer) => {
				const share: number =
					unitsTotal > 0
						? producer.unitsPerDay / unitsTotal
						: 1 / producers.length;

				book(producer.planUuid, ticker, units * share);
			});
		});
	});

	return result;
}

/**
 * Builds the source dropdown entries of one ticker.
 *
 * Every plan whose snapshot holds the ticker as an output becomes an
 * entry, the consuming plan itself included: its repair demand never
 * shows up in the netted material I/O, feeding own repairs from own
 * output is therefore a legitimate edge. Supply loops are allowed —
 * frozen snapshot pricing never recurses, looping values settle over
 * repeated recomputes. The synthetic aggregates are appended as soon as
 * two or more producers exist.
 *
 * `ownPct` is this plans prospective draw, `othersPct` everything other
 * plans already draw from the stored edges; the consumers own stored
 * draw is removed from that so it is not counted twice. Both may exceed
 * 1, oversubscription is allowed by design.
 *
 * @author raukk
 *
 * @param {IRaukkSourceOptionInput} input Option Input
 * @returns {IRaukkSourceOption[]} Dropdown Options
 */
export function buildSourceOptions(
	input: IRaukkSourceOptionInput
): IRaukkSourceOption[] {
	const producers: IRaukkProducerOption[] = input.producers;

	if (producers.length === 0) return [];

	function othersOf(producer: IRaukkProducerOption): number {
		const subscription = input.subscriptionOf(
			producer.planUuid,
			input.ticker
		);

		const own: number =
			input.consumerPlanUuid === undefined
				? 0
				: (subscription.byPlan.find(
						(entry) => entry.planUuid === input.consumerPlanUuid
					)?.unitsPerDay ?? 0);

		return subscription.totalDrawnPerDay - own;
	}

	function baseFractionOf(
		producer: IRaukkProducerOption
	): number | undefined {
		return input.snapshots[producer.planUuid]?.baseFraction;
	}

	const options: IRaukkSourceOption[] = producers.map((producer) => {
		const others: number = othersOf(producer);

		return {
			value: producer.planUuid,
			planName: producer.planName,
			planetNaturalId: producer.planetNaturalId,
			costPerUnit: producer.costPerUnit,
			unitsPerDay: producer.unitsPerDay,
			ownPct:
				producer.unitsPerDay > 0
					? input.prospectiveDrawPerDay / producer.unitsPerDay
					: 0,
			othersPct:
				producer.unitsPerDay > 0 ? others / producer.unitsPerDay : 0,
			stale: producer.stale,
			self: producer.planUuid === input.consumerPlanUuid,
			aggregate: false,
			baseFraction: baseFractionOf(producer),
		};
	});

	if (producers.length < 2) return options;

	const unitsTotal: number = producers.reduce(
		(sum, producer) => sum + producer.unitsPerDay,
		0
	);
	const othersTotal: number = producers.reduce(
		(sum, producer) => sum + othersOf(producer),
		0
	);
	/**
	 * Base fraction of an aggregate option: the output weighted average
	 * of the producers for `AGG_AVG`, the base fraction of the producer
	 * `AGG_MAX` prices against for the worst case. Producers without a
	 * stored base fraction count as their own base alone, the aggregate
	 * stays undefined while none of them stores one at all.
	 */
	function aggregateBaseFraction(
		aggregate: RAUKK_SOURCE_AGGREGATE
	): number | undefined {
		if (
			producers.every(
				(producer) => baseFractionOf(producer) === undefined
			)
		)
			return undefined;

		if (aggregate === "AGG_MAX") {
			const worst: IRaukkProducerOption = producers.reduce(
				(max, producer) =>
					producer.costPerUnit > max.costPerUnit ? producer : max,
				producers[0]
			);

			return baseFractionOf(worst) ?? 1;
		}

		if (unitsTotal <= 0)
			return (
				producers.reduce(
					(sum, producer) => sum + (baseFractionOf(producer) ?? 1),
					0
				) / producers.length
			);

		return (
			producers.reduce(
				(sum, producer) =>
					sum +
					(baseFractionOf(producer) ?? 1) * producer.unitsPerDay,
				0
			) / unitsTotal
		);
	}

	const stale: boolean = producers.some((producer) => producer.stale);

	(["AGG_AVG", "AGG_MAX"] as RAUKK_SOURCE_AGGREGATE[]).forEach(
		(aggregate) => {
			options.push({
				value: aggregate,
				planName: aggregate,
				planetNaturalId: "",
				costPerUnit: aggregateProducerPrice(producers, aggregate),
				unitsPerDay: unitsTotal,
				ownPct:
					unitsTotal > 0
						? input.prospectiveDrawPerDay / unitsTotal
						: 0,
				othersPct: unitsTotal > 0 ? othersTotal / unitsTotal : 0,
				stale,
				self: false,
				aggregate: true,
				baseFraction: aggregateBaseFraction(aggregate),
			});
		}
	);

	return options;
}

/**
 * Largest relative `costPerUnit` difference between two output sets.
 *
 * Convergence measure of the loop settling iterations: recomputing a
 * plan that is part of a supply loop (own repairs included) shifts its
 * output costs a little each pass, once the largest relative shift
 * drops below a threshold the loop has settled. Tickers appearing in
 * only one of the two sets count as a full shift of 1, both sides
 * being zero counts as no shift.
 *
 * @author raukk
 *
 * @param {Record<string, IRaukkOutputCost>} before Previous outputs
 * @param {Record<string, IRaukkOutputCost>} after Current outputs
 * @returns {number} Largest relative cost per unit change, >= 0
 */
export function maxRelativeOutputDelta(
	before: Record<string, IRaukkOutputCost>,
	after: Record<string, IRaukkOutputCost>
): number {
	const tickers: Set<string> = new Set([
		...Object.keys(before),
		...Object.keys(after),
	]);

	let max: number = 0;

	tickers.forEach((ticker) => {
		const previous: IRaukkOutputCost | undefined = before[ticker];
		const current: IRaukkOutputCost | undefined = after[ticker];

		if (!previous || !current) {
			max = Math.max(max, 1);
			return;
		}

		const reference: number = Math.max(
			Math.abs(previous.costPerUnit),
			Math.abs(current.costPerUnit)
		);

		if (reference === 0) return;

		max = Math.max(
			max,
			Math.abs(current.costPerUnit - previous.costPerUnit) / reference
		);
	});

	return max;
}

/** Relative difference below which two snapshot numbers count equal */
const RAUKK_SNAPSHOT_EQUAL_EPSILON: number = 1e-9;

/**
 * Relative difference of two numbers against the larger magnitude,
 * 0 when both are 0.
 */
function relativeDelta(previous: number, current: number): number {
	const reference: number = Math.max(
		Math.abs(previous),
		Math.abs(current)
	);

	if (reference === 0) return 0;

	return Math.abs(current - previous) / reference;
}

/**
 * Determines if a freshly computed snapshot differs materially from the
 * stored one, in anything downstream plans consume: output costs and
 * daily units, and the draws held against other plans.
 *
 * Backs the stores conditional staleness cascade: the automatic
 * snapshot upkeep recomputes on every plan view load, an unchanged
 * result must not flag the whole downstream chain stale.
 *
 * @author raukk
 *
 * @param {IRaukkSnapshot} previous Stored Snapshot
 * @param {IRaukkSnapshot} next Fresh Snapshot
 * @returns {boolean} Downstream relevant numbers changed
 */
export function snapshotMateriallyChanged(
	previous: IRaukkSnapshot,
	next: IRaukkSnapshot
): boolean {
	const outputTickers: Set<string> = new Set([
		...Object.keys(previous.outputs),
		...Object.keys(next.outputs),
	]);

	for (const ticker of outputTickers) {
		const previousOutput: IRaukkOutputCost | undefined =
			previous.outputs[ticker];
		const nextOutput: IRaukkOutputCost | undefined = next.outputs[ticker];

		if (!previousOutput || !nextOutput) return true;

		if (
			relativeDelta(previousOutput.costPerUnit, nextOutput.costPerUnit) >=
				RAUKK_SNAPSHOT_EQUAL_EPSILON ||
			relativeDelta(previousOutput.unitsPerDay, nextOutput.unitsPerDay) >=
				RAUKK_SNAPSHOT_EQUAL_EPSILON
		)
			return true;
	}

	const drawPlans: Set<string> = new Set([
		...Object.keys(previous.draws),
		...Object.keys(next.draws),
	]);

	for (const planUuid of drawPlans) {
		const previousDraws: IRaukkMaterialUnits = previous.draws[planUuid] ?? {};
		const nextDraws: IRaukkMaterialUnits = next.draws[planUuid] ?? {};

		const drawTickers: Set<string> = new Set([
			...Object.keys(previousDraws),
			...Object.keys(nextDraws),
		]);

		for (const ticker of drawTickers) {
			if (
				relativeDelta(
					previousDraws[ticker] ?? 0,
					nextDraws[ticker] ?? 0
				) >= RAUKK_SNAPSHOT_EQUAL_EPSILON
			)
				return true;
		}
	}

	return false;
}

/**
 * Formats a source dropdown label.
 *
 * Aggregates and the plan itself carry their translated name in
 * `planName` and no planet, other concrete producers render as
 * "Plan (Planet)". Producers whose snapshot already stores a base
 * fraction append it as "— BF 1.50", it is the quickest hint that a
 * source ties up more than its own base.
 *
 * @author raukk
 *
 * @param {IRaukkSourceOption} option Dropdown Option
 * @param {(value: number) => string} formatValue Number formatter
 * @param {{ yours: string; others: string }} words Translated words
 * @returns {string} Label
 */
export function formatSourceOptionLabel(
	option: IRaukkSourceOption,
	formatValue: (value: number) => string,
	words: { yours: string; others: string }
): string {
	const name: string =
		option.aggregate || option.self
			? option.planName
			: `${option.planName} (${option.planetNaturalId})`;

	const own: string = `${formatValue(option.ownPct * 100)}% ${words.yours}`;
	const others: string = `${formatValue(
		option.othersPct * 100
	)}% ${words.others}`;

	const baseFraction: string =
		option.baseFraction === undefined
			? ""
			: ` — BF ${formatValue(option.baseFraction)}`;

	return `${name} — ${formatValue(
		option.costPerUnit
	)} ȼ/u — ${own} / ${others}${baseFraction}`;
}

/**
 * Builds the priced rows of the input table.
 *
 * Rows are the union of the plans net input tickers (`delta < 0` of the
 * netted material I/O) and the repair material demand; repair materials
 * are sourcable tickers as well and never show up in the material I/O.
 * A ticker can belong to several buckets at once, its daily need is the
 * sum over all of them, matching what the true cost rollup charges.
 *
 * @author raukk
 *
 * @param {IRaukkInputRowSource} planResult Plan Result
 * @param {IRaukkMaterialUnits} repairUnitsPerDay Repair demand per day
 * @param {Record<string, IRaukkTickerSource>} sources Plan sources
 * @param {IRaukkPriceResolver} resolve Price Resolver
 * @returns {IRaukkInputRow[]} Priced input rows
 */
export function buildInputRows(
	planResult: IRaukkInputRowSource,
	repairUnitsPerDay: IRaukkMaterialUnits,
	sources: Record<string, IRaukkTickerSource>,
	resolve: IRaukkPriceResolver
): IRaukkInputRow[] {
	const units: IRaukkMaterialUnits = {};
	const buckets: Record<string, IRaukkInputBuckets> = {};

	function bucketOf(ticker: string): IRaukkInputBuckets {
		const current: IRaukkInputBuckets = buckets[ticker] ?? {
			production: false,
			workforce: false,
			repair: false,
		};
		buckets[ticker] = current;
		return current;
	}

	planResult.materialio.forEach((element) => {
		if (element.delta >= 0) return;

		units[element.ticker] =
			(units[element.ticker] ?? 0) + element.delta * -1;

		const bucket: IRaukkInputBuckets = bucketOf(element.ticker);

		bucket.workforce = planResult.workforceMaterialIO.some(
			(e) => e.ticker === element.ticker && e.input > 0
		);
		bucket.production = planResult.productionMaterialIO.some(
			(e) => e.ticker === element.ticker && e.input > 0
		);
	});

	Object.entries(repairUnitsPerDay).forEach(([ticker, unitsPerDay]) => {
		if (unitsPerDay <= 0) return;

		units[ticker] = (units[ticker] ?? 0) + unitsPerDay;
		bucketOf(ticker).repair = true;
	});

	return Object.entries(units)
		.map(([ticker, unitsPerDay]) => {
			const resolved: IRaukkResolvedPrice = resolve(ticker);

			return {
				ticker,
				buckets: bucketOf(ticker),
				unitsPerDay,
				source: sources[ticker],
				price: resolved.price,
				costPerDay: unitsPerDay * resolved.price,
				fromPlanUuid: resolved.fromPlanUuid,
			};
		})
		.sort((a, b) => b.costPerDay - a.costPerDay);
}

/**
 * Exchange code the market price modes read from.
 *
 * Mirrors the exchange preference hierarchy of
 * `src/features/cx/usePrice.ts`: a planet exchange preference wins over
 * the empire one, everything else falls back to the universe average
 * data. Ticker level preferences are fixed prices without bid/ask and
 * therefore no exchange.
 *
 * @author raukk
 *
 * @param {ICXData | undefined} cxData CX Data
 * @param {string | undefined} planetNaturalId Planet Natural Id
 * @returns {string} Exchange Code, e.g. "AI1"
 */
export function resolveCxExchangeCode(
	cxData: ICXData | undefined,
	planetNaturalId: string | undefined
): string {
	if (!cxData) return DEFAULT_EXCHANGE_CODE;

	const planetPreference = planetNaturalId
		? cxData.cx_planets
				.find((entry) => entry.planet === planetNaturalId)
				?.preferences.find(
					(preference) =>
						preference.type === "BUY" || preference.type === "BOTH"
				)
		: undefined;

	const preference =
		planetPreference ??
		cxData.cx_empire.find(
			(entry) => entry.type === "BUY" || entry.type === "BOTH"
		);

	if (!preference) return DEFAULT_EXCHANGE_CODE;

	return preference.exchange.split("_")[0];
}
