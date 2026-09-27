import type {
	CXDataExchangeOption,
	CXDataTickerOption,
} from "@/features/api/schemas/cxData.schemas";

type ICXPlanetMapItem = {
	planet: string;
	exchanges: CXDataExchangeOption[];
	ticker: CXDataTickerOption[];
};

export type ICXPlanetMap = Record<string, ICXPlanetMapItem>;
