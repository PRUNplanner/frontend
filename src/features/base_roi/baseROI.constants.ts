// Types & Interfaces
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
import type {
	BaseROIColumn,
	BaseROIPreset,
	BaseROIShip,
	BaseROISettings,
} from "@/features/base_roi/baseROI.schemas";

/** ship capacity, t and m³ */
export const SHIPS: Record<BaseROIShip, { weight: number; volume: number }> = {
	TCB: { weight: 100, volume: 100 },
	VSC: { weight: 250, volume: 250 },
	SCB: { weight: 500, volume: 500 },
	MCB: { weight: 1000, volume: 1000 },
	LCB: { weight: 2000, volume: 2000 },
	WCB: { weight: 3000, volume: 1000 },
	VCB: { weight: 1000, volume: 3000 },
	HCB: { weight: 5000, volume: 5000 },
};

/** ships are not traded on the CX: one price for every ship in v1 */
export const SHIP_PRICE = 800_000;

/** ship of the ship cost when logistics is manual or none */
export const SHIP_COST_FALLBACK: BaseROIShip = "WCB";

/**
 * Days with 0, 1, 2, 3 and 4 experts, each divided by the number of
 * production buildings: the length of each stage, not a running total
 */
export const EXPERT_STAGE_DAYS = [10, 12.5, 57.57, 276.5, 915.1];

export const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 28];

/** a bid or ask this far off a VWAP price gives a volatility scenario */
export const VOLATILITY_THRESHOLD = 0.3;
/** more combinations than this: only "all taker" and "all maker" */
export const VOLATILITY_MAX_COMBINATIONS = 100;

/** rows per calculation chunk, the browser gets a turn between chunks */
export const CHUNK_SIZE = 50;

export const RESOURCE_BUILDINGS = ["RIG", "EXT", "COL"];
export const FARM_BUILDINGS = ["FRM", "ORC"];

/** a plan's planet for "Open as plan" on recipe rows, as Recipe ROI: Montem */
export const STANDARD_PLAN_PLANET = "OT-580b";

/**
 * Recipe rows run on no real planet: standard environment (rocky, normal
 * gravity, pressure and temperature), no resources, not fertile
 */
export const STANDARD_PLANET: Planet = {
	planet_id: "00000000000000000000000000000000",
	planet_natural_id: "STANDARD",
	planet_name: "Standard planet",
	system_id: "00000000000000000000000000000000",
	has_localmarket: false,
	has_chamberofcommerce: false,
	has_warehouse: false,
	has_administrationcenter: false,
	has_shipyard: false,
	pressure: 1,
	surface: true,
	temperature: 25,
	fertility: -1,
	gravity: 1,
	faction_code: null,
	faction_name: null,
	cogc_program_status: null,
	resources: [],
	cogc_programs: [],
	active_cogc_program_type: null,
	plots_total: null,
	plots_used: null,
	ghost_sites: null,
	supports_ghost_sites: null,
	plots_updated: null,
};

/** every column the menu toggles, in table order (product is always shown) */
export const BASE_ROI_COLUMNS: BaseROIColumn[] = [
	"expertise",
	"daily_profit",
	"break_even",
	"weekly_return",
	"building_cost",
	"running_cost",
	"cargo",
	"market_capacity",
	"workforce",
	"history",
];

/** what each setup preset writes; Veteran's ship comes from the dialog */
export const SETUP_PRESETS: Record<BaseROIPreset, Partial<BaseROISettings>> = {
	rookie: {
		logistics: "ship",
		ship: "SCB",
		minMarketCapacity: 0.7,
		bufferDays: 9,
	},
	standard: {
		logistics: "ship",
		ship: "LCB",
		minMarketCapacity: 0.7,
		bufferDays: 9,
	},
	veteran: {
		logistics: "none",
		minMarketCapacity: 0,
		bufferDays: 9,
	},
};

/** exchanges with price history and a system to count jumps to */
export const BASE_ROI_EXCHANGES = ["AI1", "CI1", "IC1", "NC1"] as const;

/** the game's short workforce names, as on its population reports */
export const WORKFORCE_SHORT: Record<WorkforceType, string> = {
	pioneer: "PIO",
	settler: "SET",
	technician: "TEC",
	engineer: "ENG",
	scientist: "SCI",
};
