// Composables
import { usePathfinder } from "@/features/pathfinding/usePathfinder";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";
import type { PlanetSearchCX } from "@/features/planet_search/planetSearch.schemas";

const {
	getJumpsFrom,
	systemidAI1,
	systemidCI1,
	systemidIC1,
	systemidNC1,
} = usePathfinder();

const CX_SYSTEMS: Record<PlanetSearchCX, string> = {
	AI1: systemidAI1,
	CI1: systemidCI1,
	IC1: systemidIC1,
	NC1: systemidNC1,
};

/**
 * Engine context: resolves CX and the viewer's plans to jumps maps. A plan
 * is placed by its planet's system from the index; unknown plans resolve
 * to undefined, so the engine ignores them.
 * @author jplacht
 *
 * @param index Planet search index
 * @param planPlanets Viewer's plan uuid → planet natural id
 * @param now Epoch ms the COGC programs are checked against
 */
export function createSearchContext(
	index: PlanetSearchIndexEntry[],
	planPlanets: Record<string, string>,
	now: number
): IPlanetSearchContext {
	const systemOf = new Map(
		index.map((p) => [p.planet_natural_id, p.system_id])
	);

	return {
		now,
		refJumps: (ref) => {
			const system =
				ref.kind === "cx"
					? CX_SYSTEMS[ref.code]
					: systemOf.get(planPlanets[ref.planUuid]);
			return system ? getJumpsFrom(system) : undefined;
		},
	};
}
