import { IPlanData, PLAN_COGCPROGRAM_TYPE } from "@/stores/planningStore.types";

export interface IPlanRouteParams {
	planetNaturalId: string | undefined;
	planUuid: string | undefined;
	sharedPlanUuid: string | undefined;
}

export interface IPlanCreateData {
	empire_uuid?: string;
	plan_name: string;
	planet_natural_id: string;
	plan_permits_used: number;
	plan_cogc: PLAN_COGCPROGRAM_TYPE;
	plan_corphq: boolean;
	plan_data: IPlanData;
}

export interface IPlanSaveData extends IPlanCreateData {
	uuid: string;
}

export interface IPlanSaveCreateResponse {
	uuid: string;
}
