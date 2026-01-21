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
