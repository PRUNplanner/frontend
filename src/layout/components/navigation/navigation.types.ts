import type { Component } from "vue";

import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

export type INavPlan = PlanEmpireElement["plans"][number];

export type NavArea = "sidebar" | "rail" | "mobile_bar" | "mobile_sheet";
export type NavSection = "empire" | "plans" | "planning" | "tools" | "footer";

export interface INavItem {
	/** i18n key under common.navigation */
	label: string;
	/** route name, also the analytics target */
	name: string;
	to: string;
	icon: Component;
	display: boolean;
}

export interface INavGroup {
	/** i18n key under common.navigation */
	label: string;
	items: INavItem[];
}
