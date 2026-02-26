import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(duration);
dayjs.extend(relativeTime);

/**
 * Calculates the difference in minutes between two dates
 * @author jplacht
 *
 * @export
 * @param {(Date | undefined)} start Start Date
 * @param {Date | undefined } end End Date
 * @returns {number} Difference in minutes, 0 if one input is undefined
 */
export function getDifferenceMinutes(
	start: Date | undefined,
	end: Date | undefined
): number {
	if (!start || !end) {
		return 0;
	}

	return (start.getTime() - end.getTime()) / 1000 / 60;
}

/**
 * Gets the unix timestamp for a given date as string
 * @author jplacht
 *
 * @export
 * @param {string} value Date as string, e.g. 2025-05-01
 * @returns {number} Unix timestamp
 */
export function timestampFromString(value: string | number): number {
	return dayjs(value).valueOf();
}

/**
 * Formats a date to string
 * @author jplacht
 *
 * @export
 * @param {Date} value Date
 * @param {string} [format="YYYY-MM-DD"] Date output format
 * @returns {string} Date as String
 */
export function formatDate(value: Date, format: string = "YYYY-MM-DD"): string {
	return dayjs(value).format(format);
}

/**
 * Humanizes a time
 * @author jplacht
 *
 * @export
 * @param {number} value Time in Ms
 * @returns {string} Humanized time
 */
export function humanizeTimeMs(value: number): string {
	if (value === Infinity || isNaN(value)) return "∞";

	const mduration = dayjs.duration(value, "milliseconds");

	const years: number = mduration.years();
	const months: number = mduration.months();
	const days: number = mduration.days();
	const hours: number = mduration.hours();
	const minutes: number = mduration.minutes();

	if (years > 0) {
		return `${years}y ${months}m ${days}d ${hours}h ${minutes}m`;
	} else if (months > 0) {
		return `${months}m ${days}d ${hours}h ${minutes}m`;
	} else if (days > 0) {
		return `${days}d ${hours}h ${minutes}m`;
	} else {
		return `${hours}h ${minutes}m`;
	}
}

/**
 * Gets the relative time from date till now
 * @author jplacht
 *
 * @export
 * @param {(Date | undefined)} value Date
 * @returns {string} Relative, humanized time
 */
export function relativeFromDate(
	value: Date | number | undefined,
	isUTC: boolean = false
): string {
	if (value === undefined) return "—";

	if (isUTC) return dayjs(value).utc(true).local().fromNow();

	return dayjs(value).fromNow();
}
