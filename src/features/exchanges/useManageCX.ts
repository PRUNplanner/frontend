import { computed, ComputedRef } from "vue";

// Stores
import { useMaterialData } from "@/database/services/useMaterialData";

// Types & Interfaces
import {
	ICXDataExchangeOption,
	ICXDataTickerOption,
} from "@/stores/planningStore.types";
import {
	ExchangeType,
	PreferenceType,
} from "@/features/exchanges/manageCX.types";
import { PSelectOption } from "@/ui/ui.types";

export const exchangeLabels: Record<ExchangeType, string> = {
	"AI1_BUY": "AI1 ask",
	"AI1_SELL": "AI1 bid",
	"AI1_AVG": "AI1 last",
	"IC1_BUY": "IC1 ask",
	"IC1_SELL": "IC1 bid",
	"IC1_AVG": "IC1 last",
	"CI1_BUY": "CI1 ask",
	"CI1_SELL": "CI1 bid",
	"CI1_AVG": "CI1 last",
	"CI2_BUY": "CI2 ask",
	"CI2_SELL": "CI2 bid",
	"CI2_AVG": "CI2 last",
	"NC1_BUY": "NC1 ask",
	"NC1_SELL": "NC1 bid",
	"NC1_AVG": "NC1 last",
	"NC2_BUY": "NC2 ask",
	"NC2_SELL": "NC2 bid",
	"NC2_AVG": "NC2 last",
	"PP7D_AI1": "PP7D AI1",
	"PP7D_IC1": "PP7D IC1",
	"PP7D_CI1": "PP7D CI1",
	"PP7D_CI2": "PP7D CI2",
	"PP7D_NC1": "PP7D NC1",
	"PP7D_NC2": "PP7D NC2",
	"PP30D_AI1": "PP30D AI1",
	"PP30D_IC1": "PP30D IC1",
	"PP30D_CI1": "PP30D CI1",
	"PP30D_CI2": "PP30D CI2",
	"PP30D_NC1": "PP30D NC1",
	"PP30D_NC2": "PP30D NC2",
	"PP7D_UNIVERSE": "PP7D universe",
	"PP30D_UNIVERSE": "PP30D universe",
} as const;

export async function useCXManagement() {
	const { materialSelectOptions } = useMaterialData();

	const typeOptions: PSelectOption[] = [
		{ label: "BOTH" as PreferenceType, value: "BOTH" },
		{ label: "BUY" as PreferenceType, value: "BUY" },
		{ label: "SELL" as PreferenceType, value: "SELL" },
	];

	const exchangeOptions = computed(() =>
		Object.entries(exchangeLabels).map(([value, label]) => ({label, value}))
	);

	const materialOptions: PSelectOption[] = materialSelectOptions.value;

	/**
	 * Checks if a specific exchange preference can be set depending
	 * on other existing preferences, makes sure there is either BOTH
	 * or SELL / BUY individually
	 *
	 * @author jplacht
	 *
	 * @param {ICXDataExchangeOption[]} current To check preferences
	 * @param {PreferenceType} check Type to check for adding
	 * @returns {ComputedRef<boolean>} Check Result
	 */
	const canAddExchangePreference = (
		current: ICXDataExchangeOption[],
		check: PreferenceType
	): ComputedRef<boolean> =>
		computed(() => {
			if (current.length === 0) return true;

			const types = current.map((e) => e.type);
			if (check === "BOTH") {
				return !types.includes("SELL") && !types.includes("BUY");
			}
			if (check === "BUY" || check === "SELL") {
				return !types.includes("BOTH");
			}

			return false;
		});

	/**
	 * Checks if a specific tickers preference can be set depending on
	 * other existing preferences for this ticker, makes sure that there
	 * is either a BOTH or SELL / BUY individually
	 *
	 * @author jplacht
	 *
	 * @param {ICXDataTickerOption[]} current Current Ticker Preferences
	 * @param {string} checkTicker Ticker to Check
	 * @param {PreferenceType} checkType Preference Type to Check
	 * @returns {ComputedRef<boolean>} Check Result
	 */
	const canAddTickerPreference = (
		current: ICXDataTickerOption[],
		checkTicker: string,
		checkType: PreferenceType
	): ComputedRef<boolean> =>
		computed(() => {
			// check if options exist
			const exist: ICXDataTickerOption[] = current.filter(
				(e) => e.ticker === checkTicker
			);

			if (exist.length === 0) return true;

			const existingTypes = exist.map((e) => e.type);
			if (checkType === "BOTH") {
				return (
					!existingTypes.includes("SELL") &&
					!existingTypes.includes("BUY")
				);
			} else if (checkType === "BUY" || checkType === "SELL") {
				return !existingTypes.includes("BOTH");
			}

			return false;
		});

	/**
	 * Updates an Exchange preference if allowed by either adding
	 * or replacing it.
	 *
	 * @author jplacht
	 *
	 * @param {ICXDataExchangeOption[]} current Current Preferences
	 * @param {PreferenceType} updateType Type to Update
	 * @param {ExchangeType} updateExchange Exchange to Update
	 * @returns {ICXDataExchangeOption[]} Updated Preferences
	 */
	function updateExchangePreference(
		current: ICXDataExchangeOption[],
		updateType: PreferenceType,
		updateExchange: ExchangeType
	): ICXDataExchangeOption[] {
		if (canAddExchangePreference(current, updateType).value) {
			const existing = current.find((e) => e.type === updateType);
			if (existing) existing.exchange = updateExchange;
			else {
				current.push({ type: updateType, exchange: updateExchange });
			}
		}

		return current;
	}

	/**
	 * Updates a Ticker preference if allowed by either adding or
	 * overwriting it
	 *
	 * @author jplacht
	 *
	 * @param {ICXDataTickerOption[]} current Current Preferences
	 * @param {string} updateTicker Ticker to Update
	 * @param {PreferenceType} updateType Type to Update
	 * @param {number} updateValue Value to Update
	 * @returns {ICXDataTickerOption[]} Updated Preferences
	 */
	function updateTickerPreference(
		current: ICXDataTickerOption[],
		updateTicker: string,
		updateType: PreferenceType,
		updateValue: number
	): ICXDataTickerOption[] {
		if (canAddTickerPreference(current, updateTicker, updateType).value) {
			const existing = current.find(
				(e) => e.ticker === updateTicker && e.type === updateType
			);
			if (existing) {
				existing.type = updateType;
				existing.value = updateValue;
			} else {
				current.push({
					ticker: updateTicker,
					type: updateType,
					value: updateValue,
				});
			}
		}

		return current;
	}

	/**
	 * Deletes an Exchange Preference Type
	 *
	 * @author jplacht
	 *
	 * @param {ICXDataExchangeOption[]} current Current Preferences
	 * @param {PreferenceType} deleteType Type to delete
	 * @returns {ICXDataExchangeOption[]} Updated Preferences
	 */
	function deleteExchangePreference(
		current: ICXDataExchangeOption[],
		deleteType: PreferenceType
	): ICXDataExchangeOption[] {
		return current.filter((o) => o.type !== deleteType);
	}

	/**
	 * Deletes a Ticker Preference
	 *
	 * @author jplacht
	 *
	 * @param {ICXDataTickerOption[]} current Current Preferences
	 * @param {string} deleteTicker Ticker to delete
	 * @param {PreferenceType} deleteType Type to delete
	 * @returns {ICXDataTickerOption[]} Updated Preferences
	 */
	function deleteTickerPreference(
		current: ICXDataTickerOption[],
		deleteTicker: string,
		deleteType: PreferenceType
	): ICXDataTickerOption[] {
		return current.filter(
			(o) => !(o.ticker === deleteTicker && o.type === deleteType)
		);
	}

	return {
		typeOptions,
		exchangeOptions,
		materialOptions,
		canAddExchangePreference,
		canAddTickerPreference,
		updateExchangePreference,
		updateTickerPreference,
		deleteExchangePreference,
		deleteTickerPreference,
	};
}
