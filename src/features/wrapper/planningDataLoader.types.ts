import {
	ICX,
	IPlan,
	IPlanEmpireElement,
	IPlanShare,
} from "@/stores/planningStore.types";
import { IPlanet } from "@/features/api/gameData.types";
import { StepConfig } from "@/features/wrapper/dataLoader.types";
import type { Shared } from "@/features/api/schemas/sharingData.schemas";

export type PlanningDataLoaderProps = {
	readonly empireList?: boolean | undefined;
	readonly empireUuid?: string | undefined;
	readonly sharedPlanUuid?: string | undefined;
	readonly planetNaturalId?: string | undefined;
	readonly planUuid?: string | undefined;
	readonly loadCX?: boolean | undefined;
	readonly cxUuid?: string | undefined;
	readonly loadShared?: boolean | undefined;
	readonly planList?: boolean | undefined;
};

export type PlanningDataLoaderEmits = {
	(e: "complete"): void;
	(e: "data:shared:plan", data: IPlanShare): void;
	(e: "data:empire:list", data: IPlanEmpireElement[]): void;
	(e: "data:empire:plans", data: IPlan[]): void;
	(e: "data:planet", data: IPlanet): void;
	(e: "data:plan", data: IPlan): void;
	(e: "data:plan:list", data: IPlan[]): void;
	(e: "data:plan:list:planets", data: string[]): void;
	(e: "data:cx", data: ICX[]): void;
	(e: "data:shared", data: Shared[]): void;
	(e: "update:cxUuid", data: string | undefined): void;
	(e: "update:empireUuid", data: string): void;
};

export type PlanningStepConfigsType = [
	StepConfig<IPlanShare>,
	StepConfig<IPlanEmpireElement[]>,
	StepConfig<IPlan>,
	StepConfig<IPlan[]>,
	StepConfig<IPlanet>,
	StepConfig<ICX[]>,
	StepConfig<Shared[]>,
	StepConfig<IPlan[]>,
];
