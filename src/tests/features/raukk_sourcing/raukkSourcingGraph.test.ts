import { describe, it, expect } from "vitest";

// graph
import {
	buildDependencyGraph,
	collectDependents,
	expandAggregateSource,
	hasPath,
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
});
