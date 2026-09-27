import type {
	CXDataExchangeOption,
	CXDataTickerOption,
} from "@/features/api/schemas/cxData.schemas";

export type ICXPlanetMap = Record<
	string,
	{
		planet: string;
		exchanges: CXDataExchangeOption[];
		ticker: CXDataTickerOption[];
	}
>;
