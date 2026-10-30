import type { Ref } from "vue";

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

export interface IBurnXITActionOptions {
	elements: Ref<IXITActionElement[]>;
	resupplyDays: Ref<number>;
	hideInfinite: Ref<boolean>;
	materialOverrides: Ref<Record<string, number | null>>;
	materialInactives: Ref<Set<string>>;
	// Universe prices when unset
	cxUuid?: Ref<string | undefined>;
	planetNaturalId?: Ref<string | undefined>;
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
	noSfc: boolean;
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
