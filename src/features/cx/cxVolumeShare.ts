// Types & Interfaces
import { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";
import {
	CX_VOLUME_LEVEL,
	ICXVolumeShare,
	ICXVolumeThresholds,
	ICXVolumeWindow,
} from "@/features/cx/cxVolumeShare.types";

/** Share of daily traded volume, in percent, that turns a row yellow */
export const CX_VOLUME_YELLOW_PERCENT: number = 5;
/** Share of daily traded volume, in percent, that turns a row red */
export const CX_VOLUME_RED_PERCENT: number = 15;

/**
 * Units traded over 7 days at or below which the exchange counts as
 * illiquid: any sale worth mentioning moves a market this thin, so it is
 * warned about directly instead of through a share whose denominator is
 * meaningless — or zero — down here
 */
export const CX_VOLUME_ILLIQUID_7D: number = 10;

/** Units per week below which a sale never warns at all */
export const CX_VOLUME_MIN_WEEKLY_SOLD: number = 1;

/** Every exchange the game data carries a traded volume for */
export const CX_VOLUME_EXCHANGES: EXCHANGES_TYPE[] = [
	"AI1",
	"CI1",
	"IC1",
	"NC1",
	"UNIVERSE",
];

/**
 * Calculates one traded volume window measured against a daily sale
 * @author raukk
 *
 * @export
 * @param {number} soldPerDay Units per day sold to the exchange
 * @param {number} sumTraded Units traded over the whole window
 * @param {number} days Length of the window in days
 * @returns {ICXVolumeWindow} Window with its share
 */
export function volumeWindow(
	soldPerDay: number,
	sumTraded: number,
	days: number
): ICXVolumeWindow {
	const perDay: number = sumTraded / days;

	return {
		sumTraded,
		days,
		share: perDay > 0 ? soldPerDay / perDay : undefined,
	};
}

/**
 * Severity a single share carries on its own
 * @author raukk
 *
 * @export
 * @param {number | undefined} share Share of daily traded volume
 * @param {ICXVolumeThresholds} thresholds Colour thresholds in percent
 * @returns {CX_VOLUME_LEVEL} Severity
 */
export function levelOfShare(
	share: number | undefined,
	thresholds: ICXVolumeThresholds
): CX_VOLUME_LEVEL {
	if (share === undefined) return "none";

	const percent: number = share * 100;

	if (percent >= thresholds.redPercent) return "red";
	if (percent >= thresholds.yellowPercent) return "yellow";

	return "none";
}

/**
 * The worse of two severities
 * @author raukk
 *
 * @export
 * @param {CX_VOLUME_LEVEL} a First severity
 * @param {CX_VOLUME_LEVEL} b Second severity
 * @returns {CX_VOLUME_LEVEL} Worse of the two
 */
export function worstLevel(
	a: CX_VOLUME_LEVEL,
	b: CX_VOLUME_LEVEL
): CX_VOLUME_LEVEL {
	if (a === "red" || b === "red") return "red";
	if (a === "yellow" || b === "yellow") return "yellow";

	return "none";
}

/** Traded sums of one ticker on the exchange the sale lands on */
export interface ICXVolumeSums {
	sumTraded7d: number;
	sumTraded30d: number;
}

/**
 * Calculates a material row's pressure on the exchange it is sold at.
 * Both windows are computed and the worse of the two colours the row:
 * 7d catches the market as it stands, 30d catches a ticker that has
 * just gone quiet and whose 7d window is no longer representative
 * @author raukk
 *
 * @export
 * @param {string} ticker Material ticker
 * @param {EXCHANGES_TYPE} exchange Exchange the row is sold at
 * @param {number} soldPerDay Units per day reaching that exchange
 * @param {ICXVolumeSums} sums Traded sums of the ticker
 * @param {ICXVolumeThresholds} thresholds Colour thresholds in percent
 * @returns {ICXVolumeShare} Shares and severity of the row
 */
export function calculateCXVolumeShare(
	ticker: string,
	exchange: EXCHANGES_TYPE,
	soldPerDay: number,
	sums: ICXVolumeSums,
	thresholds: ICXVolumeThresholds
): ICXVolumeShare {
	const window7d: ICXVolumeWindow = volumeWindow(
		soldPerDay,
		sums.sumTraded7d,
		7
	);
	const window30d: ICXVolumeWindow = volumeWindow(
		soldPerDay,
		sums.sumTraded30d,
		30
	);

	// too small a sale to warn about, whatever the exchange looks like
	const worthWarning: boolean =
		soldPerDay > 0 && soldPerDay * 7 >= CX_VOLUME_MIN_WEEKLY_SOLD;

	const illiquid: boolean =
		worthWarning && sums.sumTraded7d < CX_VOLUME_ILLIQUID_7D;

	const level: CX_VOLUME_LEVEL = !worthWarning
		? "none"
		: illiquid
			? "red"
			: worstLevel(
					levelOfShare(window7d.share, thresholds),
					levelOfShare(window30d.share, thresholds)
				);

	return {
		ticker,
		exchange,
		soldPerDay,
		window7d,
		window30d,
		illiquid,
		level,
	};
}
