// Types & Interfaces
import type {
	EXCHANGES_TYPE,
	IMaterialExchangeOverview,
} from "@/database/services/useExchangeData.types";

const CXS: EXCHANGES_TYPE[] = ["AI1", "CI1", "IC1", "NC1", "UNIVERSE"];

type PerCx = Partial<Record<EXCHANGES_TYPE, number>>;

/** an overview where every exchange has the same numbers unless given */
export function makeOverview(
	over: Partial<Record<keyof IMaterialExchangeOverview, unknown>> = {}
): IMaterialExchangeOverview {
	const all = (v: number, by: PerCx = {}) =>
		Object.fromEntries(CXS.map((c) => [c, by[c] ?? v])) as Record<
			EXCHANGES_TYPE,
			number
		>;
	return {
		vwap_daily: all(100),
		vwap_7d: all(100),
		vwap_30d: all(100),
		sum_traded_7d: all(700, { UNIVERSE: 2800 }),
		sum_traded_30d: all(3000, { UNIVERSE: 12000 }),
		ask: all(102),
		bid: all(98),
		spread: all(4),
		supply: all(500, { UNIVERSE: 2000 }),
		demand: all(500, { UNIVERSE: 2000 }),
		delta_supply_demand: all(0),
		calendar_date: Object.fromEntries(
			CXS.map((c) => [c, new Date("2026-10-23")])
		) as Record<EXCHANGES_TYPE, Date>,
		exchange_status: Object.fromEntries(
			CXS.map((c) => [c, "ACTIVE"])
		) as IMaterialExchangeOverview["exchange_status"],
		vwap_analysis: Object.fromEntries(
			CXS.map((c) => [c, { significance: "STABLE", percentChange: 0 }])
		) as IMaterialExchangeOverview["vwap_analysis"],
		systemic_health: {
			diffusionIndex: 0,
			liquidityRatio: 1,
			weightedTrend: 0,
			priceCohesion: 0,
		},
		...over,
	} as IMaterialExchangeOverview;
}
