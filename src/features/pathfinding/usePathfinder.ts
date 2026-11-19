import { ref, type Ref } from "vue";

// Engine
import { pathfinder } from "@/features/pathfinding/pathfinder";

/**
 * Jumps and paths between systems for components, see pathfinder.ts; the
 * graph is built on first use, so ready is true once this returns
 * @author jplacht
 */
export function usePathfinder() {
	const ready: Ref<boolean> = ref(true);
	return { ready, ...pathfinder() };
}
