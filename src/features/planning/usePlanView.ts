import { inject, type InjectionKey, provide } from "vue";

// Types & Interfaces
import type { IPlanViewContext } from "@/features/planning/usePlanView.types";

const planViewKey: InjectionKey<IPlanViewContext> = Symbol("PlanView");

/**
 * Hands the plan page's state to its elements, wherever the layout puts
 * them; PlanView keeps the header, saving and the dialogs
 * @author jplacht
 *
 * @param {IPlanViewContext} context What the elements read
 * @returns {IPlanViewContext} The same context
 */
export function providePlanView(context: IPlanViewContext): IPlanViewContext {
	provide(planViewKey, context);
	return context;
}

/**
 * The plan page's state, inside an element
 *
 * @returns {IPlanViewContext} Provided context
 */
export function usePlanView(): IPlanViewContext {
	const context = inject(planViewKey);
	if (!context) throw new Error("usePlanView outside the plan page");
	return context;
}
