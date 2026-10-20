// Types & Interfaces
import type { WorkforceConsumptionMap } from "@/features/planning/calculations/workforceCalculations.types";

/**
 * What each workforce consumes per worker and day, luxuries flagged. Its
 * own module, so pages outside the planner read it without the engine.
 */
export const WORKFORCE_CONSUMPTION_MAP: WorkforceConsumptionMap = {
	pioneer: [
		{ ticker: "DW", need: 4 / 100, lux1: false, lux2: false },
		{ ticker: "RAT", need: 4 / 100, lux1: false, lux2: false },
		{ ticker: "OVE", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "PWO", need: 0.2 / 100, lux1: true, lux2: false },
		{ ticker: "COF", need: 0.5 / 100, lux1: false, lux2: true },
	],
	settler: [
		{ ticker: "DW", need: 5 / 100, lux1: false, lux2: false },
		{ ticker: "RAT", need: 6 / 100, lux1: false, lux2: false },
		{ ticker: "EXO", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "PT", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "REP", need: 0.2 / 100, lux1: true, lux2: false },
		{ ticker: "KOM", need: 1 / 100, lux1: false, lux2: true },
	],
	technician: [
		{ ticker: "DW", need: 7.5 / 100, lux1: false, lux2: false },
		{ ticker: "RAT", need: 7 / 100, lux1: false, lux2: false },
		{ ticker: "MED", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "HMS", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "SCN", need: 0.1 / 100, lux1: false, lux2: false },
		{ ticker: "SC", need: 0.1 / 100, lux1: true, lux2: false },
		{ ticker: "ALE", need: 1 / 100, lux1: false, lux2: true },
	],
	engineer: [
		{ ticker: "DW", need: 10 / 100, lux1: false, lux2: false },
		{ ticker: "MED", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "FIM", need: 7 / 100, lux1: false, lux2: false },
		{ ticker: "HSS", need: 0.2 / 100, lux1: false, lux2: false },
		{ ticker: "PDA", need: 0.1 / 100, lux1: false, lux2: false },
		{ ticker: "VG", need: 0.2 / 100, lux1: true, lux2: false },
		{ ticker: "GIN", need: 1 / 100, lux1: false, lux2: true },
	],
	scientist: [
		{ ticker: "DW", need: 10 / 100, lux1: false, lux2: false },
		{ ticker: "MED", need: 0.5 / 100, lux1: false, lux2: false },
		{ ticker: "MEA", need: 7 / 100, lux1: false, lux2: false },
		{ ticker: "LC", need: 0.2 / 100, lux1: false, lux2: false },
		{ ticker: "WS", need: 0.05 / 100, lux1: false, lux2: false },
		{ ticker: "NST", need: 0.1 / 100, lux1: true, lux2: false },
		{ ticker: "WIN", need: 1 / 100, lux1: false, lux2: true },
	],
};
