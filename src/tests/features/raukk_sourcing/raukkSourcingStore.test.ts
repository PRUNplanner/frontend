import { describe, it, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// stores
import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

// Types & Interfaces
import { IRaukkSnapshot } from "@/features/raukk_sourcing/raukkSourcing.types";

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
					costPerUnit: 42,
					breakdown: {
						workforce: 2,
						repair: 5,
						inputs: 35,
						shipping: 0,
					},
				},
			])
		),
		draws,
	};
}

describe("Raukk Sourcing Store", () => {
	let store: ReturnType<typeof useRaukkSourcingStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		store = useRaukkSourcingStore();
	});

	describe("configuration", () => {
		it("getConfig returns the default without persisting it", () => {
			expect(store.getConfig("a")).toStrictEqual({
				repairDay: 90,
				sources: {},
			});
			expect(store.configs.a).toBeUndefined();
			expect(Object.keys(store.configs).length).toBe(0);
		});

		it("getConfig returns a detached copy", () => {
			store.setTickerSource("a", "RAT", {
				mode: "market",
				priceMode: "BID",
			});

			const config = store.getConfig("a");
			config.sources.RAT = { mode: "market", priceMode: "ASK" };

			expect(store.configs.a.sources.RAT).toStrictEqual({
				mode: "market",
				priceMode: "BID",
			});
		});

		it("setTickerSource creates the config on demand", () => {
			store.setTickerSource("a", "ORE", {
				mode: "plan",
				sourcePlanUuid: "b",
			});

			expect(store.getConfig("a")).toStrictEqual({
				repairDay: 90,
				sources: { ORE: { mode: "plan", sourcePlanUuid: "b" } },
			});
		});

		it("clearTickerSource removes a source", () => {
			store.setTickerSource("a", "ORE", {
				mode: "plan",
				sourcePlanUuid: "b",
			});
			store.clearTickerSource("a", "ORE");

			expect(store.getConfig("a").sources).toStrictEqual({});
		});

		it("clearTickerSource is a no-op for unknown data", () => {
			store.clearTickerSource("a", "ORE");
			store.setTickerSource("a", "ORE", {
				mode: "market",
				priceMode: "MID",
			});
			store.clearTickerSource("a", "NOPE");

			expect(Object.keys(store.getConfig("a").sources)).toStrictEqual([
				"ORE",
			]);
		});

		it("setRepairDay stores the day", () => {
			store.setRepairDay("a", 30);
			expect(store.getConfig("a").repairDay).toBe(30);
		});

		it("config changes mark the plan and dependents stale", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
			store.setSnapshot(
				"b",
				makeSnapshot("B", { MET: 10 }, { a: { ORE: 50 } })
			);

			expect(store.snapshots.a.stale).toBe(false);
			expect(store.snapshots.b.stale).toBe(false);

			store.setRepairDay("a", 120);

			expect(store.snapshots.a.stale).toBe(true);
			expect(store.snapshots.b.stale).toBe(true);
		});
	});

	describe("snapshots and staleness", () => {
		/** a <- b <- c, c depends on b, b depends on a */
		function buildChain(): void {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
			store.setSnapshot(
				"b",
				makeSnapshot("B", { MET: 50 }, { a: { ORE: 40 } })
			);
			store.setSnapshot(
				"c",
				makeSnapshot("C", { ALO: 20 }, { b: { MET: 10 } })
			);
		}

		it("setSnapshot stores it as current", () => {
			store.setSnapshot("a", {
				...makeSnapshot("A", { ORE: 100 }),
				stale: true,
			});

			expect(store.snapshots.a.stale).toBe(false);
			expect(store.getSnapshot("a")?.planName).toBe("A");
			expect(store.getSnapshot("nope")).toBeUndefined();
		});

		it("setSnapshot cascades staleness multiple levels", () => {
			buildChain();

			expect(store.snapshots.a.stale).toBe(false);
			expect(store.snapshots.b.stale).toBe(false);
			expect(store.snapshots.c.stale).toBe(false);

			store.setSnapshot("a", makeSnapshot("A", { ORE: 120 }));

			expect(store.snapshots.a.stale).toBe(false);
			expect(store.snapshots.b.stale).toBe(true);
			expect(store.snapshots.c.stale).toBe(true);
		});

		it("markStale cascades and includes the plan itself", () => {
			buildChain();
			store.markStale("b");

			expect(store.snapshots.a.stale).toBe(false);
			expect(store.snapshots.b.stale).toBe(true);
			expect(store.snapshots.c.stale).toBe(true);
		});

		it("markStale on a plan without snapshot cascades via config", () => {
			store.setSnapshot(
				"b",
				makeSnapshot("B", { MET: 50 }, { a: { ORE: 40 } })
			);

			store.markStale("a");

			expect(store.snapshots.b.stale).toBe(true);
			expect(store.snapshots.a).toBeUndefined();
		});

		it("setSnapshot detaches the given object", () => {
			const snapshot = makeSnapshot("A", { ORE: 100 });
			store.setSnapshot("a", snapshot);
			snapshot.outputs.ORE.costPerUnit = 999;

			expect(store.snapshots.a.outputs.ORE.costPerUnit).toBe(42);
		});

		it("setSnapshot skips the cascade when the numbers are unchanged", () => {
			buildChain();

			// same numbers again, e.g. the automatic upkeep on view load
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));

			expect(store.snapshots.b.stale).toBe(false);
			expect(store.snapshots.c.stale).toBe(false);
		});

		it("staleness cascades along a supply loop without hanging", () => {
			// a and b draw from each other
			store.setSnapshot(
				"a",
				makeSnapshot("A", { ORE: 100 }, { b: { FUEL: 5 } })
			);
			store.setSnapshot(
				"b",
				makeSnapshot("B", { FUEL: 50 }, { a: { ORE: 40 } })
			);

			store.markStale("a");

			expect(store.snapshots.a.stale).toBe(true);
			expect(store.snapshots.b.stale).toBe(true);
		});
	});

	describe("producersOf", () => {
		it("lists producing plans, stale ones flagged", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100, MET: 5 }));
			store.setSnapshot("b", makeSnapshot("B", { ORE: 30 }));
			store.setSnapshot("c", makeSnapshot("C", { DW: 12 }));
			store.markStale("b");

			const producers = store.producersOf("ORE");

			expect(producers.length).toBe(2);
			expect(producers.map((p) => p.planUuid).sort()).toStrictEqual([
				"a",
				"b",
			]);

			const b = producers.find((p) => p.planUuid === "b");
			expect(b).toStrictEqual({
				planUuid: "b",
				planName: "B",
				planetNaturalId: "OT-580b",
				costPerUnit: 42,
				unitsPerDay: 30,
				stale: true,
				computedAt: "2026-01-01T00:00:00.000Z",
			});

			expect(store.producersOf("NOPE")).toStrictEqual([]);
		});
	});

	describe("subscription", () => {
		it("sums draws and computes the output share", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
			store.setSnapshot(
				"b",
				makeSnapshot("B", { MET: 10 }, { a: { ORE: 40 } })
			);
			store.setSnapshot(
				"c",
				makeSnapshot("C", { ALO: 10 }, { a: { ORE: 10 } })
			);

			const result = store.subscription("a", "ORE");

			expect(result.totalDrawnPerDay).toBe(50);
			expect(result.pctOfOutput).toBe(0.5);
			expect(result.byPlan.length).toBe(2);
			expect(
				result.byPlan.find((p) => p.planUuid === "b")?.unitsPerDay
			).toBe(40);
		});

		it("allows oversubscription above 100%", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
			store.setSnapshot(
				"b",
				makeSnapshot("B", { MET: 10 }, { a: { ORE: 80 } })
			);
			store.setSnapshot(
				"c",
				makeSnapshot("C", { ALO: 10 }, { a: { ORE: 70 } })
			);

			const result = store.subscription("a", "ORE");

			expect(result.totalDrawnPerDay).toBe(150);
			expect(result.pctOfOutput).toBe(1.5);
		});

		it("guards zero and missing output", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 0 }));
			store.setSnapshot(
				"b",
				makeSnapshot("B", { MET: 10 }, { a: { ORE: 5 } })
			);

			expect(store.subscription("a", "ORE").pctOfOutput).toBe(0);
			expect(store.subscription("a", "ORE").totalDrawnPerDay).toBe(5);

			expect(store.subscription("nope", "ORE")).toStrictEqual({
				totalDrawnPerDay: 0,
				byPlan: [],
				pctOfOutput: 0,
			});
		});
	});

	describe("deletePlanData", () => {
		it("removes data and marks dependents stale", () => {
			store.setTickerSource("a", "DW", {
				mode: "market",
				priceMode: "BID",
			});
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
			store.setSnapshot(
				"b",
				makeSnapshot("B", { MET: 50 }, { a: { ORE: 40 } })
			);
			store.setSnapshot(
				"c",
				makeSnapshot("C", { ALO: 20 }, { b: { MET: 10 } })
			);

			store.deletePlanData("a");

			expect(store.configs.a).toBeUndefined();
			expect(store.snapshots.a).toBeUndefined();
			expect(store.snapshots.b.stale).toBe(true);
			expect(store.snapshots.c.stale).toBe(true);
		});
	});

	describe("export and import", () => {
		it("round trips the state", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
			store.setTickerSource("a", "DW", {
				mode: "market",
				priceMode: "AVG7D",
			});
			store.setRepairDay("a", 60);

			const exported: string = store.exportJSON();
			const parsed = JSON.parse(exported);
			expect(parsed.version).toBe(1);

			const before = JSON.parse(JSON.stringify(store.configs));
			const snapshotsBefore = JSON.parse(JSON.stringify(store.snapshots));

			store.$reset();
			expect(Object.keys(store.configs).length).toBe(0);
			expect(Object.keys(store.snapshots).length).toBe(0);

			store.importJSON(exported);

			expect(JSON.parse(JSON.stringify(store.configs))).toStrictEqual(
				before
			);
			expect(JSON.parse(JSON.stringify(store.snapshots))).toStrictEqual(
				snapshotsBefore
			);
		});

		it("throws on non-JSON input", () => {
			expect(() => store.importJSON("{ nope")).toThrowError();
		});

		it("throws on schema violations", () => {
			expect(() =>
				store.importJSON(
					JSON.stringify({
						version: 1,
						configs: { a: { repairDay: 45, sources: {} } },
						snapshots: {},
					})
				)
			).toThrowError();

			expect(() =>
				store.importJSON(
					JSON.stringify({
						version: 1,
						configs: {},
						snapshots: { a: { computedAt: "now" } },
					})
				)
			).toThrowError();

			expect(() => store.importJSON(JSON.stringify([]))).toThrowError();
		});

		it("leaves state untouched on invalid input", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));

			expect(() => store.importJSON("nope")).toThrowError();
			expect(store.snapshots.a).toBeDefined();
		});

		it("accepts a payload without version", () => {
			store.importJSON(
				JSON.stringify({
					configs: { a: { repairDay: 30, sources: {} } },
					snapshots: {},
				})
			);

			expect(store.getConfig("a").repairDay).toBe(30);
		});

		it("accepts snapshots carrying frozen input and sell prices", () => {
			const snapshot: IRaukkSnapshot = {
				...makeSnapshot("A", { ORE: 100 }),
				inputPrices: { FUEL: 12.5 },
				sellPrices: { ORE: 55 },
			};

			store.importJSON(
				JSON.stringify({
					version: 1,
					configs: {},
					snapshots: { a: snapshot },
				})
			);

			expect(store.getSnapshot("a")?.inputPrices).toStrictEqual({
				FUEL: 12.5,
			});
			expect(store.getSnapshot("a")?.sellPrices).toStrictEqual({
				ORE: 55,
			});
		});
	});

	describe("$reset", () => {
		it("clears all state", () => {
			store.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
			store.setRepairDay("a", 120);

			store.$reset();

			expect(store.configs).toStrictEqual({});
			expect(store.snapshots).toStrictEqual({});
		});
	});
});
