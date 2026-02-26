import { exchangesStore } from "@/database/stores";
import { useDB } from "@/database/composables/useDB";

// Types & Interfaces
import { IExchange } from "@/features/api/gameData.types";
import {
	EXCHANGES_TYPE,
	IMaterialExchangeOverview,
} from "@/database/services/useExchangeData.types";

export async function useExchangeData() {
	const exchangeTypesArray: EXCHANGES_TYPE[] = [
		"AI1",
		"CI1",
		"IC1",
		"NC1",
		"UNIVERSE",
	];

	const { get, preload } = useDB(exchangesStore);

	async function getExchangeTicker(tickerId: string): Promise<IExchange> {
		const exchange = await get(tickerId);

		if (exchange) return exchange;

		throw new Error(
			`Exchange data for ticker '${tickerId}' not found. Ensure game data is loaded and ticker is valid.`
		);
	}

	async function getMaterialExchangeOverview(
		materialTicker: string
	): Promise<IMaterialExchangeOverview> {
		const overview: IMaterialExchangeOverview = {
			vwap_daily: {} as Required<Record<EXCHANGES_TYPE, number>>,
			vwap_7d: {} as Record<EXCHANGES_TYPE, number>,
			vwap_30d: {} as Record<EXCHANGES_TYPE, number>,
			sum_traded_7d: {} as Record<EXCHANGES_TYPE, number>,
			sum_traded_30d: {} as Record<EXCHANGES_TYPE, number>,
			calendar_date: {} as Record<EXCHANGES_TYPE, Date>,
			exchange_status: {} as Record<
				EXCHANGES_TYPE,
				"ACTIVE" | "INACTIVE" | "STALE"
			>,
		};

		try {
			await Promise.all(
				exchangeTypesArray.map(async (type) => {
					const ticker = await getExchangeTicker(
						`${materialTicker}.${type}`
					);
					overview.vwap_daily[type] = ticker.vwap_daily;
					overview.vwap_7d[type] = ticker.vwap_7d;
					overview.vwap_30d[type] = ticker.vwap_30d;
					overview.sum_traded_7d[type] = ticker.sum_traded_7d;
					overview.sum_traded_30d[type] = ticker.sum_traded_30d;
					overview.calendar_date[type] = ticker.calendar_date;
					overview.exchange_status[type] = ticker.exchange_status;
				})
			);
		} catch (error) {
			console.log(error);
		}
		return overview;
	}

	return {
		preload,
		getExchangeTicker,
		getMaterialExchangeOverview,
		exchangeTypesArray,
	};
}
