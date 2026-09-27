export interface IPlanEmpireMatrix {
	planName: string;
	planUuid: string;
	planetId: string;
	empires: Record<string, boolean>;
}

export interface IPlanEmpireMatrixEmpires {
	empireUuid: string;
	empireName: string;
}

export interface IPlanEmpireJunction {
	empire_uuid: string;
	baseplanners: IPlanEmpireJunctionBasePlanners[];
}

export interface IPlanEmpireJunctionBasePlanners {
	baseplanner_uuid: string;
}

export interface ICXEmpireJunction {
	cx_uuid: string;
	empires: { empire_uuid: string }[];
}

export interface IPlanClonePayload {
	plan_name: string;
}
