// Types & Interfaces
import type { IMarketCheck } from "@/features/cx/marketCheck.types";

/** A market check without flags: 10 sold per day on AI1, 5 % of its volume */
export const marketCheck = (
	ticker: string,
	over: Partial<IMarketCheck> = {}
): IMarketCheck => ({
	ticker,
	delta: 10,
	exchange: "AI1",
	sharePct: 5,
	traded30d: 3000,
	traded7d: 700,
	bid: 1020,
	ask: 1100,
	spreadPct: 7.3,
	flags: [],
	level: null,
	...over,
});
