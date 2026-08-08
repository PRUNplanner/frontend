import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// the composable orchestrates loading, calculation and the snapshot
// pipeline, all three are mocked: this tests the orchestration itself
const mockExecute = vi.fn();
const mockCalculate = vi.fn();
const mockComputePlanSnapshot = vi.fn();

vi.mock("@/lib/query_cache/queryStore", () => ({
	useQueryStore: () => ({ execute: mockExecute }),
}));

vi.mock("@/features/cx/useCXData", () => ({
	useCXData: () => ({
		findEmpireCXUuid: (empireUuid: string | undefined) =>
			empireUuid ? `cx-${empireUuid}` : undefined,
	}),
}));

vi.mock("@/features/planning/usePlanCalculation", () => ({
	usePlanCalculation: async () => ({ calculate: mockCalculate }),
}));

vi.mock("@/features/raukk_sourcing/useRaukkSnapshot", () => ({
	computePlanSnapshot: (...args: unknown[]) =>
		mockComputePlanSnapshot(...args),
}));

// Composables
import { useRaukkChainRecompute } from "@/features/raukk_sourcing/useRaukkChainRecompute";

// Stores
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

describe("useRaukkChainRecompute", () => {
	let sourcingStore: ReturnType<typeof useRaukkSourcingStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		sourcingStore = useRaukkSourcingStore();

		mockExecute.mockReset();
		mockCalculate.mockReset();
		mockComputePlanSnapshot.mockReset();

		mockExecute.mockImplementation(
			async (definition: string, params: { planUuid?: string }) => {
				if (definition === "GetAllEmpires") return [];
				if (definition === "GetPlanet") return {};

				return {
					uuid: params.planUuid,
					plan_name: `Plan ${params.planUuid}`,
					planet_natural_id: `PL-${params.planUuid}`,
					empires: [{ uuid: `empire-${params.planUuid}` }],
				};
			}
		);

		mockCalculate.mockResolvedValue({ profit: 1 });
		mockComputePlanSnapshot.mockResolvedValue({});

		// a <- b <- c
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

	it("recomputes the whole chain upstream first", async () => {
		const { recomputeChain, running, done, total, errors } =
			useRaukkChainRecompute();

		await recomputeChain("b");

		expect(
			mockComputePlanSnapshot.mock.calls.map((call) => call[0].planUuid)
		).toStrictEqual(["a", "b", "c"]);

		expect(running.value).toBe(false);
		expect(done.value).toBe(3);
		expect(total.value).toBe(3);
		expect(errors.value).toStrictEqual([]);
	});

	it("resolves plan, planet and cx context per plan", async () => {
		const { recomputeChain } = useRaukkChainRecompute();

		await recomputeChain("a");

		expect(mockExecute).toHaveBeenCalledWith("GetPlan", { planUuid: "a" });
		expect(mockExecute).toHaveBeenCalledWith("GetPlanet", {
			planetNaturalId: "PL-a",
		});

		expect(mockComputePlanSnapshot).toHaveBeenCalledWith({
			planUuid: "a",
			planName: "Plan a",
			planetNaturalId: "PL-a",
			cxUuid: "cx-empire-a",
			planResult: { profit: 1 },
		});
	});

	it("falls back to no cx for plans without an empire", async () => {
		mockExecute.mockImplementation(
			async (definition: string, params: { planUuid?: string }) => {
				if (definition === "GetAllEmpires") return [];
				if (definition === "GetPlanet") return {};

				return {
					uuid: params.planUuid,
					plan_name: "No Empire",
					planet_natural_id: "PL-x",
					empires: [],
				};
			}
		);

		const { recomputeChain } = useRaukkChainRecompute();
		await recomputeChain("a");

		expect(mockComputePlanSnapshot.mock.calls[0][0].cxUuid).toBeUndefined();
	});

	it("skips plans without a snapshot", async () => {
		sourcingStore.setTickerSource("d", "ALO", {
			mode: "plan",
			sourcePlanUuid: "c",
		});

		const { recomputeChain, total } = useRaukkChainRecompute();
		await recomputeChain("c");

		expect(
			mockComputePlanSnapshot.mock.calls.map((call) => call[0].planUuid)
		).toStrictEqual(["a", "b", "c"]);
		expect(total.value).toBe(3);
	});

	it("records an error and continues with the next plan", async () => {
		mockComputePlanSnapshot.mockImplementation(
			async (context: { planUuid: string }) => {
				if (context.planUuid === "b") throw new Error("broken");
				return {};
			}
		);

		const { recomputeChain, errors, done } = useRaukkChainRecompute();
		await recomputeChain("a");

		expect(
			mockComputePlanSnapshot.mock.calls.map((call) => call[0].planUuid)
		).toStrictEqual(["a", "b", "c"]);

		expect(done.value).toBe(3);
		expect(errors.value).toStrictEqual([
			{ planUuid: "b", planName: "B", message: "broken" },
		]);
	});

	it("records non error throws as unknown", async () => {
		mockCalculate.mockRejectedValue("nope");

		const { recomputeChain, errors } = useRaukkChainRecompute();
		await recomputeChain("a");

		expect(errors.value.length).toBe(3);
		expect(errors.value[0].message).toBe("unknown error");
	});

	it("does nothing for a plan without snapshot", async () => {
		const { recomputeChain, total } = useRaukkChainRecompute();
		await recomputeChain("unknown");

		expect(mockComputePlanSnapshot).not.toHaveBeenCalled();
		expect(total.value).toBe(0);
	});

	it("refuses a second, concurrent run", async () => {
		const chain = useRaukkChainRecompute();

		const first: Promise<void> = chain.recomputeChain("a");
		await chain.recomputeChain("a");
		await first;

		expect(mockComputePlanSnapshot.mock.calls.length).toBe(3);
	});
});
