import type { InjectionKey } from "vue";

/** PlanGrid's measuring: an item hands its title row and content */
export const gridMeasureKey: InjectionKey<
	(id: string, els: HTMLElement[]) => () => void
> = Symbol("PlanGridMeasure");
