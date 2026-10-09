/**
 * One line of a change list, rendered as `t("save_conflict.change.<key>",
 * params)`. Lines with the same area changed on both sides are highlighted.
 */
export interface IChangeLine {
	area: string;
	key: string;
	params: Record<string, string | number>;
}

export interface IChanges {
	/** loaded → saved by the other tab */
	theirs: IChangeLine[];
	/** loaded → this tab's edits */
	mine: IChangeLine[];
	/** areas in both lists */
	both: string[];
}

export type SaveConflictOption = "save_as_new" | "overwrite" | "reload";

export interface ISaveConflictRequest {
	/** the object was deleted (404) instead of saved elsewhere (409) */
	deleted: boolean;
	options: SaveConflictOption[];
	/** loads the saved version and diffs it; failing leaves the lists out */
	loadChanges?: () => Promise<IChanges>;
}
