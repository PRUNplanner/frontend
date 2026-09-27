import type {
	Plan,
	PlanShare,
} from "@/features/api/schemas/planningData.schemas";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { StepConfig } from "@/features/wrapper/dataLoader.types";
import type { Shared } from "@/features/api/schemas/sharingData.schemas";

export interface PlanningDataLoaderProps {
	readonly empireList?: boolean | undefined;
	readonly empireUuid?: string | undefined;
	readonly sharedPlanUuid?: string | undefined;
	readonly planetNaturalId?: string | undefined;
	readonly planUuid?: string | undefined;
	readonly loadCX?: boolean | undefined;
	readonly cxUuid?: string | undefined;
	readonly loadShared?: boolean | undefined;
	readonly planList?: boolean | undefined;
}

export interface PlanningDataLoaderEmits {
	(e: "complete"): void;
	(e: "data:shared:plan", data: PlanShare): void;
	(e: "data:empire:list", data: PlanEmpireElement[]): void;
	(e: "data:empire:plans", data: Plan[]): void;
	(e: "data:planet", data: Planet): void;
	(e: "data:plan", data: Plan): void;
	(e: "data:plan:list", data: Plan[]): void;
	(e: "data:plan:list:planets", data: string[]): void;
	(e: "data:cx", data: CX[]): void;
	(e: "data:shared", data: Shared[]): void;
	(e: "update:cxUuid", data: string | undefined): void;
	(e: "update:empireUuid", data: string): void;
}

export type PlanningStepConfigsType = [
	StepConfig<PlanShare>,
	StepConfig<PlanEmpireElement[]>,
	StepConfig<Plan>,
	StepConfig<Plan[]>,
	StepConfig<Planet>,
	StepConfig<CX[]>,
	StepConfig<Shared[]>,
	StepConfig<Plan[]>,
];
