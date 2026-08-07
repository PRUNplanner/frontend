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
 * Determines if adding the candidate edge closes a loop in the
 * config derived dependency graph.
 *
 * A loop exists when the candidate points at the consumer itself or
 * when any of its targets already depends, transitively, on the
 * consumer. Aggregates are expanded conservatively, an aggregate that
 * contains the consumer as producer therefore counts as a loop.
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

	const graph: IRaukkDependencyGraph = buildDependencyGraph(
		configs,
		snapshots
	);

	return targets.some(
		(targetUuid) =>
			targetUuid === consumerPlanUuid ||
			hasPath(graph, targetUuid, consumerPlanUuid)
	);
}
