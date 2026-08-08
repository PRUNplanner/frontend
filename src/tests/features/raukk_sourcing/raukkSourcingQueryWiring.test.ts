import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// API mocks, the wiring under test must not hit axios
vi.mock("@/features/api/planData.api", () => ({
	callClonePlan: vi.fn(),
	callCreatePlan: vi.fn(),
	callDeletePlan: vi.fn(async () => true),
	callGetPlan: vi.fn(),
	callGetPlanlist: vi.fn(),
	callGetShared: vi.fn(),
	callSavePlan: vi.fn(async () => ({ uuid: "a" })),
}));

// Repository
import { useQueryRepository } from "@/lib/query_cache/queryRepository";

// Stores
import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

// Types & Interfaces
import { IRaukkSnapshot } from "@/features/raukk_sourcing/raukkSourcing.types";
import { IPlanSaveData } from "@/features/planning_data/usePlan.types";

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

describe("Raukk Sourcing: plan mutation wiring", () => {
	let sourcingStore: ReturnType<typeof useRaukkSourcingStore>;
	let repository: ReturnType<typeof useQueryRepository>["repository"];

	beforeEach(() => {
		setActivePinia(createPinia());
		sourcingStore = useRaukkSourcingStore();
		repository = useQueryRepository().repository;

		// b draws from a, c draws from b
		sourcingStore.setSnapshot("a", makeSnapshot("A", { ORE: 100 }));
		sourcingStore.setSnapshot(
			"b",
			makeSnapshot("B", { MET: 50 }, { a: { ORE: 40 } })
		);
		sourcingStore.setSnapshot(
			"c",
			makeSnapshot("C", { ALO: 10 }, { b: { MET: 20 } })
		);
	});

	it("PatchPlan marks the saved plan and its dependents stale", async () => {
		await repository.PatchPlan.fetchFn({
			planUuid: "a",
			data: {} as IPlanSaveData,
		});

		expect(sourcingStore.snapshots.a.stale).toBe(true);
		expect(sourcingStore.snapshots.b.stale).toBe(true);
		expect(sourcingStore.snapshots.c.stale).toBe(true);
	});

	it("PatchPlan of a plan without snapshot is harmless", async () => {
		await repository.PatchPlan.fetchFn({
			planUuid: "unknown",
			data: {} as IPlanSaveData,
		});

		expect(sourcingStore.snapshots.unknown).toBeUndefined();
		expect(sourcingStore.snapshots.a.stale).toBe(false);
	});

	it("DeletePlan drops the plans sourcing data", async () => {
		await repository.DeletePlan.fetchFn({ planUuid: "a" });

		expect(sourcingStore.snapshots.a).toBeUndefined();
		expect(sourcingStore.configs.a).toBeUndefined();
		expect(sourcingStore.snapshots.b.stale).toBe(true);
		expect(sourcingStore.snapshots.c.stale).toBe(true);
	});
});
