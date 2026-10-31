// Types & Interfaces
import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";
import type { IPlanDiffable } from "@/features/planning_data/planDiff";

type Translate = (
	key: string,
	params?: Record<string, string | number>
) => string;

const DAY_MS = 86_400_000;

/**
 * A version's or a draft's plan state, as the history serializes it
 *
 * @param {IPlanDiffable} version Version or draft
 * @returns {string} Serialized state
 */
export function versionState(version: IPlanDiffable): string {
	return JSON.stringify({
		plan_name: version.plan_name || undefined,
		plan_cogc: version.plan_cogc,
		plan_corphq: version.plan_corphq,
		plan_permits_used: version.plan_permits_used,
		plan_data: version.plan_data,
	});
}

/**
 * Whole days since a version was saved, for analytics
 *
 * @param {PlanVersionListItem} version Version
 * @returns {number} Age in days
 */
export function versionAgeDays(version: PlanVersionListItem): number {
	return Math.floor((Date.now() - Date.parse(version.created_at)) / DAY_MS);
}

/**
 * When, as the save control and the versions list say it: the time
 * today ("14:02", or "Today 14:02" with `today`), "Yesterday 22:10",
 * else "12 Oct 18:20"
 *
 * @param {Date | string} value Date or ISO string
 * @param {Translate} t i18n translate
 * @param {boolean} [today] Say "Today" for today
 * @returns {string} Text
 */
export function formatWhen(
	value: Date | string,
	t: Translate,
	today: boolean = false
): string {
	const date: Date = typeof value === "string" ? new Date(value) : value;
	const time: string = date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
	const days: number = Math.round(
		(startOfDay(new Date()) - startOfDay(date)) / DAY_MS
	);

	if (days === 0)
		return today ? t("plan.versions.when.today", { time }) : time;
	if (days === 1) return t("plan.versions.when.yesterday", { time });
	return `${date.toLocaleDateString([], { day: "numeric", month: "short" })} ${time}`;
}

function startOfDay(date: Date): number {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate()
	).getTime();
}

/**
 * A version's name, or when it was saved for an unnamed one
 *
 * @param {PlanVersionListItem} version Version
 * @param {Translate} t i18n translate
 * @returns {string} Label
 */
export function versionLabel(
	version: PlanVersionListItem,
	t: Translate
): string {
	return version.name || formatWhen(version.created_at, t, true);
}
