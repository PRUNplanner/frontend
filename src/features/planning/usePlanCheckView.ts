import { ref } from "vue";

// Types & Interfaces
import type { PlanCheckView } from "@/features/planning/util/whatIf.types";

// module scope: the view and price change survive closing and reopening
// the Plan check tool, and the plan's Material I/O can open a view
const view = ref<PlanCheckView>("market");
const pct = ref<number>(20);

/**
 * The Plan check tool's view and price change, shared for this tab
 * @author jplacht
 */
export function usePlanCheckView() {
	return { view, pct };
}
