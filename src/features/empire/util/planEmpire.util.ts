// Types & Interfaces
import type { PlanEmpireElement } from "@prunplanner/engine/schemas";

// which empire a plan calculates in, as the app picks it; pure, so the MCP
// server picks the same

/**
 * The stored empire if it still exists, else the first one (as the empire
 * page picks it)
 * @author jplacht
 */
export function pickEmpire(
	empires: PlanEmpireElement[],
	stored: string | undefined
): PlanEmpireElement | undefined {
	return empires.find((e) => e.uuid === stored) ?? empires[0];
}

/**
 * The empire a plan's breadcrumb links: the current one if it holds the
 * plan, else the first that does
 * @author jplacht
 */
export function breadcrumbEmpire(
	planUuid: string | undefined,
	empires: PlanEmpireElement[],
	current: PlanEmpireElement | undefined
): PlanEmpireElement | undefined {
	if (!planUuid) return undefined;
	const holds = (e: PlanEmpireElement) =>
		e.plans.some((p) => p.uuid === planUuid);
	return current && holds(current) ? current : empires.find(holds);
}

/**
 * The empire a plan calculates with: the one its breadcrumb links, when the
 * plan lists it, else the plan's first
 * @author jplacht
 */
export function planEmpireUuid(
	planUuid: string | undefined,
	planEmpires: { uuid: string }[],
	empires: PlanEmpireElement[],
	stored: string | undefined
): string | undefined {
	const crumb = breadcrumbEmpire(
		planUuid,
		empires,
		pickEmpire(empires, stored)
	);
	return (planEmpires.find((e) => e.uuid === crumb?.uuid) ?? planEmpires[0])
		?.uuid;
}
