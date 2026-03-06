import {
	ICXDataExchangeOption,
	ICXDataTickerOption,
} from "@/stores/planningStore.types";

export type PreferenceType = "BOTH" | "BUY" | "SELL";

export type ExchangeType =
	| "AI1_7D"
	| "NC1_7D"
	| "CI1_7D"
	| "IC1_7D"
	| "UNIVERSE_7D"
	| "AI1_30D"
	| "NC1_30D"
	| "CI1_30D"
	| "IC1_30D"
	| "UNIVERSE_30D";

type ICXPlanetMapItem = {
	planet: string;
	exchanges: ICXDataExchangeOption[];
	ticker: ICXDataTickerOption[];
};

export type ICXPlanetMap = Record<string, ICXPlanetMapItem>;
