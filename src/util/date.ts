import dayjs from "dayjs";

import { i18n } from "@/lib/i18n";
import utc from "dayjs/plugin/utc";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(duration);
dayjs.extend(relativeTime);

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
	if (!Number.isFinite(value)) return i18n.global.t("common.values.never");

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

export function relativeFromDate(
	value: Date | number | undefined,
	isUTC: boolean = false,
	short: boolean = false
): string {
	if (value === undefined) return "—";

	const instance = isUTC ? dayjs.utc(value).local() : dayjs(value);
	const result = instance.fromNow();

	if (short) {
		return result
			.replace(" ago", "")
			.replace("a few seconds", "1s")
			.replace("a minute", "1m")
			.replace(" minutes", "m")
			.replace("an hour", "1h")
			.replace(" hours", "h");
	}

	return result;
}
