import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";

// Util
import { cogcTextMapping } from "@/features/planning_data/usePlan";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type { InfrastructureType } from "@/features/api/schemas/planningData.schemas";
import type { ElementId } from "@/features/planning/layout/planLayout.types";
import type { IPlanViewContext } from "@/features/planning/usePlanView.types";

/**
 * The status line a folded part shows after its title, so a folded part
 * still says where it stands: "COGC METAL · 3 permits",
 * "PIO 100 % · SET 87 %", "Agri 1 · Chem 4"
 * @author jplacht
 *
 * @param {IPlanViewContext} view The plan page's state
 * @returns {ComputedRef<Partial<Record<ElementId, string>>>} Line per element
 */
export function usePlanFoldSummaries(
	view: IPlanViewContext
): ComputedRef<Partial<Record<ElementId, string>>> {
	const { t } = useI18n();
	const { result, overviewData } = view.calculation;
	const { ioTotals, refIOSource } = view.io;

	const line = (parts: (string | undefined)[]): string =>
		parts.filter(Boolean).join(" · ");

	return computed(() => {
		const r = result.value;
		const empireName = view.empire.list.value?.find(
			(e) => e.uuid === view.empire.uuid.value
		)?.empire_name;
		const buildings = r.production.buildings;
		const amount = (label: string, value: number) =>
			`${t(label)} ${formatNumber(value)}`;

		return {
			// the empire it calculates with, nothing else
			empire: empireName,
			planet: t(
				"plan.base.planet.summary",
				{ cogc: t(cogcTextMapping[r.cogc]), n: r.area.permits },
				r.area.permits
			),
			// the efficiency of each tier the plan needs
			workforce: line(
				Object.values(r.workforce)
					.filter((w) => w.required > 0)
					.map(
						(w) =>
							`${t(`plan.results.tier_short.${w.name}`)} ${formatNumber(w.efficiency * 100, 0)} %`
					)
			),
			housing: line([
				...(
					Object.entries(r.infrastructure) as [
						InfrastructureType,
						number,
					][]
				)
					.filter(([, n]) => n > 0)
					.map(([inf, n]) => `${n} ${inf}`),
				view.autoOptimizeHabs.value
					? t("plan.base.housing.auto")
					: undefined,
			]),
			// the experts placed, per field
			experts: line(
				Object.values(r.experts)
					.filter((e) => e.amount > 0)
					.map(
						(e) =>
							`${t(`plan.results.expert_short.${e.name}`)} ${e.amount}`
					)
			),
			production: t("plan.production.counts", {
				buildings: buildings.length,
				units: buildings.reduce((s, b) => s + b.amount, 0),
				recipes: buildings.reduce(
					(s, b) => s + b.activeRecipes.length,
					0
				),
			}),
			// with every source the profit, as the totals' last line
			"material-io-totals":
				refIOSource.value === "all"
					? amount("plan.io.profit", overviewData.value.profit)
					: line([
							amount("plan.io.exports", ioTotals.value.exports),
							amount("plan.io.imports", ioTotals.value.imports),
						]),
		};
	});
}
