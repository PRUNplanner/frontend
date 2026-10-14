import type { IProductionBuildingRecipeCOGM } from "@/features/planning/usePlanCalculation.types";
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

export type IResourceROIExchange = "AI1" | "CI1" | "IC1" | "NC1";

/** what the chart's jumps are measured to */
export type IResourceROIDistanceTarget = "nearest" | IResourceROIExchange;

export interface IResourceROIChartPoint {
	row: IResourceROIResult;
	/** plan ROI in days */
	x: number;
	/** jumps to the target exchange */
	y: number;
	/** the exchange y is measured to */
	exchange: IResourceROIExchange;
}

export interface IResourceROIChartData {
	points: IResourceROIChartPoint[];
	/** rows left out: no payback (ROI ≤ 0) */
	noPayback: number;
	/** rows left out: no route to the target exchange */
	noRoute: number;
	/** rows left out: payback slower than maxDays */
	slow: number;
	/** the zoom: ROI_ZOOM times the fastest payback, 0 without points */
	maxDays: number;
}

export interface IResourceROIInsight {
	/** best trade-off points, fastest payback first */
	frontier: IResourceROIChartPoint[];
	minJumps: number;
	maxJumps: number;
	/** the exchange all frontier points measure to, else null */
	exchange: IResourceROIExchange | null;
	/** highest daily profit, when it is not on the frontier */
	topProfit: IResourceROIChartPoint | null;
}
