import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, type Ref, type Slots } from "vue";
import { flushPromises } from "@vue/test-utils";

import HQUpgradeCalculatorView from "@/views/tools/HQUpgradeCalculatorView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { PCheckbox, PInputNumber, PSelect } from "@/ui";
import { mountComponent, tableRows } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

// vi.mock factories are hoisted, so are their helpers
const { stub, passThrough, hq, loader } = vi.hoisted(() => ({
	stub: (name: string, props: string[] = []) => ({
		default: { name, props, render: () => null },
	}),
	// what the calculator composable returns, set per test
	hq: {
		rows: [] as unknown[],
		calculate: () => {},
		override: undefined as unknown as Ref<Record<string, number | null>>,
	},
	// the planning loader emits complete once its data is in, unless held back
	loader: { holdComplete: false },
	passThrough: (name: string) => ({
		default: {
			name,
			setup: (
				_: unknown,
				{ slots, emit }: { slots: Slots; emit: (e: string) => void }
			) => {
				if (
					name === "WrapperPlanningDataLoader" &&
					!loader.holdComplete
				)
					emit("complete");
				return () => slots.default?.();
			},
		},
	}),
}));

vi.mock("@/features/hq_upgrade_calculator/useHQUpgradeCalculator", () => ({
	useHQUpgradeCalculator: (
		_start: unknown,
		_to: unknown,
		override: Ref<Record<string, number | null>>
	) => ({
		levelOptions: ref([1, 2, 3].map((l) => ({ label: `${l}`, value: l }))),
		levelOptionsTo: ref([2, 3].map((l) => ({ label: `${l}`, value: l }))),
		materialData: ref(hq.rows),
		totalCost: ref(1234.5),
		totalWeightVolume: ref({ totalWeight: 12.5, totalVolume: 8.25 }),
		calculateMaterialData: () => {
			hq.override = override;
			hq.calculate();
		},
	}),
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () =>
	passThrough("WrapperGameDataLoader")
);
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () =>
	passThrough("WrapperPlanningDataLoader")
);
vi.mock("@/features/help/components/HelpDrawer.vue", () => stub("HelpDrawer"));
vi.mock("@/features/exchanges/components/CXPreferenceSelector.vue", () =>
	stub("CXPreferenceSelector", ["cxUuid"])
);
vi.mock("@/features/xit/components/XITTransferActionButton.vue", () =>
	stub("XITTransferActionButton", ["source", "elements"])
);
vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);

const material = (ticker: string, extra: Record<string, unknown> = {}) => ({
	ticker,
	amount: 1500,
	storage: 20,
	required: 1480,
	unitCost: 10.5,
	totalCost: 15540,
	storageLocations: [],
	...extra,
});

describe("HQUpgradeCalculatorView", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		hq.rows = [];
		hq.calculate = vi.fn();
		loader.holdComplete = false;
	});

	it("reports one use per settled change, not the defaults on open", async () => {
		vi.useFakeTimers();
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		await vi.advanceTimersByTimeAsync(2000);
		expect(trackEvent).not.toHaveBeenCalled();

		const [from, to] = wrapper.findAllComponents(PSelect);
		from.vm.$emit("update:value", 2);
		await vi.advanceTimersByTimeAsync(300);
		to.vm.$emit("update:value", 3);
		await vi.advanceTimersByTimeAsync(300);
		from.vm.$emit("update:value", 1);
		await vi.advanceTimersByTimeAsync(1000);

		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "hq_upgrade",
		});
		vi.useRealTimers();
	});

	it("lists each material with its amounts, costs and storage", async () => {
		hq.rows = [
			material("BSE", {
				storageLocations: [
					{ amount: 5, name: "Montem", type: "STORE" },
					{ amount: 7, name: "Katoa", type: "WAREHOUSE_STORE" },
				],
			}),
			material("RAT", { amount: 3, storage: 3, required: 0 }),
		];
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);

		const rows = tableRows(wrapper);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			amount: "1,500",
			storage: "20",
			required: "1,480",
			unitCost: "10.50",
			totalCost: "15,540.00",
			storageLocations:
				"5x @ Montem (STORE), 7x @ Katoa (WAREHOUSE_STORE)",
		});
		expect(rows[1].storageLocations).toBe("");
		expect(
			wrapper
				.findAllComponents({ name: "MaterialTile" })
				.map((tile) => tile.props("ticker"))
		).toEqual(["BSE", "RAT"]);
	});

	it("shows the totals of the upgrade", async () => {
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);

		const text = wrapper.text();
		expect(text).toContain("1,234.50");
		expect(text).toContain("12.50");
		expect(text).toContain("8.25");
	});

	it("hides the storage column with the show-locations checkbox", async () => {
		hq.rows = [
			material("BSE", {
				storageLocations: [
					{ amount: 5, name: "Montem", type: "STORE" },
				],
			}),
		];
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		expect(tableRows(wrapper)[0].storageLocations).toContain("Montem");

		wrapper.findComponent(PCheckbox).vm.$emit("update:checked", false);
		await flushPromises();

		expect(tableRows(wrapper)[0]).not.toHaveProperty("storageLocations");
		expect(wrapper.text()).not.toContain("Montem");
	});

	it("transfers what is still required, without covered materials", async () => {
		hq.rows = [
			material("BSE", { required: 40 }),
			material("RAT", { required: 0 }),
			material("DW", { required: 7 }),
		];
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);

		const button = wrapper.findComponent({
			name: "XITTransferActionButton",
		});
		expect(button.props("source")).toBe("hq_upgrade");
		expect(button.props("elements")).toEqual([
			{ ticker: "BSE", value: 40 },
			{ ticker: "DW", value: 7 },
		]);
	});

	it("recalculates with the stock a user overrides for a material", async () => {
		hq.rows = [material("BSE"), material("RAT")];
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		// calculated once on open
		expect(hq.calculate).toHaveBeenCalledTimes(1);
		const inputs = wrapper.findAllComponents(PInputNumber);
		expect(inputs.map((i) => i.props("value"))).toEqual([null, null]);

		inputs[1].vm.$emit("update:value", 250);
		await flushPromises();

		expect(hq.calculate).toHaveBeenCalledTimes(2);
		expect(hq.override.value).toEqual({ RAT: 250 });
		expect(wrapper.findAllComponents(PInputNumber)[1].props("value")).toBe(
			250
		);
		expect(wrapper.findAllComponents(PInputNumber)[0].props("value")).toBe(
			null
		);
	});

	it("recalculates when the level range changes", async () => {
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		const [from, to] = wrapper.findAllComponents(PSelect);

		from.vm.$emit("update:value", 2);
		to.vm.$emit("update:value", 3);
		await flushPromises();

		// on open, then once per change
		expect(hq.calculate).toHaveBeenCalledTimes(3);
	});

	it("calculates once the loaders complete, not before", async () => {
		loader.holdComplete = true;
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		expect(hq.calculate).not.toHaveBeenCalled();

		wrapper
			.findComponent({ name: "WrapperPlanningDataLoader" })
			.vm.$emit("complete");
		await flushPromises();

		expect(hq.calculate).toHaveBeenCalledTimes(1);
	});

	it("recalculates when the CX preference changes", async () => {
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		wrapper
			.findComponent({ name: "CXPreferenceSelector" })
			.vm.$emit("update:cxUuid", "cx-2");
		await flushPromises();

		expect(hq.calculate).toHaveBeenCalledTimes(2);
	});

	it("hands the CX chosen by the data loader to the selector", async () => {
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		const selector = () =>
			wrapper.findComponent({ name: "CXPreferenceSelector" });
		expect(selector().props("cxUuid")).toBeUndefined();

		wrapper
			.findComponent({ name: "WrapperPlanningDataLoader" })
			.vm.$emit("update:cx-uuid", "cx-1");
		await flushPromises();
		expect(selector().props("cxUuid")).toBe("cx-1");

		selector().vm.$emit("update:cxUuid", "cx-2");
		await flushPromises();
		expect(selector().props("cxUuid")).toBe("cx-2");
	});

	it("drops a pending use report when leaving the page", async () => {
		vi.useFakeTimers();
		const { wrapper } = await mountComponent(HQUpgradeCalculatorView);
		wrapper.findAllComponents(PSelect)[0].vm.$emit("update:value", 2);
		await vi.advanceTimersByTimeAsync(300);

		wrapper.unmount();
		await vi.advanceTimersByTimeAsync(2000);

		expect(trackEvent).not.toHaveBeenCalled();
		vi.useRealTimers();
	});
});
