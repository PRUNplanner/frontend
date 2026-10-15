// Prices
import {
	getExchangeCodeKey,
	type ExchangePriceKey,
	type IPriceSource,
} from "@/features/cx/priceBook";

// Types & Interfaces
import type { CXExchangeOptionType } from "@/features/api/schemas/cxData.schemas";
import type { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";

type Translate = (key: string, named?: Record<string, unknown>) => string;

/** an exchange's colour for its dot, the chart tokens of style.css */
export const CX_DOT_COLOR: Record<EXCHANGES_TYPE, string> = {
	AI1: "var(--color-cx-ai1)",
	CI1: "var(--color-cx-ci1)",
	IC1: "var(--color-cx-ic1)",
	NC1: "var(--color-cx-nc1)",
	UNIVERSE: "var(--color-muted)",
};

/**
 * "NC1 · VWAP 30D", "AI1 · Ask", "Universe · VWAP 30D"
 * @author jplacht
 *
 * @param {EXCHANGES_TYPE} exchange Exchange
 * @param {ExchangePriceKey} key Price basis
 * @param {Translate} t i18n
 * @returns {string} Label
 */
export function exchangeBasisLabel(
	exchange: EXCHANGES_TYPE,
	key: ExchangePriceKey,
	t: Translate
): string {
	return t("exchanges.labels.exchange_basis", {
		exchange:
			exchange === "UNIVERSE" ? t("exchanges.labels.universe") : exchange,
		basis: t(`exchanges.labels.basis.${key}`),
	});
}

/**
 * A stored exchange option as a label, e.g. "AI1_30D" → "AI1 · VWAP 30D"
 *
 * @param {CXExchangeOptionType} option Option
 * @param {Translate} t i18n
 * @returns {string} Label
 */
export function exchangeOptionLabel(
	option: CXExchangeOptionType,
	t: Translate
): string {
	const { exchangeCode, key } = getExchangeCodeKey(option);
	return exchangeBasisLabel(exchangeCode as EXCHANGES_TYPE, key, t);
}

/**
 * Where a price comes from: "Fixed · all planets", "NC1 · VWAP 30D ·
 * planet", "NC1 · Ask · no price"
 *
 * @param {IPriceSource} source Price source
 * @param {Translate} t i18n
 * @returns {string} Label
 */
export function priceSourceLabel(source: IPriceSource, t: Translate): string {
	switch (source.level) {
		case "planet_ticker":
			return t("exchanges.labels.fixed_planet");
		case "empire_ticker":
			return t("exchanges.labels.fixed_all");
		case "unresolved":
			return t("exchanges.labels.unresolved");
	}

	let label = exchangeBasisLabel(source.exchange!, source.key!, t);
	if (source.level === "planet_exchange")
		label = t("exchanges.labels.planet_rule", { label });
	if (source.zero) label = t("exchanges.labels.no_price", { label });
	return label;
}

/**
 * A price is 0 because its exchange rule or Universe has no value for the
 * material, not because the player fixed it at 0
 *
 * @param {IPriceSource} source Price source
 * @returns {boolean} No price
 */
export function isNoPrice(source: IPriceSource): boolean {
	return (
		source.level === "unresolved" ||
		(source.zero &&
			source.level !== "planet_ticker" &&
			source.level !== "empire_ticker")
	);
}
