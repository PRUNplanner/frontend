import { beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROITrendChart from "@/features/base_roi/components/BaseROITrendChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { baseROIRows } from "@/tests/features/base_roi/baseROI.fixtures";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";

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
		settings: defaultBaseROISettings(),
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

	it("industries without a search, 90 days, named lines", async () => {
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
		expect(chart.props("days")).toHaveLength(90);
		for (const l of lines) expect(l.values).toHaveLength(90);
	});

	it("the range and aggregation settings set the points", async () => {
		const wrapper = await mountChart({
			settings: {
				...defaultBaseROISettings(),
				chartRange: 30,
				chartBucket: 7,
			},
		});
		const chart = wrapper.findComponent({ name: "PLineChart" });
		// 30 days in weeks ending today: 4 full weeks and 2 days
		expect(chart.props("days")).toHaveLength(5);
		expect(wrapper.find("[data-chart-controls]").exists()).toBe(true);
	});

	it("the search drills into a building's products", async () => {
		const building = rows.find((r) =>
			r.outputs.some((o) => o.traded > 0)
		)!.building;
		const wrapper = await mountChart({ search: building });
		expect(wrapper.text()).toContain("base_roi.trend.title_product");
	});

	it("rows without an industry get their own line; the rest beyond 7 is counted", async () => {
		const wrapper = await mountChart({
			rows: rows.map((r, i) => ({
				...r,
				expertise: i % 9 === 0 ? null : `IND_${i % 9}`,
				outputs: r.outputs.map((o) => ({
					...o,
					traded: o.traded || 1,
				})),
			})),
		});
		const lines = wrapper
			.findComponent({ name: "PLineChart" })
			.props("series") as { label: string }[];
		expect(lines).toHaveLength(7);
		expect(wrapper.text()).toContain("base_roi.trend.more");
		const all = await mountChart({
			rows: rows.map((r) => ({
				...r,
				expertise: null,
				outputs: r.outputs.map((o) => ({
					...o,
					traded: o.traded || 1,
				})),
			})),
		});
		expect(
			(
				all.findComponent({ name: "PLineChart" }).props("series") as {
					label: string;
				}[]
			)[0].label
		).toBe("base_roi.trend.no_industry");
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

	it("the title collapses the chart and its controls, and opens it again", async () => {
		const updates: { trendOpen: boolean }[] = [];
		const wrapper = await mountChart({
			"onUpdate:settings": (v: { trendOpen: boolean }) => updates.push(v),
		});
		const toggle = wrapper.find("button[aria-controls='base-roi-trend']");
		expect(toggle.attributes("aria-expanded")).toBe("true");
		await toggle.trigger("click");
		expect(updates.at(-1)!.trendOpen).toBe(false);

		const closed = await mountChart({
			settings: { ...defaultBaseROISettings(), trendOpen: false },
		});
		expect(closed.text()).toContain("base_roi.trend.title_industry");
		expect(closed.find("#base-roi-trend").exists()).toBe(false);
		expect(closed.findComponent({ name: "PLineChart" }).exists()).toBe(
			false
		);
		expect(
			closed
				.find("button[aria-controls='base-roi-trend']")
				.attributes("aria-expanded")
		).toBe("false");
	});

	it("industries by their short names", async () => {
		const wrapper = await mountChart();
		const lines = wrapper
			.findComponent({ name: "PLineChart" })
			.props("series") as { label: string }[];
		expect(
			lines.every((l) => l.label.startsWith("base_roi.industry."))
		).toBe(true);
	});
});
