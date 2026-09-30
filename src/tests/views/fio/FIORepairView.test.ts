import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, type Slots } from "vue";

import FIORepairView from "@/views/fio/FIORepairView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { repairTable } = vi.hoisted(() => ({
	repairTable: { rows: [] as unknown[] },
}));

vi.mock("@/features/fio/useFIORepair", () => ({
	useFIORepair: () => ({ planetRepairTable: ref(repairTable.rows) }),
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () => ({
	default: {
		name: "WrapperGameDataLoader",
		setup:
			(_: unknown, { slots }: { slots: Slots }) =>
			() =>
				slots.default?.(),
	},
}));
vi.mock("@/features/fio/components/FIORepairPlanet.vue", () => ({
	default: { name: "FIORepairPlanet", render: () => null },
}));

describe("FIORepairView", () => {
	beforeEach(() => vi.mocked(trackEvent).mockClear());

	it("reports a use when it shows a repair table", async () => {
		repairTable.rows = [{ planetId: "OT-580b" }];

		await mountComponent(FIORepairView);

		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "fio_repair",
		});
	});

	it("reports nothing for the empty page", async () => {
		repairTable.rows = [];

		await mountComponent(FIORepairView);

		expect(trackEvent).not.toHaveBeenCalled();
	});
});
