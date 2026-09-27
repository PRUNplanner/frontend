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

export interface IPlanClonePayload {
	plan_name: string;
}

export interface IPlanCloneResponse {
	message: string;
}
