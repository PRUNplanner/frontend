// Util
import { deepClone } from "@/util/data";
import { formatNumber, formatPayback } from "@/util/numbers";
import { diffPlan, type IPlanDiffable } from "@/features/planning_data/planDiff";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type {
	IOverviewData,
	IPlanResult,
} from "@/features/planning/usePlanCalculation.types";
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";
import type {
	IBuildingChange,
	IPlanChanges,
	IPlanFigures,
	ISharedSummaryInput,
} from "@/features/sharing/sharedPlan.types";

/** Discord's message limit */
export const SUMMARY_LIMIT: number = 2000;

/**
 * A shared plan as the viewer's working copy: without uuid, empires and
 * save version nothing of it is keyed to the owner's plan
 *
 * @author jplacht
 *
 * @param {Plan} plan Shared plan
 * @returns {IPlanDefinition} Working copy
 */
export function toWorkingCopy(plan: Plan): IPlanDefinition {
	const {
		uuid: _uuid,
		empires: _empires,
		modified_at: _modifiedAt,
		...rest
	} = deepClone(plan);
	return { ...rest, uuid: undefined };
}

/**
 * The shared plan is one of the viewer's own plans
 */
export function isOwnPlan(plans: { uuid: string }[], uuid: string): boolean {
	return plans.some((p) => p.uuid === uuid);
}

/**
 * The figures a shared plan and its copy are compared by
 *
 * @param {IPlanResult} result Plan result
 * @param {IOverviewData} overview Plan overview
 * @returns {IPlanFigures} Figures
 */
export function planFigures(
	result: IPlanResult,
	overview: IOverviewData
): IPlanFigures {
	return {
		profit: overview.profit,
		roi: overview.roi,
		area: result.area.areaUsed,
		workforce: Object.values(result.workforce).reduce(
			(sum, w) => sum + w.required,
			0
		),
		buildings: result.production.buildings.reduce(
			(sum, b) => sum + b.amount,
			0
		),
	};
}

/**
 * Per building what changed from the shared plan, and the buildings it
 * no longer has
 *
 * @param {IPlanDiffable} from Shared plan
 * @param {IPlanDiffable} to Working copy
 * @returns {IPlanChanges} Changes
 */
export function buildingChanges(
	from: IPlanDiffable,
	to: IPlanDiffable
): IPlanChanges {
	const buildings: Record<string, IBuildingChange> = {};
	const removed: string[] = [];

	diffPlan(from, to).forEach((line) => {
		if (!line.area.startsWith("building:")) return;
		const name = line.params.label as string;
		if (line.key === "removed") return removed.push(name);
		buildings[name] ??= { kinds: [], newRecipes: [] };
		buildings[name].kinds.push(line.key as IBuildingChange["kinds"][0]);
	});

	// recipes the shared building didn't have
	Object.entries(buildings).forEach(([name, change]) => {
		if (!change.kinds.includes("recipe")) return;
		const before = new Set(
			from.plan_data.buildings
				.find((b) => b.name === name)
				?.active_recipes.map((r) => r.recipeid)
		);
		change.newRecipes = to.plan_data.buildings
			.find((b) => b.name === name)!
			.active_recipes.map((r) => r.recipeid)
			.filter((id) => !before.has(id));
	});

	return { buildings, removed };
}

/**
 * Discord markdown of the changes: name and planet, one line per change,
 * profit and ROI before and after, the price source and the share link,
 * cut to Discord's limit with "…and N more"
 *
 * @param {ISharedSummaryInput} input Summary parts
 * @param t i18n translate
 * @param {number} limit Maximum length
 * @returns {string} Summary
 */
export function buildChangeSummary(
	input: ISharedSummaryInput,
	t: (key: string, params?: Record<string, string | number>) => string,
	limit: number = SUMMARY_LIMIT
): string {
	const lineText = (line: IChangeLine): string =>
		line.key === "recipe"
			? t("sharing.changes.recipe", line.params)
			: t(`save_conflict.change.${line.key}`, line.params);

	const header: string = `**${input.name}** (${input.planet})`;
	const lines: string[] = input.changes.map((l) => `- ${lineText(l)}`);
	const footer: string[] = [
		t("sharing.changes.profit", {
			from: formatNumber(input.before.profit, 0),
			to: formatNumber(input.after.profit, 0),
		}),
		t("sharing.changes.roi", {
			from: formatPayback(input.before.roi),
			to: formatPayback(input.after.roi),
		}),
		t("sharing.changes.prices", { source: input.priceSource }),
		input.url,
	];

	const join = (body: string[]): string =>
		[header, ...body, "", ...footer].join("\n");

	let text: string = join(lines);
	for (let kept = lines.length - 1; text.length > limit && kept >= 0; kept--)
		text = join([
			...lines.slice(0, kept),
			`- ${t("sharing.changes.more", { n: lines.length - kept })}`,
		]);
	return text;
}
