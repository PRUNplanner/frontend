// Derived, UI facing types of the raukk sourcing tool.
// The persisted contract lives in raukkSourcing.types.ts and is
// intentionally not extended here.

// Types & Interfaces
import {
	IRaukkCostBreakdown,
	IRaukkSnapshot,
	IRaukkTickerSource,
	RAUKK_SOURCE_AGGREGATE,
} from "@/features/raukk_sourcing/raukkSourcing.types";
import { IRaukkExchangePrices } from "@/features/raukk_sourcing/calculations/raukkCalculations.types";
import {
	IRaukkProducerOption,
	IRaukkSubscription,
} from "@/features/raukk_sourcing/raukkSourcingStore.types";

/** Buckets a single input ticker belongs to, a ticker can be in many */
export interface IRaukkInputBuckets {
	production: boolean;
	workforce: boolean;
	repair: boolean;
}

/** One row of the tools input table */
export interface IRaukkInputRow {
	ticker: string;
	buckets: IRaukkInputBuckets;
	/** Net production/workforce demand plus repair demand per day */
	unitsPerDay: number;
	/** Configured source, undefined falls back to the CX preference */
	source: IRaukkTickerSource | undefined;
	/** Effective price of one unit at the configured source */
	price: number;
	/** `unitsPerDay * price` */
	costPerDay: number;
	/** Set when the units are drawn from another plan */
	fromPlanUuid: string | undefined;
}

/** One row of the tools output table */
export interface IRaukkOutputRow {
	ticker: string;
	unitsPerDay: number;
	costPerUnit: number;
	breakdown: IRaukkCostBreakdown;
	/** Market sell price of one unit at the plans CX preference */
	marketPrice: number;
	/** `marketPrice - costPerUnit` */
	marginPerUnit: number;
}

/** A selectable entry of the source dropdown of one ticker */
export interface IRaukkSourceOption {
	/** Producer plan uuid or an aggregate sentinel */
	value: string | RAUKK_SOURCE_AGGREGATE;
	planName: string;
	planetNaturalId: string;
	costPerUnit: number;
	/** Daily output of the producer(s) backing this option */
	unitsPerDay: number;
	/** Share of that output this plan would draw */
	ownPct: number;
	/** Share other plans already draw, may exceed 1 */
	othersPct: number;
	stale: boolean;
	/** The consuming plan itself, e.g. own output feeding own repairs */
	self: boolean;
	aggregate: boolean;
	/** Base fraction of the producer(s) snapshot, undefined when none of
	 * them stores one yet */
	baseFraction?: number;
}

/** Everything the price resolver needs, free of store and Pinia access */
export interface IRaukkPriceResolverContext {
	/** Sourcing configuration of the consuming plan */
	sources: Record<string, IRaukkTickerSource>;
	getExchange: (ticker: string) => IRaukkExchangePrices | undefined;
	/** Plans existing CX preference price, the market default */
	getDefaultPrice: (ticker: string) => number;
	getProducers: (ticker: string) => IRaukkProducerOption[];
}

/** Input of the source dropdown option builder */
export interface IRaukkSourceOptionInput {
	ticker: string;
	consumerPlanUuid: string | undefined;
	/** Daily amount this plan would draw once the source is picked */
	prospectiveDrawPerDay: number;
	producers: IRaukkProducerOption[];
	subscriptionOf: (
		sourcePlanUuid: string,
		ticker: string
	) => IRaukkSubscription;
	/** Base fractions of the options come from the stored snapshots */
	snapshots: Record<string, IRaukkSnapshot>;
}

/** Minimal plan result shape the input table rows are built from */
export interface IRaukkInputRowSource {
	materialio: { ticker: string; delta: number }[];
	workforceMaterialIO: { ticker: string; input: number }[];
	productionMaterialIO: { ticker: string; input: number }[];
}
