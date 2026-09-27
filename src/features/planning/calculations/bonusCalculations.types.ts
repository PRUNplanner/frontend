type BUILDING_EFFICIENCY_TYPE =
	"WORKFORCE" | "HQ" | "EXPERT" | "COGC" | "FERTILITY" | "FACTION";

export interface IBuildingEfficiency {
	efficiencyType: BUILDING_EFFICIENCY_TYPE;
	value: number;
}

export interface EfficiencyMap {
	[key: string]: {
		[key: string]: number;
	};
}
