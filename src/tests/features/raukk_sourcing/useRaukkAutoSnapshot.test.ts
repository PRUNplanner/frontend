import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { effectScope, EffectScope, nextTick, ref, Ref } from "vue";

// the composable only orchestrates scheduling, the pipeline is mocked
const mockComputePlanSnapshot = vi.fn();

vi.mock("@/features/raukk_sourcing/useRaukkSnapshot", () => ({
	computePlanSnapshot: (...args: unknown[]) =>
		mockComputePlanSnapshot(...args),
}));

// Composables
import { useRaukkAutoSnapshot } from "@/features/raukk_sourcing/useRaukkAutoSnapshot";

// Stores
import { useRaukkSourcingStore } from "@/features/raukk_sourcing/raukkSourcingStore";

// Types & Interfaces
import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import { IRaukkSnapshot } from "@/features/raukk_sourcing/raukkSourcing.types";

function makeSnapshot(): IRaukkSnapshot {
	return {
		computedAt: "2026-01-01T00:00:00.000Z",
		stale: false,
		planName: "A",
		planetNaturalId: "OT-580b",
		outputs: {
			RAT: {
				ticker: "RAT",
				unitsPerDay: 10,
				costPerUnit: 5,
				breakdown: { workforce: 1, repair: 1, inputs: 3, shipping: 0 },
			},
		},
		draws: {},
	};
}

describe("useRaukkAutoSnapshot", () => {
	let sourcingStore: ReturnType<typeof useRaukkSourcingStore>;
	let scope: EffectScope;

	let planUuid: Ref<string | undefined>;
	let planResult: Ref<IPlanResult>;
	let disabled: Ref<boolean>;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		sourcingStore = useRaukkSourcingStore();

		mockComputePlanSnapshot.mockReset();
		mockComputePlanSnapshot.mockResolvedValue({});

		planUuid = ref<string | undefined>("plan-1");
		planResult = ref({} as IPlanResult);
		disabled = ref(false);
	});

	afterEach(() => {
		scope?.stop();
		vi.useRealTimers();
	});

	/** Mounts the composable inside its own effect scope */
	function mount(): void {
		scope = effectScope();
		scope.run(() =>
			useRaukkAutoSnapshot({
				planUuid,
				planName: ref("Plan A"),
				planetNaturalId: ref("OT-580b"),
				cxUuid: ref(undefined),
				planResult,
				disabled,
			})
		);
	}

	it("computes on mount when no snapshot exists", async () => {
		mount();

		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);
		expect(mockComputePlanSnapshot.mock.calls[0][0]).toMatchObject({
			planUuid: "plan-1",
			planName: "Plan A",
			planetNaturalId: "OT-580b",
		});
	});

	it("computes on mount when the snapshot is stale", async () => {
		sourcingStore.setSnapshot("plan-1", makeSnapshot());
		sourcingStore.markStale("plan-1");

		mount();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);
	});

	it("stays quiet on mount with a current snapshot", async () => {
		sourcingStore.setSnapshot("plan-1", makeSnapshot());

		mount();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).not.toHaveBeenCalled();
	});

	it("computes when the snapshot is flagged stale later", async () => {
		sourcingStore.setSnapshot("plan-1", makeSnapshot());
		mount();
		await vi.advanceTimersByTimeAsync(1100);
		expect(mockComputePlanSnapshot).not.toHaveBeenCalled();

		// e.g. a sourcing config change or a plan save
		sourcingStore.markStale("plan-1");
		await nextTick();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);
	});

	it("computes when the calculation result changes", async () => {
		sourcingStore.setSnapshot("plan-1", makeSnapshot());
		mount();
		await vi.advanceTimersByTimeAsync(1100);

		planResult.value = {} as IPlanResult;
		await nextTick();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);
	});

	it("debounces bursts of changes into one run", async () => {
		sourcingStore.setSnapshot("plan-1", makeSnapshot());
		mount();
		await vi.advanceTimersByTimeAsync(1100);

		planResult.value = {} as IPlanResult;
		await nextTick();
		await vi.advanceTimersByTimeAsync(500);
		planResult.value = {} as IPlanResult;
		await nextTick();
		await vi.advanceTimersByTimeAsync(500);
		planResult.value = {} as IPlanResult;
		await nextTick();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);
	});

	it("never computes for read only plans", async () => {
		disabled.value = true;
		mount();

		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).not.toHaveBeenCalled();
	});

	it("never computes without a plan uuid", async () => {
		planUuid.value = undefined;
		mount();

		planResult.value = {} as IPlanResult;
		await nextTick();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).not.toHaveBeenCalled();
	});

	it("folds a change during a run into a single follow up", async () => {
		let resolveRun: (() => void) | undefined;
		mockComputePlanSnapshot.mockImplementation(
			() =>
				new Promise<object>((resolve) => {
					resolveRun = () => resolve({});
				})
		);

		mount();
		await vi.advanceTimersByTimeAsync(1100);
		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);

		// two changes while the first run is still in flight
		planResult.value = {} as IPlanResult;
		await nextTick();
		await vi.advanceTimersByTimeAsync(1100);
		planResult.value = {} as IPlanResult;
		await nextTick();
		await vi.advanceTimersByTimeAsync(1100);
		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);

		resolveRun?.();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(2);
	});

	it("swallows pipeline failures", async () => {
		const warn = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
		mockComputePlanSnapshot.mockRejectedValue(new Error("boom"));

		mount();
		await vi.advanceTimersByTimeAsync(1100);

		expect(mockComputePlanSnapshot).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalled();

		warn.mockRestore();
	});
});
