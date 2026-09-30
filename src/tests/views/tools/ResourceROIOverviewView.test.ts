import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, type Slots } from "vue";
import { flushPromises } from "@vue/test-utils";

import ResourceROIOverviewView from "@/views/tools/ResourceROIOverviewView.vue";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { PButton, PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted, so are their helpers
const { stub, passThrough, calculate } = vi.hoisted(() => ({
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
	calculate: vi.fn(),
}));

vi.mock("@/features/resource_roi_overview/useResourceROIOverview", () => ({
	useResourceROIOverview: () => ({
		resultData: ref([]),
		calculate,
		progressCurrent: ref(0),
		progressTotal: ref(0),
		progressSearchingPlanets: ref(false),
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
vi.mock(
	"@/features/resource_roi_overview/components/ResourceROITable.vue",
	() => stub("ResourceROITable")
);

async function search(material: string) {
	const { wrapper } = await mountComponent(ResourceROIOverviewView);
	wrapper.findComponent(PSelect).vm.$emit("update:value", material);
	await flushPromises();
	await wrapper.findComponent(PButton).trigger("click");
	return wrapper;
}

describe("ResourceROIOverviewView", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		calculate.mockReset();
	});

	it("reports a use once the search finished", async () => {
		let finish: () => void = () => {};
		calculate.mockReturnValue(
			new Promise<void>((resolve) => (finish = resolve))
		);

		await search("FEO");
		expect(calculate).toHaveBeenCalledWith("FEO");
		// asked for, no result yet
		expect(trackEvent).not.toHaveBeenCalled();

		finish();
		await flushPromises();
		expect(trackEvent).toHaveBeenCalledWith("tool:use", {
			tool_name: "resource_roi",
			material_ticker: "FEO",
		});
	});

	it("reports nothing on open", async () => {
		await mountComponent(ResourceROIOverviewView);

		expect(calculate).not.toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
	});
});
