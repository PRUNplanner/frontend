import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";

/** What a shared plan and its working copy are compared by */
export interface IPlanFigures {
	profit: number;
	/** payback in days */
	roi: number;
	area: number;
	workforce: number;
	buildings: number;
}

/** A shared plan's figures and its working copy's */
export interface IPlanCompare {
	before: IPlanFigures;
	after: IPlanFigures;
}

export interface IBuildingChange {
	kinds: ("added" | "amount" | "recipe")[];
	/** recipe ids the shared building didn't have */
	newRecipes: string[];
}

export interface IPlanChanges {
	/** by building ticker */
	buildings: Record<string, IBuildingChange>;
	/** tickers of buildings the copy no longer has */
	removed: string[];
}

export interface ISharedSummaryInput {
	name: string;
	planet: string;
	changes: IChangeLine[];
	before: IPlanFigures;
	after: IPlanFigures;
	priceSource: string;
	url: string;
}
