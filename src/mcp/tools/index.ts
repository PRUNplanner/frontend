// Tools
import { listEmpires } from "@/mcp/tools/listEmpires";
import { listPlans } from "@/mcp/tools/listPlans";
import { getPlan } from "@/mcp/tools/getPlan";
import { getEmpire } from "@/mcp/tools/getEmpire";
import { calculatePlanVariant } from "@/mcp/tools/calculatePlanVariant";
import { calculateNewPlan } from "@/mcp/tools/calculateNewPlan";
import { calculateEmpireVariant } from "@/mcp/tools/calculateEmpireVariant";
import { rankRecipes } from "@/mcp/tools/rankRecipes";
import { getProductionCost } from "@/mcp/tools/getProductionCost";
import { checkMakeOrBuy } from "@/mcp/tools/checkMakeOrBuy";
import { checkPlanMarket } from "@/mcp/tools/checkPlanMarket";
import { getMaterialPrices } from "@/mcp/tools/getMaterialPrices";
import { getMarketReport } from "@/mcp/tools/getMarketReport";
import { getPriceHistory } from "@/mcp/tools/getPriceHistory";
import { getXITAction } from "@/mcp/tools/getXITAction";
import { findPlanets } from "@/mcp/tools/findPlanets";
import { getPlanet } from "@/mcp/tools/getPlanetTool";
import { getDistances } from "@/mcp/tools/getDistances";
import { suggestBase } from "@/mcp/tools/suggestBase";
import { rankBases } from "@/mcp/tools/rankBases";
import { lookupMaterial } from "@/mcp/tools/lookupMaterial";
import {
	diffPlanVersions,
	listPlanVersions,
	restorePlanVersion,
} from "@/mcp/tools/planVersions";
import { savePlan } from "@/mcp/tools/savePlan";
import { comparePlans } from "@/mcp/tools/comparePlans";
import { saveEmpire } from "@/mcp/tools/saveEmpire";
import { saveCXPreference } from "@/mcp/tools/saveCXPreference";
import { copySharedPlan, getSharedPlan, sharePlan } from "@/mcp/tools/sharing";
import { setPreferences } from "@/mcp/tools/setPreferences";
import { deleteItem } from "@/mcp/tools/deleteItem";

// Types & Interfaces
import type { ITool } from "@/mcp/tools/shared";

/** every tool: reading and calculating first, then the write tools */
export const TOOLS = [
	listEmpires,
	listPlans,
	getPlan,
	getSharedPlan,
	getEmpire,
	calculatePlanVariant,
	calculateNewPlan,
	calculateEmpireVariant,
	rankRecipes,
	getProductionCost,
	checkMakeOrBuy,
	checkPlanMarket,
	getMaterialPrices,
	getMarketReport,
	getPriceHistory,
	getXITAction,
	findPlanets,
	getPlanet,
	getDistances,
	suggestBase,
	rankBases,
	lookupMaterial,
	listPlanVersions,
	diffPlanVersions,
	comparePlans,
	savePlan,
	restorePlanVersion,
	saveEmpire,
	saveCXPreference,
	sharePlan,
	copySharedPlan,
	setPreferences,
	deleteItem,
] as unknown as ITool[];
