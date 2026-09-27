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
