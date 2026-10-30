export interface ISystemsJSON {
	SystemId: string;
	Connections: { ConnectingId: string }[] | null;
}

export type AdjecentList = number[][];
