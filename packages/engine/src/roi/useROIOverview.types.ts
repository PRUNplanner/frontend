import type { PlanCOGCProgram } from "../schemas/planningData.schemas";
import type { RecipeMaterial } from "../schemas/gameData.schemas";
import type { IProductionBuildingRecipeCOGM } from "../planCalculation.types";

export interface IStaticOptimalProduction {
	ticker: string;
	amount: number;
	sto: number;
	sta: number;
	ste: number;
	stv: number;
	stw: number;
	total_area: number;
	HB1: number;
	HB2: number;
	HB3: number;
	HB4: number;
	HB5: number;
	HBB: number;
	HBC: number;
	HBM: number;
	HBL: number;
}

export interface IROIResult {
	buildingTicker: string;
	optimalSetup: IStaticOptimalProduction;
	recipeId: string;
	dailyRuns: number;
	recipeInputs: RecipeMaterial[];
	recipeOutputs: RecipeMaterial[];
	cogc: PlanCOGCProgram;
	cogm: IProductionBuildingRecipeCOGM | undefined;
	outputProfit: number;
	dailyProfit: number;
	planCost: number;
	planROI: number;
	planArea: number;
	planProfitArea: number;
}
