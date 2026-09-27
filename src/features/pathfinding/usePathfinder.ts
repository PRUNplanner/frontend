import { ref, type Ref } from "vue";

// static systemstars .json from FIO
import systemsJson from "@/assets/static/fio_systemstars.json";

// Types & Interfaces
import type { AdjecentList, ISystemsJSON } from "./usePathfinder.types";

/**
 * Singleton-style state on composable level
 * Graph + Cache are initialized only ONCE per session
 */

const systemIdNC1: string = "49b6615d39ccba05752b3be77b2ebf36"; // Moria
const systemIdAI1: string = "8ecf9670ba070d78cfb5537e8d9f1b6c"; // Antares
const systemIdCI1: string = "92029ff27c1abe932bd2c61ee4c492c7"; // Benten
const systemIdIC1: string = "f2f57766ebaca9d69efae41ccf4d8853"; // Hortus

const marketSystemIds = [systemIdNC1, systemIdAI1, systemIdCI1, systemIdIC1];

let initialized: boolean = false;
let adjecents: AdjecentList;
let idToIndex: Map<string, number>;
let indexToId: string[];
let parentCache: Map<number, Int32Array>;

export function usePathfinder() {
	const ready: Ref<boolean> = ref(false);

	// one time initialization
	if (!initialized) {
		const systems = systemsJson as ISystemsJSON[];
		const n = systems.length;

		idToIndex = new Map<string, number>();
		indexToId = new Array(n);

		// map systems to indexes, stay numeric
		for (let i = 0; i < n; i++) {
			idToIndex.set(systems[i].SystemId, i);
			indexToId[i] = systems[i].SystemId;
		}

		// create adjecent arrays and fill them
		adjecents = new Array(n);
		for (let i = 0; i < n; i++) adjecents[i] = [];

		// fyi, connections are always bidirectional
		for (let i = 0; i < n; i++) {
			const system = systems[i];
			for (const c of system.Connections ?? []) {
				const j = idToIndex.get(c.ConnectingId);

				// no mapped index, continue
				if (j === undefined) continue;

				adjecents[i].push(j);

				// add bidirectional one if i and j differ
				if (i !== j) adjecents[j].push(i);
			}
		}

		// de-duplicating all neighbors via a SET
		for (let i = 0; i < n; i++) {
			adjecents[i] = Array.from(new Set(adjecents[i]));
		}

		// clear parent cache
		parentCache = new Map<number, Int32Array>();

		// precompute market BFS
		_precomputeMarketBFS();

		initialized = true;
	}

	ready.value = true;

	/**
	 * Performs a BFS (Breadth-First Search) starting from `sourceIdx`
	 * and returns a parent array that allows reconstructing shortest paths
	 * to all reachable nodes.
	 *
	 * @note Important for BFS: for efficiency make use of calculating the
	 * parents of a node only once. In our context: the optimal way is to
	 * e.g. calculate the outgoing paths FROM a market to each target instead
	 * of calculating from a target to the market. By doing this one does only
	 * computes all paths once and then just pointer walks across the path
	 * traversal.
	 *
	 * BFS creation = O(V+E) -> V = Nodes, E = Connections
	 * Path traversal = O(Path length)
	 *
	 * @param sourceIdx - index of the source node
	 * @returns Int32Array where parent[i] = index of the previous node
	 *          along the shortest path from sourceIdx to i
	 * 			-1 if unreachable
	 */
	function bfsParents(sourceIdx: number): Int32Array {
		const n = adjecents.length;

		// -1 = not visited or no parent yet
		const parent = new Int32Array(n).fill(-1);
		// 1 visited, 0 not visited
		const visited = new Uint8Array(n);
		const queue: number[] = new Array(n);

		let head = 0;
		let tail = 0;

		// mark source as visited, add source to queue
		visited[sourceIdx] = 1;
		queue[tail++] = sourceIdx;

		while (head < tail) {
			const cur = queue[head++];

			// iterate through all neighbors of current node
			for (const nb of adjecents[cur]) {
				// skip if visited
				if (visited[nb]) continue;

				visited[nb] = 1;
				parent[nb] = cur;
				queue[tail++] = nb;
			}
		}

		/**
		 * each element now has the index of the previous node
		 * following shortest path from sourceIdx or -1 if unreachable
		 */
		return parent;
	}

	/**
	 * Precomputes BFS for markets and caching the results
	 * for further uses like in Planet Search
	 *
	 * @author jplacht
	 */
	function _precomputeMarketBFS() {
		marketSystemIds.forEach((marketId) => {
			const marketIdx = idToIndex.get(marketId);

			if (marketIdx === undefined) return;

			if (!parentCache.has(marketIdx)) {
				parentCache.set(marketIdx, bfsParents(marketIdx));
			}
		});
	}

	/**
	 * Reconstructs a path between source and target from given
	 * BFS mapping
	 *
	 * @author jplacht
	 *
	 * @param {Int32Array} parent BFS
	 * @param {number} sourceIdx Source node
	 * @param {number} targetIdx Target node
	 * @returns {(string[] | null)} Path system ids
	 */
	function reconstructPath(
		parent: Int32Array,
		sourceIdx: number,
		targetIdx: number
	): string[] | null {
		// path irrelevant, as target and source are same system
		if (sourceIdx === targetIdx) {
			return [indexToId[sourceIdx]];
		}

		// target node is not reachable
		if (parent[targetIdx] === -1) return null;

		const tmp: number[] = [];
		let cur = targetIdx;

		/**
		 * return from target back to source over indices,
		 * move to parent node along shortest path
		 */
		while (cur !== -1) {
			tmp.push(cur);
			if (cur === sourceIdx) break;
			cur = parent[cur];
		}

		if (tmp[tmp.length - 1] !== sourceIdx) return null;

		tmp.reverse();
		return tmp.map((i) => indexToId[i]);
	}

	/**
	 * Calculates the path between two given nodes
	 *
	 * @author jplacht
	 *
	 * @param sourceId Source Node
	 * @param targetId Target Node
	 * @returns Path systems, or null if system ids not found
	 */
	function getPathBetween(
		sourceId: string,
		targetId: string
	): string[] | null {
		const sourceIdx = idToIndex.get(sourceId);
		const targetIdx = idToIndex.get(targetId);

		if (sourceIdx === undefined || targetIdx === undefined) return null;

		// get or compute BFS tree from source node
		if (!parentCache.has(sourceIdx)) {
			parentCache.set(sourceIdx, bfsParents(sourceIdx));
		}

		const parent = parentCache.get(sourceIdx)!;

		return reconstructPath(parent, sourceIdx, targetIdx);
	}

	/**
	 * Calculates the path length between given nodes, taking into
	 * account that the path length in jumps is decreased by one for
	 * the starting system one jumps out of
	 *
	 * @author jplacht
	 *
	 * @param {string} sourceId Source Node
	 * @param {string} targetId Target Node
	 * @returns {(number} Number of jumps or -1, if unreachable
	 */
	function getPathBetweenLength(sourceId: string, targetId: string): number {
		const path = getPathBetween(sourceId, targetId);

		if (!path) return -1;

		/**
		 * path length minus 1, as we go for jumps and target
		 * could be in same system which is path length of 1
		 */

		return path.length > 0 ? path.length - 1 : 0;
	}

	/**
	 * Finds a systems readable name based on its system id
	 *
	 * @author jplacht
	 *
	 * @param {string} systemId System Id
	 * @returns {(string | null)} Name (e.g. ZV-759) or null if not found
	 */
	function getSystemName(systemId: string): string | null {
		const systemIdx = idToIndex.get(systemId);

		if (systemIdx === undefined) return null;

		return systemsJson[systemIdx].Name;
	}

	return {
		ready,
		getPathBetween,
		getPathBetweenLength,
		getSystemName,
		// systemid statics
		systemidNC1: systemIdNC1,
		systemidAI1: systemIdAI1,
		systemidCI1: systemIdCI1,
		systemidIC1: systemIdIC1,
	};
}
