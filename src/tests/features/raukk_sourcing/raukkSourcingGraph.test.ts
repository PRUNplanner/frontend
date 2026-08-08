import { describe, it, expect } from "vitest";

// graph
import {
	buildDependencyGraph,
	buildRecomputeOrder,
	collectDependencies,
	collectDependents,
	expandAggregateSource,
	hasPath,
	IRaukkDependencyGraph,
	resolveCandidateTargets,
	reverseGraph,
	wouldCreateCycleInGraph,
} from "@/features/raukk_sourcing/raukkSourcingGraph";

// Types & Interfaces
import {
	IRaukkPlanConfig,
	IRaukkSnapshot,
} from "@/features/raukk_sourcing/raukkSourcing.types";

function makeSnapshot(
	name: string,
	outputs: Record<string, number>,
	draws: Record<string, Record<string, number>> = {}
): IRaukkSnapshot {
	return {
		computedAt: "2026-01-01T00:00:00.000Z",
		stale: false,
		planName: name,
		planetNaturalId: "OT-580b",
		outputs: Object.fromEntries(
			Object.entries(outputs).map(([ticker, unitsPerDay]) => [
				ticker,
				{
					ticker,
					unitsPerDay,
					costPerUnit: 10,
					breakdown: {
						workforce: 1,
						repair: 2,
						inputs: 7,
						shipping: 0,
					},
				},
			])
		),
		draws,
	};
}

const planConfig = (
	sources: IRaukkPlanConfig["sources"]
): IRaukkPlanConfig => ({ repairDay: 90, sources });

describe("raukkSourcingGraph", () => {
	describe("expandAggregateSource", () => {
		it("returns all plans producing the ticker", () => {
			const snapshots: Record<string, IRaukkSnapshot> = {
				a: makeSnapshot("A", { RAT: 10 }),
				b: makeSnapshot("B", { RAT: 5, DW: 3 }),
				c: makeSnapshot("C", { DW: 2 }),
			};

			expect(
				expandAggregateSource(snapshots, "RAT").sort()
			).toStrictEqual(["a", "b"]);
			expect(expandAggregateSource(snapshots, "NOPE")).toStrictEqual([]);
		});
	});

	describe("buildDependencyGraph", () => {
		it("derives edges from draws and configured sources", () => {
			const snapshots: Record<string, IRaukkSnapshot> = {
				a: makeSnapshot("A", { ORE: 100 }),
				b: makeSnapshot("B", { MET: 50 }, { a: { ORE: 40 } }),
			};
			const configs: Record<string, IRaukkPlanConfig> = {
				c: planConfig({
					MET: { mode: "plan", sourcePlanUuid: "b" },
					FUEL: { mode: "market", priceMode: "BID" },
				}),
			};

			const graph = buildDependencyGraph(configs, snapshots);

			expect(graph.a).toStrictEqual([]);
			expect(graph.b).toStrictEqual(["a"]);
			expect(graph.c).toStrictEqual(["b"]);
		});

		it("expands aggregate sources to all producers", () => {
			const snapshots: Record<string, IRaukkSnapshot> = {
				a: makeSnapshot("A", { RAT: 10 }),
				b: makeSnapshot("B", { RAT: 5 }),
			};
			const configs: Record<string, IRaukkPlanConfig> = {
				c: planConfig({
					RAT: { mode: "plan", sourcePlanUuid: "AGG_AVG" },
				}),
			};

			expect(
				buildDependencyGraph(configs, snapshots).c.sort()
			).toStrictEqual(["a", "b"]);
		});

		it("drops self edges", () => {
			const snapshots: Record<string, IRaukkSnapshot> = {
				a: makeSnapshot("A", { RAT: 10 }, { a: { RAT: 1 } }),
			};

			expect(buildDependencyGraph({}, snapshots).a).toStrictEqual([]);
		});
	});

	describe("reverseGraph, collectDependents, hasPath", () => {
		// c -> b -> a
		const graph = { a: [], b: ["a"], c: ["b"] };

		it("reverses edges", () => {
			expect(reverseGraph(graph)).toStrictEqual({
				a: ["b"],
				b: ["c"],
				c: [],
			});
		});

		it("collects transitive dependents without the plan itself", () => {
			expect(collectDependents(graph, "a").sort()).toStrictEqual([
				"b",
				"c",
			]);
			expect(collectDependents(graph, "c")).toStrictEqual([]);
			expect(collectDependents(graph, "unknown")).toStrictEqual([]);
		});

		it("terminates on cyclic graphs", () => {
			const cyclic = { a: ["c"], b: ["a"], c: ["b"] };

			expect(collectDependents(cyclic, "a").sort()).toStrictEqual([
				"b",
				"c",
			]);
			expect(hasPath(cyclic, "a", "a")).toBe(true);
		});

		it("checks reachability", () => {
			expect(hasPath(graph, "c", "a")).toBe(true);
			expect(hasPath(graph, "a", "c")).toBe(false);
			expect(hasPath(graph, "a", "a")).toBe(false);
		});
	});

	describe("resolveCandidateTargets", () => {
		const snapshots: Record<string, IRaukkSnapshot> = {
			a: makeSnapshot("A", { RAT: 10 }),
		};

		it("resolves concrete and aggregate candidates", () => {
			expect(
				resolveCandidateTargets(snapshots, { sourcePlanUuid: "a" })
			).toStrictEqual(["a"]);
			expect(
				resolveCandidateTargets(snapshots, {
					aggregate: "AGG_MAX",
					ticker: "RAT",
				})
			).toStrictEqual(["a"]);
		});
	});

	describe("wouldCreateCycleInGraph", () => {
		const snapshots: Record<string, IRaukkSnapshot> = {
			a: makeSnapshot("A", { ORE: 100 }),
			b: makeSnapshot("B", { MET: 50 }),
		};
		// b already sources ORE from a
		const configs: Record<string, IRaukkPlanConfig> = {
			b: planConfig({ ORE: { mode: "plan", sourcePlanUuid: "a" } }),
		};

		it("refuses a closing edge", () => {
			expect(
				wouldCreateCycleInGraph(configs, snapshots, "a", {
					sourcePlanUuid: "b",
				})
			).toBe(true);
		});

		it("allows an edge in dependency direction", () => {
			expect(
				wouldCreateCycleInGraph(configs, snapshots, "b", {
					sourcePlanUuid: "a",
				})
			).toBe(false);
		});

		it("refuses self references", () => {
			expect(
				wouldCreateCycleInGraph(configs, snapshots, "a", {
					sourcePlanUuid: "a",
				})
			).toBe(true);
		});

		it("returns false for aggregates without producers", () => {
			expect(
				wouldCreateCycleInGraph(configs, snapshots, "a", {
					aggregate: "AGG_AVG",
					ticker: "NOPE",
				})
			).toBe(false);
		});
	});

	describe("collectDependencies", () => {
		// a <- b <- c, d unrelated
		const graph: IRaukkDependencyGraph = {
			a: [],
			b: ["a"],
			c: ["b"],
			d: [],
		};

		it("collects transitive sources", () => {
			expect(collectDependencies(graph, "c").sort()).toStrictEqual([
				"a",
				"b",
			]);
		});

		it("excludes the plan itself", () => {
			expect(collectDependencies(graph, "a")).toStrictEqual([]);
			expect(collectDependencies(graph, "d")).toStrictEqual([]);
		});

		it("returns nothing for unknown plans", () => {
			expect(collectDependencies(graph, "nope")).toStrictEqual([]);
		});

		it("terminates on malformed cycles", () => {
			const cyclic: IRaukkDependencyGraph = {
				a: ["b"],
				b: ["a"],
			};

			expect(collectDependencies(cyclic, "a")).toStrictEqual(["b"]);
		});
	});

	describe("buildRecomputeOrder", () => {
		const all = (): boolean => true;

		it("orders a chain upstream first, from any start", () => {
			// a <- b <- c
			const graph: IRaukkDependencyGraph = {
				a: [],
				b: ["a"],
				c: ["b"],
			};

			expect(buildRecomputeOrder(graph, "b", all)).toStrictEqual([
				"a",
				"b",
				"c",
			]);
			expect(buildRecomputeOrder(graph, "a", all)).toStrictEqual([
				"a",
				"b",
				"c",
			]);
			expect(buildRecomputeOrder(graph, "c", all)).toStrictEqual([
				"a",
				"b",
				"c",
			]);
		});

		it("orders a diamond with both sources before the sink", () => {
			// b and c draw from a, d draws from b and c
			const graph: IRaukkDependencyGraph = {
				a: [],
				b: ["a"],
				c: ["a"],
				d: ["b", "c"],
			};

			const order: string[] = buildRecomputeOrder(graph, "d", all);

			expect(order.length).toBe(4);
			expect(order[0]).toBe("a");
			expect(order[3]).toBe("d");
			expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
			expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
		});

		it("leaves disconnected plans alone", () => {
			const graph: IRaukkDependencyGraph = {
				a: [],
				b: ["a"],
				x: [],
				y: ["x"],
			};

			expect(buildRecomputeOrder(graph, "b", all)).toStrictEqual([
				"a",
				"b",
			]);
		});

		it("skips plans without a snapshot but keeps the ordering", () => {
			// a <- b <- c, b has no snapshot
			const graph: IRaukkDependencyGraph = {
				a: [],
				b: ["a"],
				c: ["b"],
			};

			expect(
				buildRecomputeOrder(graph, "c", (uuid) => uuid !== "b")
			).toStrictEqual(["a", "c"]);
		});

		it("returns nothing when no plan holds a snapshot", () => {
			const graph: IRaukkDependencyGraph = { a: [], b: ["a"] };

			expect(buildRecomputeOrder(graph, "a", () => false)).toStrictEqual(
				[]
			);
		});

		it("includes the started plan without any edges", () => {
			expect(buildRecomputeOrder({ a: [] }, "a", all)).toStrictEqual([
				"a",
			]);
			expect(buildRecomputeOrder({}, "a", all)).toStrictEqual(["a"]);
		});

		it("terminates on malformed, cyclic state", () => {
			const graph: IRaukkDependencyGraph = {
				a: ["c"],
				b: ["a"],
				c: ["b"],
			};

			const order: string[] = buildRecomputeOrder(graph, "a", all);

			expect(order.sort()).toStrictEqual(["a", "b", "c"]);
		});

		it("derives its scope from configs and snapshots", () => {
			const snapshots: Record<string, IRaukkSnapshot> = {
				a: makeSnapshot("A", { ORE: 100 }),
				b: makeSnapshot("B", { MET: 50 }, { a: { ORE: 40 } }),
				c: makeSnapshot("C", { ALO: 10 }, { b: { MET: 20 } }),
				x: makeSnapshot("X", { RAT: 1 }),
			};

			expect(
				buildRecomputeOrder(
					buildDependencyGraph({}, snapshots),
					"b",
					(uuid) => snapshots[uuid] !== undefined
				)
			).toStrictEqual(["a", "b", "c"]);
		});
	});
});
