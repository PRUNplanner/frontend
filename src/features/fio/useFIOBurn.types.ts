export interface IFIOBurnTableElement {
	key: string;
	planUuid: string;
	planName: string;
	planetId: string;
	hasStorage: boolean;
	burnMaterials: IFIOBurnTableElementMaterial[];
	minDays: number;
}

export interface IFIOBurnTableElementMaterial {
	ticker: string;
	input: number;
	output: number;
	delta: number;
	stock: number;
	exhaustion: number;
}

export interface IFIOBurnPlanetTableElement {
	planUuid: string;
	planName: string;
	planetId: string;
	minDays: number;
	burnMaterials: IFIOBurnTableElementMaterial[];
}
