// Types & Interfaces
import type {
	CXDataExchangeOption,
	CXExchangeOptionType,
} from "@/features/api/schemas/cxData.schemas";
import type { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";

/*
 * The exchange rule of one scope (all planets or a planet) as the
 * controls show it, and back. The stored shape allows BOTH, or BUY and / or
 * SELL, never BOTH together with BUY or SELL; the controls can't produce
 * anything else.
 */

export type ExchangeBasis = "7D" | "30D" | "ASK" | "BID";
export type ExchangeRuleMode = "inherit" | "same" | "separate";

export interface IExchangeChoice {
	exchange: EXCHANGES_TYPE;
	basis: ExchangeBasis;
}

export interface IExchangeRuleState {
	mode: ExchangeRuleMode;
	// "same": the BOTH rule; "separate": the BUY and SELL rules
	both: IExchangeChoice | null;
	buy: IExchangeChoice | null;
	sell: IExchangeChoice | null;
}

export const RULE_EXCHANGES: EXCHANGES_TYPE[] = [
	"AI1",
	"CI1",
	"IC1",
	"NC1",
	"UNIVERSE",
];

/**
 * Bases an exchange offers: Universe has no order book
 *
 * @param {EXCHANGES_TYPE} exchange Exchange
 * @returns {ExchangeBasis[]} Bases
 */
export function basesFor(exchange: EXCHANGES_TYPE): ExchangeBasis[] {
	return exchange === "UNIVERSE"
		? ["7D", "30D"]
		: ["7D", "30D", "ASK", "BID"];
}

/**
 * A choice as stored option; Universe with Ask or Bid becomes VWAP 30D
 *
 * @param {IExchangeChoice} choice Exchange and basis
 * @returns {CXExchangeOptionType} Option, e.g. "NC1_30D"
 */
export function toOption(choice: IExchangeChoice): CXExchangeOptionType {
	const basis = basesFor(choice.exchange).includes(choice.basis)
		? choice.basis
		: "30D";
	return `${choice.exchange}_${basis}` as CXExchangeOptionType;
}

/**
 * A stored option as choice, e.g. "NC1_ASK" → NC1, ASK
 *
 * @param {CXExchangeOptionType} option Option
 * @returns {IExchangeChoice} Choice
 */
export function toChoice(option: CXExchangeOptionType): IExchangeChoice {
	const [exchange, basis] = option.split("_");
	return {
		exchange: exchange as EXCHANGES_TYPE,
		basis: basis as ExchangeBasis,
	};
}

/**
 * Reads a scope's stored exchange rules into control state
 *
 * @param {CXDataExchangeOption[]} options Stored rules
 * @param {boolean} isPlanet A planet scope, which can inherit
 * @returns {IExchangeRuleState} State
 */
export function readRule(
	options: CXDataExchangeOption[],
	isPlanet: boolean
): IExchangeRuleState {
	const find = (type: string) => {
		const o = options.find((e) => e.type === type);
		return o ? toChoice(o.exchange) : null;
	};
	const both = find("BOTH");
	if (both) return { mode: "same", both, buy: null, sell: null };

	const buy = find("BUY");
	const sell = find("SELL");
	if (buy || sell) return { mode: "separate", both: null, buy, sell };

	return {
		mode: isPlanet ? "inherit" : "same",
		both: null,
		buy: null,
		sell: null,
	};
}

/**
 * Writes control state as stored rules: inherit stores none, same one
 * BOTH, separate a BUY and / or a SELL
 *
 * @param {IExchangeRuleState} state State
 * @returns {CXDataExchangeOption[]} Stored rules
 */
export function writeRule(state: IExchangeRuleState): CXDataExchangeOption[] {
	if (state.mode === "inherit") return [];
	if (state.mode === "same")
		return state.both
			? [{ type: "BOTH", exchange: toOption(state.both) }]
			: [];

	const options: CXDataExchangeOption[] = [];
	if (state.buy) options.push({ type: "BUY", exchange: toOption(state.buy) });
	if (state.sell)
		options.push({ type: "SELL", exchange: toOption(state.sell) });
	return options;
}

/**
 * Switches the mode, keeping the chosen exchange where it can
 *
 * @param {IExchangeRuleState} state Current state
 * @param {ExchangeRuleMode} mode New mode
 * @param {IExchangeChoice | null} inherited The rule a planet inherits,
 * a starting point when it gets its own
 * @returns {IExchangeRuleState} New state
 */
export function switchMode(
	state: IExchangeRuleState,
	mode: ExchangeRuleMode,
	inherited: IExchangeChoice | null = null
): IExchangeRuleState {
	if (mode === state.mode) return state;
	const current = state.both ?? state.buy ?? state.sell ?? inherited;
	if (mode === "inherit")
		return { mode, both: null, buy: null, sell: null };
	if (mode === "same")
		return { mode, both: current, buy: null, sell: null };
	return {
		mode,
		both: null,
		buy: state.both ?? state.buy ?? inherited,
		sell: state.both ?? state.sell ?? inherited,
	};
}

/**
 * The exchange presets work on: the scope's own, else the all-planets
 * one, else NC1
 *
 * @param {CXDataExchangeOption[]} scope Scope's rules
 * @param {CXDataExchangeOption[]} allPlanets All-planets rules
 * @returns {EXCHANGES_TYPE} Exchange
 */
export function presetExchange(
	scope: CXDataExchangeOption[],
	allPlanets: CXDataExchangeOption[]
): EXCHANGES_TYPE {
	const first = scope[0] ?? allPlanets[0];
	return first ? toChoice(first.exchange).exchange : "NC1";
}

/**
 * "Average · VWAP 30D": one BOTH rule on the exchange
 *
 * @param {EXCHANGES_TYPE} exchange Exchange
 * @returns {CXDataExchangeOption[]} Rules
 */
export function presetAverage(
	exchange: EXCHANGES_TYPE
): CXDataExchangeOption[] {
	return [{ type: "BOTH", exchange: toOption({ exchange, basis: "30D" }) }];
}

/**
 * "Trade now · buy Ask, sell Bid"; Universe has no order book
 *
 * @param {EXCHANGES_TYPE} exchange Exchange, not Universe
 * @returns {CXDataExchangeOption[]} Rules
 */
export function presetTradeNow(
	exchange: Exclude<EXCHANGES_TYPE, "UNIVERSE">
): CXDataExchangeOption[] {
	return [
		{ type: "BUY", exchange: toOption({ exchange, basis: "ASK" }) },
		{ type: "SELL", exchange: toOption({ exchange, basis: "BID" }) },
	];
}
