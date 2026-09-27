import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";

// Stores
import { useMaterialData } from "@/database/services/useMaterialData";

// Types & Interfaces
import type {
	CXDataExchangeOption,
	CXDataTickerOption,
	CXExchangeOptionType,
	CXPreferenceType,
} from "@/features/api/schemas/cxData.schemas";
import type { PSelectOption } from "@/ui/ui.types";

export function useCXManagement() {
	const { t } = useI18n();
	const { materialSelectOptions } = useMaterialData();

	const typeOptions: PSelectOption[] = [
		{
			label: t("exchanges.preference_type.BOTH"),
			value: "BOTH" as CXPreferenceType,
		},
		{
			label: t("exchanges.preference_type.BUY"),
			value: "BUY" as CXPreferenceType,
		},
		{
			label: t("exchanges.preference_type.SELL"),
			value: "SELL" as CXPreferenceType,
		},
	];

	const exchangeOptions: PSelectOption[] = [
		{ label: "AI1 VWAP 7D" as CXExchangeOptionType, value: "AI1_7D" },
		{ label: "NC1 VWAP 7D" as CXExchangeOptionType, value: "NC1_7D" },
		{ label: "CI1 VWAP 7D" as CXExchangeOptionType, value: "CI1_7D" },
		{ label: "IC1 VWAP 7D" as CXExchangeOptionType, value: "IC1_7D" },
		{
			label: "UNIVERSE VWAP 7D" as CXExchangeOptionType,
			value: "UNIVERSE_7D",
		},
		{ label: "AI1 VWAP 30D" as CXExchangeOptionType, value: "AI1_30D" },
		{ label: "NC1 VWAP 30D" as CXExchangeOptionType, value: "NC1_30D" },
		{ label: "CI1 VWAP 30D" as CXExchangeOptionType, value: "CI1_30D" },
		{ label: "IC1 VWAP 30D" as CXExchangeOptionType, value: "IC1_30D" },
		{
			label: "UNIVERSE VWAP 30D" as CXExchangeOptionType,
			value: "UNIVERSE_30D",
		},
		{ label: "AI1 ASK" as CXExchangeOptionType, value: "AI1_ASK" },
		{ label: "AI1 BID" as CXExchangeOptionType, value: "AI1_BID" },
		{ label: "NC1 ASK" as CXExchangeOptionType, value: "NC1_ASK" },
		{ label: "NC1 BID" as CXExchangeOptionType, value: "NC1_BID" },
		{ label: "CI1 ASK" as CXExchangeOptionType, value: "CI1_ASK" },
		{ label: "CI1 BID" as CXExchangeOptionType, value: "CI1_BID" },
		{ label: "IC1 ASK" as CXExchangeOptionType, value: "IC1_ASK" },
		{ label: "IC1 BID" as CXExchangeOptionType, value: "IC1_BID" },
	];

	const materialOptions: PSelectOption[] = materialSelectOptions.value;

	/**
	 * Checks if a specific exchange preference can be set depending
	 * on other existing preferences, makes sure there is either BOTH
	 * or SELL / BUY individually
	 *
	 * @author jplacht
	 *
	 * @param {CXDataExchangeOption[]} current To check preferences
	 * @param {CXPreferenceType} check Type to check for adding
	 * @returns {ComputedRef<boolean>} Check Result
	 */
	const canAddExchangePreference = (
		current: CXDataExchangeOption[],
		check: CXPreferenceType
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
	 * @param {CXDataTickerOption[]} current Current Ticker Preferences
	 * @param {string} checkTicker Ticker to Check
	 * @param {CXPreferenceType} checkType Preference Type to Check
	 * @returns {ComputedRef<boolean>} Check Result
	 */
	const canAddTickerPreference = (
		current: CXDataTickerOption[],
		checkTicker: string,
		checkType: CXPreferenceType
	): ComputedRef<boolean> =>
		computed(() => {
			// check if options exist
			const exist: CXDataTickerOption[] = current.filter(
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
	 * @param {CXDataExchangeOption[]} current Current Preferences
	 * @param {CXPreferenceType} updateType Type to Update
	 * @param {CXExchangeOptionType} updateExchange Exchange to Update
	 * @returns {CXDataExchangeOption[]} Updated Preferences
	 */
	function updateExchangePreference(
		current: CXDataExchangeOption[],
		updateType: CXPreferenceType,
		updateExchange: CXExchangeOptionType
	): CXDataExchangeOption[] {
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
	 * @param {CXDataTickerOption[]} current Current Preferences
	 * @param {string} updateTicker Ticker to Update
	 * @param {CXPreferenceType} updateType Type to Update
	 * @param {number} updateValue Value to Update
	 * @returns {CXDataTickerOption[]} Updated Preferences
	 */
	function updateTickerPreference(
		current: CXDataTickerOption[],
		updateTicker: string,
		updateType: CXPreferenceType,
		updateValue: number
	): CXDataTickerOption[] {
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
	 * @param {CXDataExchangeOption[]} current Current Preferences
	 * @param {CXPreferenceType} deleteType Type to delete
	 * @returns {CXDataExchangeOption[]} Updated Preferences
	 */
	function deleteExchangePreference(
		current: CXDataExchangeOption[],
		deleteType: CXPreferenceType
	): CXDataExchangeOption[] {
		return current.filter((o) => o.type !== deleteType);
	}

	/**
	 * Deletes a Ticker Preference
	 *
	 * @author jplacht
	 *
	 * @param {CXDataTickerOption[]} current Current Preferences
	 * @param {string} deleteTicker Ticker to delete
	 * @param {CXPreferenceType} deleteType Type to delete
	 * @returns {CXDataTickerOption[]} Updated Preferences
	 */
	function deleteTickerPreference(
		current: CXDataTickerOption[],
		deleteTicker: string,
		deleteType: CXPreferenceType
	): CXDataTickerOption[] {
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
