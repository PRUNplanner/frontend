import type {
	CXDataExchangeOption,
	CXDataTickerOption,
} from "@prunplanner/engine/schemas";

export type ICXPlanetMap = Record<
	string,
	{
		planet: string;
		exchanges: CXDataExchangeOption[];
		ticker: CXDataTickerOption[];
	}
>;
