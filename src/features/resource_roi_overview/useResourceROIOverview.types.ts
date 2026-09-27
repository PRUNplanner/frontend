import { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
import type { PlanetCOGCProgramType } from "@/features/api/schemas/gameData.schemas";

export interface IResourceROIResult {
	planetNaturalId: string;
	planetName: string;
	buildingTicker: string;
	dailyYield: number;
	percentMaxDailyYield: number;
	cogm: IProductionBuildingRecipeCOGM | undefined;
	outputProfit: number;
	dailyProfit: number;
	planCost: number;
	planROI: number;
	planArea: number;
	planProfitArea: number;
	planetSurface: string[];
	planetGravity: string[];
	planetPressure: string[];
	planetTemperature: string[];
	planetCOGC: PlanetCOGCProgramType | null;
	planetInfrastructures: string[];
	distanceAI1: number;
	distanceCI1: number;
	distanceIC1: number;
	distanceNC1: number;
}
