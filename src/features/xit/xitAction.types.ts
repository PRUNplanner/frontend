export interface IXITActionElement {
	ticker: string;
	stock: number;
	delta: number;
}

export interface IXITActionMaterialElement {
	active: boolean;
	ticker: string;
	stock: number;
	delta: number;
	burn: number;
	total: number;
}

interface IXITJSONActionCXBuy {
	type: "CX Buy";
	name: "BuyItems";
	exchange: string;
	priceLimits: Record<string, number>;
	buyPartial: boolean;
	useCXInv: boolean;
	group: string;
}

interface IXITJSONActionMTRA {
	type: "MTRA";
	name: "TransferAction";
	group: string;
	origin: string | "Configure on Execution";
	dest: string | "Configure on Execution";
}

interface IXITJSONGlobal {
	name: string;
}

interface IXITJSONGroup {
	type: "Manual";
	name: string;
	materials: Record<string, number>;
}

export type XITACTIONTYPE = IXITJSONActionMTRA | IXITJSONActionCXBuy;

export interface IXITJSON {
	actions: XITACTIONTYPE[];
	global: IXITJSONGlobal;
	groups: IXITJSONGroup[];
}

export interface IXITTransferMaterial {
	ticker: string;
	value: number;
}

export interface IBurnDemandItem {
	ticker: string;
	burnPerDay: number;
	targetDays: number;
	targetQuantity: number;
	currentStock: number;
	need: number;
	weightPerUnit: number;
	volumePerUnit: number;
	priority: number;
}
