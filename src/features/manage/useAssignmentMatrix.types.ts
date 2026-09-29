export interface IAssignmentChanges {
	changedKeys: Set<string>;
	changedCount: number;
	planCount: number;
	empireCount: number;
}

/** one matrix row, plain and frozen */
export interface IAssignmentRow {
	planUuid: string;
	planName: string;
	planetId: string;
	/** planet name, undefined when it equals the natural id */
	planetName: string | undefined;
}

export interface IAssignmentEmpire {
	empireUuid: string;
	empireName: string;
}

/** per empire, one char: "1" assigned, "0" not, "+" will add, "-" will remove */
export type AssignmentCell = "0" | "1" | "+" | "-";
