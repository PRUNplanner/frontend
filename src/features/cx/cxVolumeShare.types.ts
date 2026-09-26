import { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";

/** Severity of a row's share of the exchange's traded volume */
export type CX_VOLUME_LEVEL = "none" | "yellow" | "red";

/** Shares of daily traded volume, in percent, that colour a row */
export interface ICXVolumeThresholds {
	yellowPercent: number;
	redPercent: number;
}

/** One traded volume window of an exchange, measured against a sale */
export interface ICXVolumeWindow {
	sumTraded: number;
	days: number;
	/** soldPerDay / (sumTraded / days), undefined while nothing trades */
	share: number | undefined;
}

/** A single material row's pressure on the exchange it is sold at */
export interface ICXVolumeShare {
	ticker: string;
	exchange: EXCHANGES_TYPE;
	soldPerDay: number;
	window7d: ICXVolumeWindow;
	window30d: ICXVolumeWindow;
	/** Exchange trades too little for any share to be meaningful */
	illiquid: boolean;
	level: CX_VOLUME_LEVEL;
}

/** Input of a volume share calculation, one per material row */
export interface ICXVolumeRow {
	ticker: string;
	soldPerDay: number;
}
