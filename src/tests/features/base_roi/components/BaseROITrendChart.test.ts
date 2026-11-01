import { beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROITrendChart from "@/features/base_roi/components/BaseROITrendChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { baseROIRows } from "@/tests/features/base_roi/baseROI.fixtures";

// Types & Interfaces
import type {
	IBaseROIRow,
	IBaseROISeries,
} from "@/features/base_roi/baseROI.types";

vi.mock("@/ui/charts/PLineChart.vue", () => ({
	default: {
		name: "PLineChart",
		props: ["days", "series", "label"],
		render: () => null,
	},
}));

let rows: IBaseROIRow[];
let series: IBaseROISeries;
beforeAll(async () => {
	rows = await baseROIRows();
	// every material at today's price, every day
	series = {
		AI1: Object.fromEntries(
			rows
				.flatMap((r) => r.materials)
				.map((m) => [m.ticker, Array(30).fill(m.price)])
		),
	};
});

async function mountChart(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(BaseROITrendChart, {
		rows,
		search: "",
		series,
		historyFailed: false,
		...props,
	});
	await flushPromises();
	return wrapper;
}

describe("BaseROITrendChart", () => {
	it("a skeleton until the prices are in, nothing when they failed", async () => {
		const loading = await mountChart({ series: null });
		expect(loading.find("[data-skeleton]").exists()).toBe(true);
		const failed = await mountChart({ historyFailed: true });
		expect(failed.find("[data-base-roi-trend]").exists()).toBe(false);
	});

	it("industries without a search, 30 days, named lines", async () => {
		const wrapper = await mountChart();
		expect(wrapper.text()).toContain("base_roi.trend.title_industry");
		const chart = wrapper.findComponent({ name: "PLineChart" });
		const lines = chart.props("series") as {
			label: string;
			values: number[];
		}[];
		expect(lines.length).toBeGreaterThan(0);
		expect(lines.length).toBeLessThanOrEqual(7);
		expect(lines.every((l) => l.label)).toBe(true);
		expect(chart.props("days")).toHaveLength(30);
		for (const l of lines) expect(l.values).toHaveLength(30);
	});

	it("the search drills into a building's products", async () => {
		const building = rows.find((r) =>
			r.outputs.some((o) => o.traded > 0)
		)!.building;
		const wrapper = await mountChart({ search: building });
		expect(wrapper.text()).toContain("base_roi.trend.title_product");
	});

	it("says so when no row has traded volume", async () => {
		const wrapper = await mountChart({
			rows: rows.map((r) => ({
				...r,
				outputs: r.outputs.map((o) => ({ ...o, traded: 0 })),
			})),
		});
		expect(wrapper.text()).toContain("base_roi.trend.empty");
	});
});
