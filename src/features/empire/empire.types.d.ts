import {
	PLAN_COGCPROGRAM_TYPE,
	PLAN_FACTION,
} from "@/stores/planningStore.types";
import { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

interface IEmpirePlanListData {
	uuid: string;
	name: string | undefined;
	planet: string;
	permits: number;
	cogc: PLAN_COGCPROGRAM_TYPE;
	profit: number;
}

interface IEmpireMaterialIOPlanet {
	planetId: string;
	planUuid: string;
	planName: string;
	planCOGC: PLAN_COGCPROGRAM_TYPE;
	delta: number;
	input: number;
	output: number;
	price: number;
}

interface IEmpireMaterialIO {
	ticker: string;
	input: number;
	output: number;
	delta: number;
	deltaPrice: number;
	inputPlanets: IEmpireMaterialIOPlanet[];
	outputPlanets: IEmpireMaterialIOPlanet[];
}

interface IEmpirePlanMaterialIO {
	planetId: string;
	planUuid: string;
	planName: string;
	planCOGC: PLAN_COGCPROGRAM_TYPE;
	materialIO: IMaterialIO[];
}

interface IEmpirePatchPayload {
	empire_name: string;
	empire_faction: PLAN_FACTION;
	empire_permits_used: number;
	empire_permits_total: number;
}

type IEmpireCreatePayload = IEmpirePatchPayload;

interface IEmpireCostOverview {
	totalProfit: number;
	totalRevenue: number;
	totalCost: number;
	totalAreaUsed: number;
}

interface IEmpireMaterialIOState {
	metadata: {
		faction: PLAN_FACTION;
		permits_used: number;
		permits_total: number;
		plan_count: number;
		timestamp: string;
	};
	empire_total: {
		[key: string]: {
			p: number;
			c: number;
			d: number;
		};
	};
	plan_details: {
		[key: string]: {
			metadata: {
				planet_natural_id: string;
				cogc: PLAN_COGCPROGRAM_TYPE;
			};
			deltas: {
				[key: string]: {
					p: number;
					c: number;
					d: number;
				};
			};
		};
	};
}
