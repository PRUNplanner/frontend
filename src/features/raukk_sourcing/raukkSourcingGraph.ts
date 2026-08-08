// Pure dependency graph helpers of the raukk sourcing feature.
// No store or Pinia access: every function takes plain records so the
// graph logic stays unit testable in isolation.

// Types & Interfaces
import {
	IRaukkPlanConfig,
	IRaukkSnapshot,
} from "@/features/raukk_sourcing/raukkSourcing.types";

/** Adjacency list, key: plan uuid, value: plan uuids it depends on */
export type IRaukkDependencyGraph = Record<string, string[]>;

/** Ordered recompute scope of one plan's sourcing subgraph */
export interface IRaukkRecomputePlanning {
	/** Plan uuids holding a snapshot, upstream first */
	order: string[];
	/** Scope contains a cross plan supply loop; recomputing it once is
	 * not enough, the values only settle over repeated passes */
	cyclic: boolean;
}

/**
 * Finds all plans whose snapshot lists the given ticker as an output.
 * Backs the conservative expansion of the synthetic aggregate sources
 * ("AGG_AVG", "AGG_MAX"): an aggregate depends on every producer.
 *
 * @author raukk
 *
 * @param {Record<string, IRaukkSnapshot>} snapshots Snapshots by uuid
 * @param {string} ticker Material Ticker
 * @returns {string[]} Producing Plan Uuids
 */
export function expandAggregateSource(
	snapshots: Record<string, IRaukkSnapshot>,
	ticker: string
): string[] {
	return Object.entries(snapshots)
		.filter(([, snapshot]) => snapshot.outputs[ticker] !== undefined)
		.map(([planUuid]) => planUuid);
}

/**
 * Derives the sourcing dependency graph from configs and snapshots.
 *
 * Plan P depends on plan S when either
 *  - P's snapshot draws material from S (`snapshot.draws[S]`), or
 *  - P's config sources a ticker with `{ mode: "plan",
 *    sourcePlanUuid: S }`.
 *
 * Aggregate sources are expanded to all plans producing the ticker.
 * Self edges are dropped: a plan feeding its own repairs needs no graph
 * edge, its own staleness flag already covers it.
 *
 * @author raukk
 *
 * @param {Record<string, IRaukkPlanConfig>} configs Configs by uuid
 * @param {Record<string, IRaukkSnapshot>} snapshots Snapshots by uuid
 * @returns {IRaukkDependencyGraph} Dependency Graph
 */
export function buildDependencyGraph(
	configs: Record<string, IRaukkPlanConfig>,
	snapshots: Record<string, IRaukkSnapshot>
): IRaukkDependencyGraph {
	const graph: IRaukkDependencyGraph = {};

	const addEdge = (from: string, to: string): void => {
		if (!graph[from]) graph[from] = [];
		if (from === to) return;
		if (!graph[from].includes(to)) graph[from].push(to);
	};

	// nodes, so isolated plans are part of the graph as well
	Object.keys(snapshots).forEach((planUuid) => addEdge(planUuid, planUuid));
	Object.keys(configs).forEach((planUuid) => addEdge(planUuid, planUuid));

	// edges from stored draws
	Object.entries(snapshots).forEach(([planUuid, snapshot]) => {
		Object.keys(snapshot.draws).forEach((sourcePlanUuid) =>
			addEdge(planUuid, sourcePlanUuid)
		);
	});

	// edges from configured sources
	Object.entries(configs).forEach(([planUuid, config]) => {
		Object.entries(config.sources).forEach(([ticker, source]) => {
			if (source.mode !== "plan") return;

			if (
				source.sourcePlanUuid === "AGG_AVG" ||
				source.sourcePlanUuid === "AGG_MAX"
			) {
				expandAggregateSource(snapshots, ticker).forEach(
					(producerUuid) => addEdge(planUuid, producerUuid)
				);
			} else {
				addEdge(planUuid, source.sourcePlanUuid);
			}
		});
	});

	return graph;
}

/**
 * Reverses a dependency graph into a dependents graph.
 *
 * @author raukk
 *
 * @param {IRaukkDependencyGraph} graph Dependency Graph
 * @returns {IRaukkDependencyGraph} Dependents Graph
 */
export function reverseGraph(
	graph: IRaukkDependencyGraph
): IRaukkDependencyGraph {
	const reversed: IRaukkDependencyGraph = {};

	Object.keys(graph).forEach((planUuid) => {
		if (!reversed[planUuid]) reversed[planUuid] = [];
	});

	Object.entries(graph).forEach(([planUuid, dependencies]) => {
		dependencies.forEach((dependencyUuid) => {
			if (!reversed[dependencyUuid]) reversed[dependencyUuid] = [];
			if (!reversed[dependencyUuid].includes(planUuid))
				reversed[dependencyUuid].push(planUuid);
		});
	});

	return reversed;
}

/**
 * Collects all plans transitively depending on the given plan. The
 * plan itself is never part of the result.
 *
 * @author raukk
 *
 * @param {IRaukkDependencyGraph} graph Dependency Graph
 * @param {string} planUuid Plan Uuid
 * @returns {string[]} Transitive Dependent Plan Uuids
 */
export function collectDependents(
	graph: IRaukkDependencyGraph,
	planUuid: string
): string[] {
	const dependents: IRaukkDependencyGraph = reverseGraph(graph);
	const visited: Set<string> = new Set();
	const queue: string[] = [...(dependents[planUuid] ?? [])];

	while (queue.length > 0) {
		const current: string = queue.shift() as string;
		if (current === planUuid || visited.has(current)) continue;

		visited.add(current);
		queue.push(...(dependents[current] ?? []));
	}

	return Array.from(visited);
}

/**
 * Collects all plans the given plan transitively depends on, its
 * upstream sources. The plan itself is never part of the result.
 *
 * @author raukk
 *
 * @param {IRaukkDependencyGraph} graph Dependency Graph
 * @param {string} planUuid Plan Uuid
 * @returns {string[]} Transitive Source Plan Uuids
 */
export function collectDependencies(
	graph: IRaukkDependencyGraph,
	planUuid: string
): string[] {
	const visited: Set<string> = new Set();
	const queue: string[] = [...(graph[planUuid] ?? [])];

	while (queue.length > 0) {
		const current: string = queue.shift() as string;
		if (current === planUuid || visited.has(current)) continue;

		visited.add(current);
		queue.push(...(graph[current] ?? []));
	}

	return Array.from(visited);
}

/**
 * Orders the sourcing subgraph of one plan for a chain recomputation.
 *
 * Scope is the plans connected component along the recomputation
 * relevant direction: all transitive sources of the plan, the plan
 * itself and all its transitive dependents. Plans that neither feed the
 * plan nor consume from it are left alone.
 *
 * The result is ordered upstream first: a plan appears after every
 * in scope plan it draws from, so recomputing along the list always
 * consumes freshly stored source snapshots. Only plans that already
 * hold a snapshot are emitted, plans without one are still traversed so
 * they never break the ordering of the plans around them.
 *
 * Every plan in scope is emitted, not only the stale ones: refreshing a
 * source changes its costs and therefore the numbers of everything
 * downstream, an untouched "current" snapshot in the middle of a chain
 * would silently keep the old upstream values.
 *
 * Supply loops are allowed: snapshots price from frozen source values,
 * a loop therefore never recurses, its numbers just settle over
 * repeated passes. Back edges are dropped from the ordering — the loop
 * is broken at an arbitrary point — and reported through `cyclic` so
 * the caller knows a single pass leaves the loop's values unsettled.
 *
 * @author raukk
 *
 * @param {IRaukkDependencyGraph} graph Dependency Graph
 * @param {string} planUuid Root Plan Uuid
 * @param {(planUuid: string) => boolean} hasSnapshot Snapshot Predicate
 * @returns {IRaukkRecomputePlanning} Ordered scope, upstream first
 */
export function buildRecomputeOrder(
	graph: IRaukkDependencyGraph,
	planUuid: string,
	hasSnapshot: (planUuid: string) => boolean
): IRaukkRecomputePlanning {
	const scope: Set<string> = new Set([
		...collectDependencies(graph, planUuid),
		planUuid,
		...collectDependents(graph, planUuid),
	]);

	const order: string[] = [];
	const visited: Set<string> = new Set();
	const onStack: Set<string> = new Set();
	let cyclic: boolean = false;

	function visit(current: string): void {
		// onStack: back edge, the scope loops
		if (onStack.has(current)) {
			cyclic = true;
			return;
		}
		if (visited.has(current)) return;

		onStack.add(current);

		(graph[current] ?? []).forEach((sourceUuid) => {
			if (scope.has(sourceUuid)) visit(sourceUuid);
		});

		onStack.delete(current);
		visited.add(current);

		if (hasSnapshot(current)) order.push(current);
	}

	Array.from(scope)
		.sort()
		.forEach((current) => visit(current));

	return { order, cyclic };
}
