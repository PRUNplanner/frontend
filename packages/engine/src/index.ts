// @prunplanner/engine: the plan engine, price book and the types they use.
// Wire schemas are in @prunplanner/engine/schemas.

export type { IBuildingEfficiency } from "./calculations/bonusCalculations.types";
export { calculateExtraction } from "./calculations/extractionCalculations";
export {
	getVolumeOfAllStorages,
	getWeightOfAllStorages,
	infrastructureBuildingNames,
	isStorageInfrastructure,
} from "./calculations/infrastructureCalculations";
export {
	createPriceBook,
	enhanceMaterialIOMaterial,
	explainPrice,
	findExchangeRule,
	getExchangeCodeKey,
	getMaterialIOTotalPrice,
	scaledPriceBook,
} from "./cx/priceBook";
export type {
	ExchangePriceKey,
	IPriceBook,
	IPriceSource,
	PriceType,
} from "./cx/priceBook";
export type {
	EXCHANGES_TYPE,
	IMaterialExchangeOverview,
	IMaterialExchangeVWAPAnalysis,
	SIGNIFICANCE_LEVEL,
} from "./cx/useExchangeData.types";
export type { IInfrastructureCosts } from "./cx/usePrice.types";
export { calculateArea } from "./engine/area";
export {
	boundaryGravityHigh,
	boundaryGravityLow,
	boundaryPressureHigh,
	boundaryPressureLow,
	boundaryTemperatureHigh,
	boundaryTemperatureLow,
	getBuilding,
	getBuildingConstructionMaterials,
	getBuildingRecipes,
	getPlanetSpecialMaterials,
	getTotalWorkforce,
	groupRecipesByBuilding,
	resourceBuildingTicker,
} from "./engine/buildings";
export { calculatePlan } from "./engine/calculatePlan";
export { calculateCOGM } from "./engine/cogm";
export {
	calculateConstructionMaterials,
	calculateTotalConstructionCost,
} from "./engine/construction";
export {
	MAP_BUILDING_EXPERTISE_EXPERTS,
	MAX_EXPERTS_PER_TYPE,
	MAX_EXPERTS_TOTAL,
	calculateBuildingEfficiency,
	calculateBuildingFactionBonus,
	calculateBuildingWorkforceEfficiency,
	calculateExpertBonus,
	calculateExperts,
	expertNames,
	zeroEfficiencyReason,
} from "./engine/efficiency";
export type {
	IGameData,
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
	ITraceEntry,
	TracePhase,
} from "./engine/engine.types";
export { productionFeePerRun, weightedProductionFee } from "./engine/fees";
export { calculateFinance } from "./engine/finance";
export {
	TOTALMSDAY,
	calculateMaterialIO,
	combineMaterialIOMinimal,
	enhanceMaterialIOMinimal,
} from "./engine/materialIO";
export { TRACE_PHASES, createPlanTracer, tracePriceBook } from "./engine/trace";
export { SHIP_SIZES, calculateVisitation, shipDays } from "./engine/visitation";
export {
	calculateSatisfaction,
	calculateWorkforce,
	calculateWorkforceConsumption,
	getBuildingWorkforceMaterials,
	workforceTypeNames,
} from "./engine/workforce";
export { WORKFORCE_CONSUMPTION_MAP } from "./engine/workforce.constants";
export { planEmptyResult } from "./planCalculation.types";
export type {
	IAreaResult,
	IBuildingConstruction,
	IExpertElement,
	IExpertRecord,
	IInfrastructureRecord,
	IMaterialIO,
	IMaterialIOMaterial,
	IMaterialIOMinimal,
	IOverviewData,
	IPlanResult,
	IPlanTraceRun,
	IProductionBuilding,
	IProductionBuildingRecipe,
	IProductionBuildingRecipeCOGM,
	IProductionResult,
	IRecipeBuildingOption,
	IStorageRecord,
	IVisitationData,
	IWorkforceElement,
	IWorkforceRecord,
} from "./planCalculation.types";
export { optimalProduction } from "./roi/optimalProduction";
export type {
	IROIResult,
	IStaticOptimalProduction,
} from "./roi/useROIOverview.types";
export { boundaryDescriptor } from "./util/boundary";
