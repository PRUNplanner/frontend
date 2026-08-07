import { describe, it, expect } from "vitest";

// Functions
import {
	aggregateProducerPrice,
	buildInputRows,
	buildSourceOptions,
	createRaukkPriceResolver,
	formatSourceOptionLabel,
	isAggregateSource,
	resolveCxExchangeCode,
	splitAggregateDraws,
} from "@/features/raukk_sourcing/raukkSourcingPricing";

// Types & Interfaces
import { ICXData } from "@/stores/planningStore.types";
import { IRaukkTickerSource } from "@/features/raukk_sourcing/raukkSourcing.types";
import { IRaukkProducerOption } from "@/features/raukk_sourcing/raukkSourcingStore.types";
import {
	IRaukkInputRowSource,
	IRaukkSourceOption,
} from "@/features/raukk_sourcing/raukkSourcingUi.types";

function producer(
	planUuid: string,
	costPerUnit: number,
	unitsPerDay: number,
	stale: boolean = false
): IRaukkProducerOption {
	return {
		planUuid,
		planName: `Plan ${planUuid}`,
		planetNaturalId: "OT-580b",
		costPerUnit,
		unitsPerDay,
		stale,
		computedAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("Raukk Sourcing Pricing", () => {
	describe("isAggregateSource", () => {
		it("narrows the sentinels", () => {
			expect(isAggregateSource("AGG_AVG")).toBe(true);
			expect(isAggregateSource("AGG_MAX")).toBe(true);
			expect(isAggregateSource("uuid-1")).toBe(false);
		});
	});

	describe("aggregateProducerPrice", () => {
		const producers: IRaukkProducerOption[] = [
			producer("a", 10, 100),
			producer("b", 20, 300),
		];

		it("weights the average by daily output", () => {
			// (10 * 100 + 20 * 300) / 400
			expect(aggregateProducerPrice(producers, "AGG_AVG")).toBe(17.5);
		});

		it("takes the highest cost producer", () => {
			expect(aggregateProducerPrice(producers, "AGG_MAX")).toBe(20);
		});

		it("falls back to a plain average without any output", () => {
			expect(
				aggregateProducerPrice(
					[producer("a", 10, 0), producer("b", 30, 0)],
					"AGG_AVG"
				)
			).toBe(20);
		});

		it("is 0 without producers", () => {
			expect(aggregateProducerPrice([], "AGG_AVG")).toBe(0);
			expect(aggregateProducerPrice([], "AGG_MAX")).toBe(0);
		});
	});

	describe("createRaukkPriceResolver", () => {
		const producers: Record<string, IRaukkProducerOption[]> = {
			RAT: [producer("a", 10, 100), producer("b", 20, 300)],
		};

		function resolverFor(sources: Record<string, IRaukkTickerSource>) {
			return createRaukkPriceResolver({
				sources,
				getExchange: (ticker: string) =>
					ticker === "RAT"
						? { bid: 80, ask: 120, vwap_7d: 90, vwap_30d: 95 }
						: undefined,
				getDefaultPrice: () => 42,
				getProducers: (ticker: string) => producers[ticker] ?? [],
			});
		}

		it("defaults to the CX preference price", () => {
			expect(resolverFor({})("RAT")).toStrictEqual({ price: 42 });
		});

		it("resolves market modes from exchange data", () => {
			const resolve = resolverFor({
				RAT: { mode: "market", priceMode: "MID" },
			});

			expect(resolve("RAT")).toStrictEqual({ price: 100 });
		});

		it("resolves a concrete plan source and reports the draw", () => {
			const resolve = resolverFor({
				RAT: { mode: "plan", sourcePlanUuid: "b" },
			});

			expect(resolve("RAT")).toStrictEqual({
				price: 20,
				fromPlanUuid: "b",
			});
		});

		it("falls back to market when the source snapshot vanished", () => {
			const resolve = resolverFor({
				RAT: { mode: "plan", sourcePlanUuid: "gone" },
			});

			expect(resolve("RAT")).toStrictEqual({ price: 42 });
		});

		it("resolves aggregates onto their sentinel", () => {
			expect(
				resolverFor({
					RAT: { mode: "plan", sourcePlanUuid: "AGG_AVG" },
				})("RAT")
			).toStrictEqual({ price: 17.5, fromPlanUuid: "AGG_AVG" });

			expect(
				resolverFor({
					RAT: { mode: "plan", sourcePlanUuid: "AGG_MAX" },
				})("RAT")
			).toStrictEqual({ price: 20, fromPlanUuid: "AGG_MAX" });
		});

		it("falls back to market for aggregates without producers", () => {
			const resolve = resolverFor({
				DW: { mode: "plan", sourcePlanUuid: "AGG_AVG" },
			});

			expect(resolve("DW")).toStrictEqual({ price: 42 });
		});
	});

	describe("splitAggregateDraws", () => {
		const producers: Record<string, IRaukkProducerOption[]> = {
			RAT: [producer("a", 10, 100), producer("b", 20, 300)],
			DW: [producer("a", 1, 0), producer("c", 2, 0)],
		};

		const getProducers = (ticker: string) => producers[ticker] ?? [];

		it("keeps concrete keys untouched", () => {
			expect(
				splitAggregateDraws({ z: { RAT: 12 } }, getProducers)
			).toStrictEqual({ z: { RAT: 12 } });
		});

		it("splits proportional to the producers daily output", () => {
			expect(
				splitAggregateDraws({ AGG_AVG: { RAT: 40 } }, getProducers)
			).toStrictEqual({ a: { RAT: 10 }, b: { RAT: 30 } });
		});

		it("splits AGG_MAX over the same pool", () => {
			expect(
				splitAggregateDraws({ AGG_MAX: { RAT: 40 } }, getProducers)
			).toStrictEqual({ a: { RAT: 10 }, b: { RAT: 30 } });
		});

		it("splits evenly when no producer has output", () => {
			expect(
				splitAggregateDraws({ AGG_AVG: { DW: 10 } }, getProducers)
			).toStrictEqual({ a: { DW: 5 }, c: { DW: 5 } });
		});

		it("merges aggregate and concrete draws of the same plan", () => {
			expect(
				splitAggregateDraws(
					{ a: { RAT: 5 }, AGG_AVG: { RAT: 40 } },
					getProducers
				)
			).toStrictEqual({ a: { RAT: 15 }, b: { RAT: 30 } });
		});

		it("drops draws of tickers without any producer", () => {
			expect(
				splitAggregateDraws({ AGG_AVG: { HE: 5 } }, getProducers)
			).toStrictEqual({});
		});
	});

	describe("buildSourceOptions", () => {
		const producers: IRaukkProducerOption[] = [
			producer("a", 10, 100),
			producer("b", 20, 300, true),
		];

		function build(
			overrides: Partial<Parameters<typeof buildSourceOptions>[0]> = {}
		) {
			return buildSourceOptions({
				ticker: "RAT",
				consumerPlanUuid: "consumer",
				prospectiveDrawPerDay: 50,
				producers,
				subscriptionOf: (sourcePlanUuid: string) => ({
					totalDrawnPerDay: sourcePlanUuid === "a" ? 90 : 0,
					byPlan:
						sourcePlanUuid === "a"
							? [
									{ planUuid: "consumer", unitsPerDay: 20 },
									{ planUuid: "other", unitsPerDay: 70 },
								]
							: [],
					pctOfOutput: 0,
				}),
				isCycle: () => false,
				...overrides,
			});
		}

		it("builds one option per producer plus the aggregates", () => {
			const options: IRaukkSourceOption[] = build();

			expect(options.map((o) => o.value)).toStrictEqual([
				"a",
				"b",
				"AGG_AVG",
				"AGG_MAX",
			]);
		});

		it("computes own and other subscription shares", () => {
			const option: IRaukkSourceOption = build()[0];

			// own: 50 / 100, others: (90 - 20) / 100
			expect(option.ownPct).toBe(0.5);
			expect(option.othersPct).toBe(0.7);
		});

		it("flags stale producers", () => {
			expect(build()[1].stale).toBe(true);
			expect(build()[2].stale).toBe(true);
		});

		it("aggregates over the whole producer pool", () => {
			const aggregate: IRaukkSourceOption = build()[2];

			expect(aggregate.unitsPerDay).toBe(400);
			expect(aggregate.costPerUnit).toBe(17.5);
			expect(aggregate.ownPct).toBe(0.125);
			expect(aggregate.othersPct).toBe(0.175);
			expect(build()[3].costPerUnit).toBe(20);
		});

		it("disables options refused by the cycle guard", () => {
			const options: IRaukkSourceOption[] = build({
				isCycle: (candidate) =>
					"sourcePlanUuid" in candidate &&
					candidate.sourcePlanUuid === "a",
			});

			expect(options[0].disabled).toBe(true);
			expect(options[1].disabled).toBe(false);
		});

		it("skips the consuming plan itself", () => {
			const options: IRaukkSourceOption[] = build({
				consumerPlanUuid: "a",
			});

			// single producer left, no aggregates
			expect(options.map((o) => o.value)).toStrictEqual(["b"]);
		});

		it("is empty without producers", () => {
			expect(build({ producers: [] })).toStrictEqual([]);
		});

		it("handles producers without any output", () => {
			const options: IRaukkSourceOption[] = build({
				producers: [producer("a", 10, 0)],
			});

			expect(options[0].ownPct).toBe(0);
			expect(options[0].othersPct).toBe(0);
		});
	});

	describe("formatSourceOptionLabel", () => {
		const option: IRaukkSourceOption = {
			value: "a",
			planName: "Steel",
			planetNaturalId: "OT-580b",
			costPerUnit: 28.35,
			unitsPerDay: 100,
			ownPct: 0.46,
			othersPct: 0.87,
			stale: false,
			disabled: false,
			aggregate: false,
		};

		const format = (value: number) => `${Math.round(value * 100) / 100}`;

		it("formats a concrete producer", () => {
			expect(
				formatSourceOptionLabel(option, format, {
					yours: "yours",
					others: "others",
				})
			).toBe("Steel (OT-580b) — 28.35 ȼ/u — 46% yours / 87% others");
		});

		it("formats an aggregate without planet", () => {
			expect(
				formatSourceOptionLabel(
					{ ...option, aggregate: true, planName: "All producers" },
					format,
					{ yours: "yours", others: "others" }
				)
			).toBe("All producers — 28.35 ȼ/u — 46% yours / 87% others");
		});
	});

	describe("buildInputRows", () => {
		const planResult: IRaukkInputRowSource = {
			materialio: [
				{ ticker: "RAT", delta: -10 },
				{ ticker: "H2O", delta: -5 },
				{ ticker: "FE", delta: 20 },
			],
			workforceMaterialIO: [
				{ ticker: "RAT", input: 10 },
				{ ticker: "H2O", input: 2 },
			],
			productionMaterialIO: [{ ticker: "H2O", input: 3 }],
		};

		const resolve = (ticker: string) => ({
			price: ticker === "RAT" ? 100 : 2,
			fromPlanUuid: ticker === "H2O" ? "a" : undefined,
		});

		it("rows are net inputs and repair materials, sorted by cost", () => {
			const rows = buildInputRows(
				planResult,
				{ BSE: 4 },
				{},
				(ticker: string) =>
					ticker === "BSE" ? { price: 500 } : resolve(ticker)
			);

			expect(rows.map((r) => r.ticker)).toStrictEqual([
				"BSE",
				"RAT",
				"H2O",
			]);
		});

		it("badges every bucket a ticker belongs to", () => {
			const rows = buildInputRows(planResult, { RAT: 1 }, {}, resolve);
			const rat = rows.find((r) => r.ticker === "RAT");
			const h2o = rows.find((r) => r.ticker === "H2O");

			expect(rat?.buckets).toStrictEqual({
				production: false,
				workforce: true,
				repair: true,
			});
			expect(h2o?.buckets).toStrictEqual({
				production: true,
				workforce: true,
				repair: false,
			});
		});

		it("sums net demand and repair demand of a ticker", () => {
			const rows = buildInputRows(planResult, { RAT: 4 }, {}, resolve);

			expect(rows.find((r) => r.ticker === "RAT")?.unitsPerDay).toBe(14);
			expect(rows.find((r) => r.ticker === "RAT")?.costPerDay).toBe(1400);
		});

		it("carries the configured source and the drawn plan", () => {
			const sources: Record<string, IRaukkTickerSource> = {
				H2O: { mode: "plan", sourcePlanUuid: "a" },
			};

			const rows = buildInputRows(planResult, {}, sources, resolve);
			const h2o = rows.find((r) => r.ticker === "H2O");

			expect(h2o?.source).toStrictEqual(sources.H2O);
			expect(h2o?.fromPlanUuid).toBe("a");
		});

		it("ignores outputs and zero repair demand", () => {
			const rows = buildInputRows(planResult, { BSE: 0 }, {}, resolve);

			expect(rows.map((r) => r.ticker)).not.toContain("FE");
			expect(rows.map((r) => r.ticker)).not.toContain("BSE");
		});
	});

	describe("resolveCxExchangeCode", () => {
		const cxData: ICXData = {
			cx_empire: [{ type: "BOTH", exchange: "NC1_ASK" }],
			cx_planets: [
				{
					planet: "OT-580b",
					preferences: [{ type: "BUY", exchange: "AI1_BID" }],
				},
			],
			ticker_empire: [],
			ticker_planets: [],
		};

		it("prefers the planet exchange preference", () => {
			expect(resolveCxExchangeCode(cxData, "OT-580b")).toBe("AI1");
		});

		it("falls back to the empire exchange preference", () => {
			expect(resolveCxExchangeCode(cxData, "UV-351a")).toBe("NC1");
		});

		it("falls back to the universe data", () => {
			expect(resolveCxExchangeCode(undefined, "OT-580b")).toBe(
				"UNIVERSE"
			);
			expect(
				resolveCxExchangeCode(
					{ ...cxData, cx_empire: [], cx_planets: [] },
					undefined
				)
			).toBe("UNIVERSE");
		});
	});
});
