// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IRepairMaterialList } from "@/features/repair_analysis/useRepairAnalysis.types";

/** unknown: a building without any repair or construction date */
export type FIORepairStatus = "overdue" | "soon" | "later" | "unknown";

export type FIORepairFilter = "all" | "overdue" | "soon" | "later";

export type FIORepairConfidence =
	"match" | "likely" | "picked" | "nopick" | "none";

/** one production building of a FIO site */
export interface IFIORepairBuilding {
	ticker: string;
	/** whole days since the last repair, else since construction */
	days: number | null;
	wasRepaired: boolean;
	/** 0..1, as FIO reported it */
	condition: number;
}

export interface IFIORepairCandidate {
	plan: Plan;
	/** 0..1, share of production buildings that match FIO */
	score: number;
	/** the plan's empire covering the most matched bases */
	empire: PlanEmpireElement | undefined;
}

export interface IFIORepairMatch {
	candidate: IFIORepairCandidate | undefined;
	confidence: FIORepairConfidence;
	/** plans on the site's planet, best score first */
	candidates: IFIORepairCandidate[];
}

/** all buildings of one type on a base */
export interface IFIORepairBuildingType {
	ticker: string;
	count: number;
	target: number;
	/** oldest building, null if one has no date */
	since: number | null;
	/** false if the oldest building was never repaired */
	wasRepaired: boolean;
	/** lowest condition, 0..1 */
	condition: number;
	due: number | null;
	status: FIORepairStatus;
}

export interface IFIORepairBase {
	planet: string;
	name: string;
	siteId: string | undefined;
	match: IFIORepairMatch;
	buildings: IFIORepairBuilding[];
	types: IFIORepairBuildingType[];
	since: number | null;
	wasRepaired: boolean;
	condition: number;
	/** days until the first building type is due, null without dates */
	due: number | null;
	status: FIORepairStatus;
	/** every production building repaired today */
	bill: IRepairMaterialList;
	/** more repair material per day of waiting, ȼ */
	waiting: number;
}

export interface IFIORepairTimelineAxis {
	from: number;
	to: number;
	step: number;
	ticks: number[];
}

export interface IFIORepairTimelineChip {
	key: string;
	label: string;
	/** position on the axis, 0..100 */
	pct: number;
}

export interface IFIORepairTimelinePlaced extends IFIORepairTimelineChip {
	lane: number;
	/** near the right edge the chip grows to the left */
	flip: boolean;
}

export interface IFIORepairTimelineLayout {
	chips: IFIORepairTimelinePlaced[];
	/** crowded spots, one "+n" chip each on the row below the lanes */
	more: { pct: number; keys: string[] }[];
	lanes: number;
}
