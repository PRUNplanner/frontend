import { Ref } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useExchangeData } from "@/database/services/useExchangeData";
import { useBuildingData } from "@/database/services/useBuildingData";

// Types & Interfaces
import {
	IMaterialIO,
	IMaterialIOMaterial,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";
import { CX_EXCHANGE_OPTION_TYPE, ICXData } from "@/stores/planningStore.types";
import { infrastructureBuildingNames } from "@/features/planning/calculations/workforceCalculations";
import { IPlanet } from "@/features/api/gameData.types";
import { IInfrastructureCosts } from "@/features/cx/usePrice.types";

/**
 * # Material Price & CX Preference Logic
 *
 * This module operates based on the following key principles to determine prices:
 *
 * ## Preference Types
 * The user can specify a preference type which can be "BUY", "SELL" or "BOTH".
 * If "BOTH" is selected, it will be used for either "BUY" or "SELL". The backend ensure
 * data integrity by preventing the setup of individual "BUY" or "SELL" preferences if a
 * "BOTH" option is also set.
 *
 * ## Preference Hierarchy
 * The price identification follows a hierarchical structure to determine the material price.
 * A lower-level preference always supersedes a higher-order one. The hierarchy is as follows:
 *
 * - Planet Material Preference
 * - Empire Material Preference
 * - Planet Exchange Preference
 * - Empire Exchange Preference
 * - Universe VWAP 30d (fallack)
 *
 * ## Fallback
 * If no preferences are defined at the planet or empire levels matching the price request
 * the system uses the Universe VWAP 30d data
 */

export async function usePrice(
	cxUuid: Ref<string | undefined>,
	planetNaturalId: Ref<string | undefined>
) {
	const planningStore = usePlanningStore();

	const { getExchangeTicker } = await useExchangeData();
	const { getBuilding, getBuildingConstructionMaterials } =
		await useBuildingData();

	/**
	 * Finds the correct price information for given exchange preference
	 * and planet to search for. Applies whole Price Identification Logic
	 * @author jplacht
	 *
	 * @param {string} materialTicker Material Ticker e.g., "RAT"
	 * @param {("BUY" | "SELL")} type Buying or Selling
	 * @returns {number} Price
	 */
	async function getPrice(
		materialTicker: string,
		type: "BUY" | "SELL"
	): Promise<number> {
		try {
			// no cx information, default to UNIVERSE
			if (!cxUuid.value || cxUuid.value === undefined) {
				const price = await getExchangeTicker(
					`${materialTicker}.UNIVERSE`
				);
				return price.vwap_30d;
			}

			// we got cx information with cxUuid
			const cxData: ICXData = planningStore.getCX(cxUuid.value).cx_data;

			// Planet Ticker Path
			if (planetNaturalId && planetNaturalId.value) {
				// find potential planet ticker setting
				const planetTickerPreference = cxData.ticker_planets
					.find((tp) => tp.planet === planetNaturalId.value)
					?.preferences.find(
						(t) =>
							t.ticker === materialTicker &&
							(t.type === type || t.type === "BOTH")
					);

				if (planetTickerPreference) {
					return planetTickerPreference.value;
				}
			}

			// Empire Ticker Path
			const empireTickerPreference = cxData.ticker_empire.find(
				(te) =>
					te.ticker === materialTicker &&
					(te.type === type || te.type === "BOTH")
			);

			if (empireTickerPreference) {
				return empireTickerPreference.value;
			}

			// Planet Exchange Path
			if (planetNaturalId && planetNaturalId.value) {
				// find potential planet exchange setting
				const planetExchangePreference = cxData.cx_planets
					.find((cp) => cp.planet === planetNaturalId.value)
					?.preferences.find(
						(cpp) => cpp.type === type || cpp.type === "BOTH"
					);

				if (planetExchangePreference) {
					const { exchangeCode, key } = getExchangeCodeKey(
						planetExchangePreference.exchange
					);

					const tickerData = await getExchangeTicker(
						`${materialTicker}.${exchangeCode}`
					);

					const price: number = (tickerData[key] ?? 0) as number;
					return price;
				}
			}

			// Empire Exchange Path
			const empireExchangePreference = cxData.cx_empire.find(
				(ee) => ee.type === type || ee.type === "BOTH"
			);

			if (empireExchangePreference) {
				const { exchangeCode, key } = getExchangeCodeKey(
					empireExchangePreference.exchange
				);

				const tickerData = await getExchangeTicker(
					`${materialTicker}.${exchangeCode}`
				);

				const price: number = (tickerData[key] ?? 0) as number;
				return price;
			}

			// None of the path specifics yielded a result, return PP30D_Average fallback
			const tickerData = await getExchangeTicker(
				`${materialTicker}.UNIVERSE`
			);

			const price: number = tickerData.vwap_30d;
			return price;
		} catch (error) {
			if (error instanceof Error) {
				const exchangeError: Error = error;
				console.error(exchangeError);
			}
			return 0;
		}
	}

	/**
	 * Applies price/cost to a MaterialIOMinimal based on passed
	 * cx information
	 * @author jplacht
	 *
	 * @param {IMaterialIOMinimal[]} data Material IO []
	 * @param {("BUY" | "SELL")} type Buying or Selling
	 * @returns {number} Total Price of MaterialIO[]
	 */
	async function getMaterialIOTotalPrice(
		data: IMaterialIOMinimal[],
		type: "BUY" | "SELL"
	): Promise<number> {
		let sum = 0;
		for (const e of data) {
			const price = await getPrice(e.ticker, type);
			sum += price * (e.output - e.input);
		}
		return sum;
	}

	type SplitOption<T> = T extends `${infer Prefix}_${infer Suffix}`
		? [Prefix, Suffix]
		: never;
	type PrefixPart = SplitOption<CX_EXCHANGE_OPTION_TYPE>[0];
	type SuffixPart = SplitOption<CX_EXCHANGE_OPTION_TYPE>[1];

	function splitExchangeOption(option: CX_EXCHANGE_OPTION_TYPE) {
		const [prefix, suffix] = option.split("_") as [PrefixPart, SuffixPart];
		return { prefix, suffix };
	}

	/**
	 * Splits Exchange Preference codes into parts and identifies
	 * the correct key of IExchange to use.
	 * @author jplacht
	 *
	 * @param {string} preference Preference, e.g., "IC1_BUY"
	 * @returns {{
	 * 		exchangeCode: string;
	 * 		key: string;
	 * 	}} Exchange code and value key
	 */
	function getExchangeCodeKey(preference: CX_EXCHANGE_OPTION_TYPE): {
		exchangeCode: string;
		key: string;
	} {
		let exchangeCode: string = "UNIVERSE";
		let key: string = "vwap_30d";

		// split by underscore
		const splitted: string[] = preference.split("_");

		if (splitted.length !== 2) {
			throw new Error(
				`Invalid ExchangeCode input, must be separted by underscore: ${preference}`
			);
		}

		// first part indicates the exchange, second part the time, e.g. AI1_7D

		const { prefix: exchange, suffix: timeframe } =
			splitExchangeOption(preference);

		exchangeCode = exchange;

		if (timeframe == "7D") key = "vwap_7d";
		else key = "vwap_30d";

		return { exchangeCode, key };
	}

	/**
	 * Enhances a minimal Material I/O with pricing information for its delta
	 * @author jplacht
	 *
	 * @param {IMaterialIOMaterial[]} data Minimal Material I/O
	 * @returns {IMaterialIO[]} Material I/O
	 */
	async function enhanceMaterialIOMaterial(
		data: IMaterialIOMaterial[]
	): Promise<IMaterialIO[]> {
		const enhancedArray: IMaterialIO[] = [];

		for (const material of data) {
			const price =
				material.delta >= 0
					? await getPrice(material.ticker, "SELL")
					: await getPrice(material.ticker, "BUY");

			enhancedArray.push({
				...material,
				price: price * material.delta,
			});
		}

		return enhancedArray;
	}

	/**
	 * Calculates all infrastructure buildings construction costs
	 * @author jplacht
	 *
	 * @param {IPlanet} planet Planet Information
	 * @returns {IInfrastructureCosts} Infrastructure Construction Costs
	 */
	async function calculateInfrastructureCosts(
		planet: IPlanet
	): Promise<IInfrastructureCosts> {
		const results: IInfrastructureCosts = {
			HB1: 0,
			HB2: 0,
			HB3: 0,
			HB4: 0,
			HB5: 0,
			HBB: 0,
			HBC: 0,
			HBM: 0,
			HBL: 0,
			STO: 0,
		};

		await Promise.all(
			infrastructureBuildingNames.map(async (buildingTicker) => {
				const building = await getBuilding(buildingTicker);
				const totalPrice = await getMaterialIOTotalPrice(
					getBuildingConstructionMaterials(building, planet),
					"BUY"
				);

				results[buildingTicker] = totalPrice * -1;
			})
		);

		return results;
	}

	return {
		getPrice,
		getMaterialIOTotalPrice,
		getExchangeCodeKey,
		enhanceMaterialIOMaterial,
		calculateInfrastructureCosts,
	};
}
