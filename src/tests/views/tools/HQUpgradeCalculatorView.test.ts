import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, type Slots } from "vue";

import HQUpgradeCalculatorView from "@/views/tools/HQUpgradeCalculatorView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, passThrough } = vi.hoisted(() => ({
	stub: (name: string) => ({ default: { name, render: () => null } }),
	passThrough: (name: string) => ({
		default: {
			name,
			setup:
				(_: unknown, { slots }: { slots: Slots }) =>
				() =>
					slots.default?.(),
		},
	}),
}));

vi.mock("@/features/hq_upgrade_calculator/useHQUpgradeCalculator", () => ({
	useHQUpgradeCalculator: () => ({
		levelOptions: ref([1, 2, 3].map((l) => ({ label: `${l}`, value: l }))),
		levelOptionsTo: ref([2, 3].map((l) => ({ label: `${l}`, value: l }))),
		materialData: ref([]),
		totalCost: ref(0),
		totalWeightVolume: ref({ totalWeight: 0, totalVolume: 0 }),
		calculateMaterialData: vi.fn(),
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
	stub("CXPreferenceSelector")
);
vi.mock("@/features/xit/components/XITTransferActionButton.vue", () =>
	stub("XITTransferActionButton")
);
vi.mock("@/features/material_tile/components/MaterialTile.vue", () =>
	stub("MaterialTile")
);

describe("HQUpgradeCalculatorView", () => {
	beforeEach(() => vi.mocked(trackEvent).mockClear());

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
});
