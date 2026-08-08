// Pure dependency graph helpers of the raukk sourcing feature.
// No store or Pinia access: every function takes plain records so the
// graph logic stays unit testable in isolation.

// Types & Interfaces
import {
	IRaukkPlanConfig,
	IRaukkSnapshot,
} from "@/features/raukk_sourcing/raukkSourcing.types";
import { IRaukkEdgeCandidate } from "@/features/raukk_sourcing/raukkSourcingStore.types";

/** Adjacency list, key: plan uuid, value: plan uuids it depends on */
export type IRaukkDependencyGraph = Record<string, string[]>;

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
 * Self edges are dropped, they are handled by the cycle guard instead.
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
 * The dependency graph is acyclic by construction — the cycle guard
 * refuses looping edges — persisted state can still be malformed, so
 * the traversal carries a visited and a recursion set and drops back
 * edges instead of hanging.
 *
 * @author raukk
 *
 * @param {IRaukkDependencyGraph} graph Dependency Graph
 * @param {string} planUuid Root Plan Uuid
 * @param {(planUuid: string) => boolean} hasSnapshot Snapshot Predicate
 * @returns {string[]} Plan Uuids, upstream first
 */
export function buildRecomputeOrder(
	graph: IRaukkDependencyGraph,
	planUuid: string,
	hasSnapshot: (planUuid: string) => boolean
): string[] {
	const scope: Set<string> = new Set([
		...collectDependencies(graph, planUuid),
		planUuid,
		...collectDependents(graph, planUuid),
	]);

	const order: string[] = [];
	const visited: Set<string> = new Set();
	const onStack: Set<string> = new Set();

	function visit(current: string): void {
		// onStack: malformed, cyclic persisted state
		if (visited.has(current) || onStack.has(current)) return;

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

	return order;
}

/**
 * Checks reachability from one plan to another along dependency edges.
 *
 * @author raukk
 *
 * @param {IRaukkDependencyGraph} graph Dependency Graph
 * @param {string} fromPlanUuid Start Plan Uuid
 * @param {string} toPlanUuid Target Plan Uuid
 * @returns {boolean} Target is reachable from start
 */
export function hasPath(
	graph: IRaukkDependencyGraph,
	fromPlanUuid: string,
	toPlanUuid: string
): boolean {
	const visited: Set<string> = new Set();
	const queue: string[] = [...(graph[fromPlanUuid] ?? [])];

	while (queue.length > 0) {
		const current: string = queue.shift() as string;
		if (current === toPlanUuid) return true;
		if (visited.has(current)) continue;

		visited.add(current);
		queue.push(...(graph[current] ?? []));
	}

	return false;
}

/**
 * Resolves an edge candidate to the plan uuids it would depend on.
 *
 * @author raukk
 *
 * @param {Record<string, IRaukkSnapshot>} snapshots Snapshots by uuid
 * @param {IRaukkEdgeCandidate} candidate Candidate Edge
 * @returns {string[]} Target Plan Uuids
 */
export function resolveCandidateTargets(
	snapshots: Record<string, IRaukkSnapshot>,
	candidate: IRaukkEdgeCandidate
): string[] {
	if ("sourcePlanUuid" in candidate) return [candidate.sourcePlanUuid];

	return expandAggregateSource(snapshots, candidate.ticker);
}

/**
 * Determines if adding the candidate edge closes a loop in an already
 * built dependency graph.
 *
 * A loop exists when the candidate points at the consumer itself or
 * when any of its targets already depends, transitively, on the
 * consumer. Aggregates are expanded conservatively, an aggregate that
 * contains the consumer as producer therefore counts as a loop.
 *
 * Checking many candidates against the same state — the source dropdown
 * of one ticker does — builds the graph once and calls this directly,
 * {@link wouldCreateCycleInGraph} is the single check convenience.
 *
 * @author raukk
 *
 * @param {IRaukkDependencyGraph} graph Dependency Graph
 * @param {Record<string, IRaukkSnapshot>} snapshots Snapshots by uuid
 * @param {string} consumerPlanUuid Consuming Plan Uuid
 * @param {IRaukkEdgeCandidate} candidate Candidate Edge
 * @returns {boolean} Edge would create a supply loop
 */
export function wouldCreateCycleWithGraph(
	graph: IRaukkDependencyGraph,
	snapshots: Record<string, IRaukkSnapshot>,
	consumerPlanUuid: string,
	candidate: IRaukkEdgeCandidate
): boolean {
	const targets: string[] = resolveCandidateTargets(snapshots, candidate);
	if (targets.length === 0) return false;

	return targets.some(
		(targetUuid) =>
			targetUuid === consumerPlanUuid ||
			hasPath(graph, targetUuid, consumerPlanUuid)
	);
}

/**
 * Determines if adding the candidate edge closes a loop in the
 * config derived dependency graph.
 *
 * Builds the dependency graph and delegates to
 * {@link wouldCreateCycleWithGraph}; use that one directly when several
 * candidates are checked against the same state.
 *
 * @author raukk
 *
 * @param {Record<string, IRaukkPlanConfig>} configs Configs by uuid
 * @param {Record<string, IRaukkSnapshot>} snapshots Snapshots by uuid
 * @param {string} consumerPlanUuid Consuming Plan Uuid
 * @param {IRaukkEdgeCandidate} candidate Candidate Edge
 * @returns {boolean} Edge would create a supply loop
 */
export function wouldCreateCycleInGraph(
	configs: Record<string, IRaukkPlanConfig>,
	snapshots: Record<string, IRaukkSnapshot>,
	consumerPlanUuid: string,
	candidate: IRaukkEdgeCandidate
): boolean {
	const targets: string[] = resolveCandidateTargets(snapshots, candidate);
	if (targets.length === 0) return false;

	if (targets.includes(consumerPlanUuid)) return true;

	return wouldCreateCycleWithGraph(
		buildDependencyGraph(configs, snapshots),
		snapshots,
		consumerPlanUuid,
		candidate
	);
}
