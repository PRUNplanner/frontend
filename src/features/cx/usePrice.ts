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
import { ICXData } from "@/stores/planningStore.types";
import { infrastructureBuildingNames } from "@/features/planning/calculations/infrastructureCalculations";
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
 * - PP30D_Universe (fallack)
 *
 * ## Fallback
 * If no preferences are defined at the planet or empire levels matching the price request
 * the system uses the PP30D_Universe data to return the PriceAverage
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
	 * @param {(Ref<IPriceCXInformation> | undefined)} cx CX and Planet Information
	 * @returns {number} Price
	 */
	async function getPrice(
		materialTicker: string,
		type: "BUY" | "SELL"
	): Promise<number> {
		try {
			// if any cx information is undefined, we return the PP30D_Universe PriceAverage
			if (!cxUuid.value || cxUuid.value === undefined) {
				const price = await getExchangeTicker(
					`${materialTicker}.PP30D_UNIVERSE`
				);
				return price.PriceAverage ?? 0;
			}

			// we got cx information with cxUuid and/or planetNaturalId
			// apply identification logic and return the price

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

				// found planet ticker setting
				if (planetTickerPreference) {
					const price: number = planetTickerPreference.value;
					return price;
				}
			}

			// Material Ticker Path

			const empireTickerPreference = cxData.ticker_empire.find(
				(te) =>
					te.ticker === materialTicker &&
					(te.type === type || te.type === "BOTH")
			);
			if (empireTickerPreference) {
				const price: number = empireTickerPreference.value;
				return price;
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
				`${materialTicker}.PP30D_UNIVERSE`
			);

			const price: number = tickerData.PriceAverage ?? 0;
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
	 * @param {(Ref<IPriceCXInformation> | undefined)} cx CX Information
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
	function getExchangeCodeKey(preference: string): {
		exchangeCode: string;
		key: string;
	} {
		let exchangeCode: string = "PP30D_UNIVERSE";
		let key: string = "PriceAverage";

		// split by underscore
		const splitted: string[] = preference.split("_");

		if (splitted.length !== 2) {
			throw new Error(
				`Invalid ExchangeCode input, must be separted by underscore: ${preference}`
			);
		}

		/**
		 * If first part is PP7D or PP30D, it's the price average of those tickers
		 * If second part is UNIVERSE, it's the universe price and price average
		 */
		if (
			splitted[1] === "UNIVERSE" ||
			splitted[0] === "PP7D" ||
			splitted[0] === "PP30D"
		) {
			return { exchangeCode: preference, key: "PriceAverage" };
		}

		if (
			["AI1", "IC1", "CI1", "NC1", "NC2"].includes(splitted[0]) &&
			["BUY", "SELL", "AVG"].includes(splitted[1])
		) {
			// we got an individual cx preference and correct key type

			exchangeCode = splitted[0];

			if (splitted[1] === "BUY") key = "Ask";
			else if (splitted[1] === "SELL") key = "Bid";
			else key = "PriceAverage";

			return { exchangeCode, key };
		}

		// If nothing matched, also fallback to PP30D_UNIVERSE and PriceAverage
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
			STA: 0,
			STE: 0,
			STV: 0,
			STW: 0,
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
