import { isEqual } from "lodash-es";

// Util
import { diffByKey } from "@/features/save_conflict/saveConflict.util";

// Types & Interfaces
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type { PlanDataBuilding } from "@/features/api/schemas/planningData.schemas";
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";

/** The saved fields of a plan */
export type IPlanDiffable = Pick<
	IPlanDefinition,
	| "plan_name"
	| "plan_cogc"
	| "plan_corphq"
	| "plan_permits_used"
	| "plan_data"
>;

/**
 * Amount per key, missing and zero are the same
 */
function amounts<T>(
	items: T[],
	keyOf: (item: T) => string,
	amountOf: (item: T) => number
): Map<string, number> {
	const map = new Map<string, number>();
	items.forEach((item) => {
		if (amountOf(item) > 0) map.set(keyOf(item), amountOf(item));
	});
	return map;
}

/**
 * Lines for amounts by key: added, removed or changed
 */
function amountLines(
	area: string,
	from: Map<string, number>,
	to: Map<string, number>
): IChangeLine[] {
	const lines: IChangeLine[] = [];
	for (const label of new Set([...from.keys(), ...to.keys()])) {
		const before = from.get(label) ?? 0;
		const after = to.get(label) ?? 0;
		if (before === after) continue;

		const lineArea = `${area}:${label}`;
		if (before === 0)
			lines.push({
				area: lineArea,
				key: "added",
				params: { label, amount: after },
			});
		else if (after === 0)
			lines.push({ area: lineArea, key: "removed", params: { label } });
		else
			lines.push({
				area: lineArea,
				key: "amount",
				params: { label, from: before, to: after },
			});
	}
	return lines;
}

/** Recipes as recipe id → amount, order doesn't matter */
function recipes(building: PlanDataBuilding): Map<string, number> {
	return amounts(
		building.active_recipes,
		(r) => r.recipeid,
		(r) => r.amount
	);
}

/**
 * What changed from one version of a plan to another, matched by building,
 * hab, expert and workforce type, never by position
 *
 * @author jplacht
 *
 * @param {IPlanDiffable} from Old version
 * @param {IPlanDiffable} to New version
 * @returns {IChangeLine[]} Change lines
 */
export function diffPlan(
	from: IPlanDiffable,
	to: IPlanDiffable
): IChangeLine[] {
	const lines: IChangeLine[] = [];

	// a cleared name is no name
	if ((from.plan_name || "") !== (to.plan_name || ""))
		lines.push({
			area: "name",
			key: "name",
			params: { from: from.plan_name ?? "", to: to.plan_name ?? "" },
		});
	if (from.plan_permits_used !== to.plan_permits_used)
		lines.push({
			area: "permits",
			key: "permits",
			params: { from: from.plan_permits_used, to: to.plan_permits_used },
		});
	if (from.plan_cogc !== to.plan_cogc)
		lines.push({
			area: "cogc",
			key: "cogc",
			params: { from: from.plan_cogc, to: to.plan_cogc },
		});
	if (from.plan_corphq !== to.plan_corphq)
		lines.push({
			area: "corphq",
			key: to.plan_corphq ? "corphq_on" : "corphq_off",
			params: {},
		});

	// buildings by ticker, a building can be planned with 0
	const buildings = diffByKey(
		from.plan_data.buildings,
		to.plan_data.buildings,
		(b) => b.name
	);
	buildings.added.forEach((b) =>
		lines.push({
			area: `building:${b.name}`,
			key: "added",
			params: { label: b.name, amount: b.amount },
		})
	);
	buildings.removed.forEach((b) =>
		lines.push({
			area: `building:${b.name}`,
			key: "removed",
			params: { label: b.name },
		})
	);
	buildings.changed.forEach(([before, after]) => {
		if (before.amount !== after.amount)
			lines.push({
				area: `building:${after.name}`,
				key: "amount",
				params: {
					label: after.name,
					from: before.amount,
					to: after.amount,
				},
			});
		if (!isEqual(recipes(before), recipes(after)))
			lines.push({
				area: `building:${after.name}`,
				key: "recipe",
				params: { label: after.name },
			});
	});

	lines.push(
		...amountLines(
			"infrastructure",
			amounts(
				from.plan_data.infrastructure,
				(i) => i.building,
				(i) => i.amount
			),
			amounts(
				to.plan_data.infrastructure,
				(i) => i.building,
				(i) => i.amount
			)
		)
	);

	// experts are a count per type, 0 included
	const expertsFrom = amounts(
		from.plan_data.experts,
		(e) => e.type,
		(e) => e.amount
	);
	const expertsTo = amounts(
		to.plan_data.experts,
		(e) => e.type,
		(e) => e.amount
	);
	for (const label of new Set([...expertsFrom.keys(), ...expertsTo.keys()])) {
		const before = expertsFrom.get(label) ?? 0;
		const after = expertsTo.get(label) ?? 0;
		if (before !== after)
			lines.push({
				area: `expert:${label}`,
				key: "experts",
				params: { label, from: before, to: after },
			});
	}

	const workforceFrom = new Map(
		from.plan_data.workforce.map((w) => [w.type, w])
	);
	to.plan_data.workforce.forEach((after) => {
		const before = workforceFrom.get(after.type);
		([1, 2] as const).forEach((n) => {
			const was = before?.[`lux${n}`] ?? true;
			const is = after[`lux${n}`];
			if (was !== is)
				lines.push({
					area: `workforce:${after.type}`,
					key: is ? "lux_on" : "lux_off",
					params: { label: after.type, n },
				});
		});
	});

	return lines;
}
