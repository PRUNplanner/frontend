import type { Component } from "vue";

// Types & Interfaces
import type { ElementId } from "@/features/planning/layout/planLayout.types";
import type {
	BaseSection,
	PlanTool,
	ResultTile,
} from "@/features/planning/planView.util";

// Components
import PlanBaseElement from "@/features/planning/components/elements/PlanBaseElement.vue";
import PlanKpiElement from "@/features/planning/components/elements/PlanKpiElement.vue";
import PlanMaterialIOElement from "@/features/planning/components/elements/PlanMaterialIOElement.vue";
import PlanMaterialIOTotalsElement from "@/features/planning/components/elements/PlanMaterialIOTotalsElement.vue";
import PlanProductionElement from "@/features/planning/components/elements/PlanProductionElement.vue";
import PlanToolElement from "@/features/planning/components/elements/PlanToolElement.vue";

const BASE: BaseSection[] = [
	"empire",
	"planet",
	"workforce",
	"housing",
	"experts",
];

/**
 * The component that renders an element, with its props
 *
 * @param {ElementId} id Element
 * @returns {{ component: Component; props: Record<string, unknown> }} What to render
 */
export function elementView(id: ElementId): {
	component: Component;
	props: Record<string, unknown>;
} {
	if (id === "production")
		return { component: PlanProductionElement, props: {} };
	if (id === "material-io")
		return { component: PlanMaterialIOElement, props: {} };
	if (id === "material-io-totals")
		return { component: PlanMaterialIOTotalsElement, props: {} };
	if (id.startsWith("kpi-"))
		return {
			component: PlanKpiElement,
			props: { tile: id.slice(4) as ResultTile },
		};
	if (BASE.includes(id as BaseSection))
		return { component: PlanBaseElement, props: { section: id } };
	return { component: PlanToolElement, props: { tool: id as PlanTool } };
}
