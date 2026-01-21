export type UpkeepNeedType =
	| "safety"
	| "health"
	| "comfort"
	| "culture"
	| "education";

export interface IUpkeepMaterial {
	ticker: string;
	qtyPerDay: number;
}

export interface IUpkeepNeeds {
	safety: number;
	health: number;
	comfort: number;
	culture: number;
	education: number;
}

export interface IUpkeepBuilding {
	ticker: string;
	name: string;
	materials: IUpkeepMaterial[];
	needs: IUpkeepNeeds;
}

export interface IUpkeepMaterialCalculation {
	ticker: string;
	buildingTicker: string;
	qtyPerDay: number;
	needProvided: number;
	pricePerNeed: number;
	cxPrice: number;
	relativePrice: number;
}

export interface IUpkeepBuildingSummary {
	ticker: string;
	name: string; // Human-readable building name
	totalPricePerNeed: number; // Sum of $/Need of all materials
	totalDailyCost: number; // Sum of (cxPrice * qtyPerDay) of all materials
	materialsAvailable: number; // How many have price > 0
	materialsTotal: number; // Total materials for the building
	needProvided: number; // Need that the building provides
	isComplete: boolean; // materialsAvailable === materialsTotal
}
