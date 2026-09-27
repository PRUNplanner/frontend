export interface WorkforceConsumptionElement {
	ticker: string;
	need: number;
	lux1: boolean;
	lux2: boolean;
}

export interface WorkforceConsumptionMap {
	[key: string]: WorkforceConsumptionElement[];
}
