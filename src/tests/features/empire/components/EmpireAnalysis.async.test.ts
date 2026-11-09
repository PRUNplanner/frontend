import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { h } from "vue";
import { flushPromises } from "@vue/test-utils";

import { materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import EmpireAnalysis from "@/features/empire/components/EmpireAnalysis.vue";
import EmpireBarChartPlaceholder from "@/ui/charts/EmpireBarChartPlaceholder.vue";
import { mountComponent } from "@/tests/mountComponent";
import { memoryStorage } from "@/tests/memoryStorage";

// Types & Interfaces
import type {
	IEmpireMaterialIO,
	IEmpirePlanListData,
} from "@/features/empire/empire.types";

// test data
import materials from "@/tests/test_data/api_data_materials.json";

// the chart chunk resolves only when a test releases it
const chunk = vi.hoisted(() => {
	let release!: () => void;
	const loaded = new Promise<void>((resolve) => (release = resolve));
	return { loaded, release };
});

vi.mock("@/ui/charts/EmpireBarChart.vue", async () => {
	await chunk.loaded;
	return {
		__esModule: true,
		default: {
			name: "EmpireBarChart",
			props: { items: Array },
			render: () => h("div"),
		},
	};
});

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
}));

const FE: IEmpireMaterialIO = {
	ticker: "FE",
	input: 0,
	output: 10,
	delta: 10,
	deltaPrice: 1234,
	inputPlanets: [],
	outputPlanets: [],
};

// 12 plans: the chart keeps 10 and "Other"
const PLANS: IEmpirePlanListData[] = Array.from({ length: 12 }, (_, i) => ({
	uuid: `uuid-${i}`,
	name: `P${i}`,
	planet: "ZV-307c",
	permits: 1,
	cogc: "METALLURGY",
	profit: i,
	revenue: 100 + i,
	inputs: 60,
	workforce: 30,
	degradation: 10,
	fees: 0,
}));

describe("EmpireAnalysis: chart chunk loading", () => {
	beforeAll(async () => {
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	beforeEach(() => {
		vi.stubGlobal("localStorage", memoryStorage());
	});

	it("holds each open chart's height until chart.js is loaded", async () => {
		localStorage.setItem("prunplanner_empire_more_charts", "1");
		const { wrapper } = await mountComponent(EmpireAnalysis, {
			empireMaterialIO: [FE],
			planListData: PLANS,
		});

		const placeholders = wrapper.findAllComponents(
			EmpireBarChartPlaceholder
		);
		expect(placeholders).toHaveLength(7);
		// plans: 11 bars, FE profit: 1 bar (28 px each + 40 px axes)
		expect(placeholders[0].attributes("style")).toContain("height: 348px");
		expect(placeholders[1].attributes("style")).toContain("height: 68px");
		// no material costs: the chart's empty text, same as the chart
		expect(placeholders[2].text()).toBe("common.charts.empty");
		expect(
			wrapper.findAllComponents({ name: "EmpireBarChart" })
		).toHaveLength(0);

		chunk.release();
		await flushPromises();

		expect(
			wrapper.findAllComponents(EmpireBarChartPlaceholder)
		).toHaveLength(0);
		expect(
			wrapper.findAllComponents({ name: "EmpireBarChart" })
		).toHaveLength(7);
	});
});
