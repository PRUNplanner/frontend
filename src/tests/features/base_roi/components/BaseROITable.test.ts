import { beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROITable from "@/features/base_roi/components/BaseROITable.vue";
import BaseROITableSkeleton from "@/features/base_roi/components/BaseROITableSkeleton.vue";
import PSparkline from "@/ui/charts/PSparkline.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import { baseROIRows } from "@/tests/features/base_roi/baseROI.fixtures";

// Types & Interfaces
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

vi.mock("@/features/base_roi/components/BaseROIRowDetail.vue", () => ({
	__esModule: true,
	default: { name: "BaseROIRowDetail", props: ["row"], emits: ["close"], render: () => null },
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: { name: "MaterialTile", props: ["ticker"], render: () => null },
}));

let rows: IBaseROIRow[];
beforeAll(async () => {
	rows = await baseROIRows();
});

const HIDDEN = { maxJumps: 5177, logistics: 293, marketCapacity: 181, negative: 287 };

async function mountTable(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(BaseROITable, {
		settings: defaultBaseROISettings(),
		rows,
		hidden: HIDDEN,
		step: "done",
		progress: { current: 0, total: 0 },
		firstLoad: false,
		planetRowsPending: false,
		series: null,
		historyFailed: false,
		tryOnPlanet: vi.fn(),
		...props,
	});
	await flushPromises();
	return wrapper;
}

describe("BaseROITable", () => {
	it("shows every row and the hidden count per limit (criterion 10)", async () => {
		const wrapper = await mountTable();
		expect(wrapper.findAll("tbody tr[data-row-key]")).toHaveLength(rows.length);
		const text = wrapper.text();
		expect(text).toContain("base_roi.table.hidden");
		for (const key of ["hidden_jumps", "hidden_logistics", "hidden_market", "hidden_negative"])
			expect(text).toContain(`base_roi.table.${key}`);
	});

	it("leaves negative profit out of the count while Show negative is on", async () => {
		const wrapper = await mountTable({
			settings: { ...defaultBaseROISettings(), showNegative: true },
		});
		expect(wrapper.text()).not.toContain("base_roi.table.hidden_negative");
	});

	it("has no percentile numbers or tints (criterion 12)", async () => {
		const wrapper = await mountTable();
		expect(wrapper.text()).not.toMatch(/percentile|%ile/i);
		expect(wrapper.html()).not.toMatch(/percentile/i);
	});

	it("hides a column from the settings (criterion 14)", async () => {
		const shown = await mountTable();
		expect(shown.html()).toContain("base_roi.columns.cargo");
		const hidden = await mountTable({
			settings: { ...defaultBaseROISettings(), hiddenColumns: ["cargo"] },
		});
		expect(hidden.html()).not.toContain("base_roi.columns.cargo");
		expect(hidden.html()).toContain("base_roi.columns.product");
	});

	it("first load: the header row and 12 skeleton rows, no data yet (criterion 24)", async () => {
		const wrapper = await mountTable({
			rows: [],
			firstLoad: true,
			step: "game",
		});
		const skeleton = wrapper.findComponent(BaseROITableSkeleton);
		expect(skeleton.exists()).toBe(true);
		expect(skeleton.findAll("thead th").length).toBeGreaterThan(5);
		expect(skeleton.findAll("tbody tr")).toHaveLength(12);
		expect(wrapper.text()).toContain("base_roi.status.game");
	});

	it("recipe rows with skeleton rows below while planet rows load", async () => {
		const wrapper = await mountTable({
			rows: rows.filter((r) => r.kind === "recipe"),
			planetRowsPending: true,
			step: "calculating",
			progress: { current: 10, total: 40 },
		});
		expect(wrapper.findAll("tbody tr[data-row-key]").length).toBeGreaterThan(0);
		const skeleton = wrapper.findComponent(BaseROITableSkeleton);
		expect(skeleton.exists()).toBe(true);
		expect(skeleton.find("thead").exists()).toBe(false);
		// the hidden count waits for the full table
		expect(wrapper.text()).not.toContain("base_roi.table.hidden");
	});

	it("30-day cells: skeleton, then sparklines, empty on failure (criterion 22)", async () => {
		const loading = await mountTable();
		expect(loading.findAll("td [data-skeleton]")).toHaveLength(rows.length);

		const loaded = await mountTable({ series: { AI1: {} } });
		expect(loaded.findAllComponents(PSparkline)).toHaveLength(rows.length);

		const failed = await mountTable({ historyFailed: true });
		expect(failed.findAllComponents(PSparkline)).toHaveLength(0);
		expect(failed.find('[title="base_roi.table.history_failed"]').exists()).toBe(true);
	});

	it("a failed request shows an error line, no progress", async () => {
		const wrapper = await mountTable({ step: "error" });
		const alert = wrapper.find('[role="alert"]');
		expect(alert.text()).toBe("base_roi.status.error");
		expect(wrapper.text()).not.toContain("base_roi.status.planet_rows");
	});

	it("sorts by break-even, best first, never last", async () => {
		const wrapper = await mountTable();
		const keys = wrapper
			.findAll("tbody tr[data-row-key]")
			.map((tr) => tr.attributes("data-row-key"));
		const sorted = [...rows]
			.sort((a, b) =>
				!Number.isFinite(a.metrics.breakEven)
					? 1
					: !Number.isFinite(b.metrics.breakEven)
						? -1
						: a.metrics.breakEven - b.metrics.breakEven
			)
			.map((r) => r.key);
		expect(keys).toEqual(sorted);
	});

	it("sorts by every numeric column, both ways, never last", async () => {
		const never = {
			...rows[0],
			key: "never",
			metrics: { ...rows[0].metrics, breakEven: Infinity, dailyProfit: -1 },
		};
		const wrapper = await mountTable({ rows: [...rows, never] });
		const keys = () =>
			wrapper.findAll("tbody tr[data-row-key]").map((tr) => tr.attributes("data-row-key"));
		for (const button of wrapper.findAll("thead button.p-data-table-title")) {
			await button.trigger("click");
			const asc = keys();
			await button.trigger("click");
			expect(keys()).toHaveLength(asc.length);
		}
		// break-even ascending again: never at the end
		const breakEven = wrapper
			.findAll("thead button.p-data-table-title")
			.find((b) => b.text().includes("base_roi.columns.break_even"))!;
		await breakEven.trigger("click");
		await breakEven.trigger("click");
		await breakEven.trigger("click");
		expect(keys().at(-1)).toBe("never");
	});

	it("names each step of a running calculation", async () => {
		for (const [step, key] of [
			["recipes", "base_roi.status.recipes"],
			["planets", "base_roi.status.planets"],
			["calculating", "base_roi.status.calculating"],
		]) {
			const wrapper = await mountTable({ step, progress: { current: 3, total: 9 } });
			expect(wrapper.text()).toContain(key);
		}
		const pending = await mountTable({ step: "done", planetRowsPending: true });
		expect(pending.text()).toContain("base_roi.status.planet_rows");
	});

	it("fixed experts: the profit header names them, no payback line", async () => {
		const wrapper = await mountTable({
			settings: { ...defaultBaseROISettings(), experts: 3 },
		});
		expect(wrapper.text()).not.toContain("base_roi.table.from_zero");
		expect(wrapper.text()).not.toContain("base_roi.table.at_five");
	});

	it("expands a row into its detail and closes it", async () => {
		const wrapper = await mountTable();
		await wrapper.find("tbody button[aria-expanded]").trigger("click");
		await flushPromises();
		const detail = wrapper.findComponent({ name: "BaseROIRowDetail" });
		expect(detail.exists()).toBe(true);
		detail.vm.$emit("close");
		await flushPromises();
		expect(wrapper.findComponent({ name: "BaseROIRowDetail" }).exists()).toBe(false);
	});

	it("hiding a column in the menu writes the settings", async () => {
		const updates: unknown[] = [];
		const wrapper = await mountTable({
			"onUpdate:settings": (v: unknown) => updates.push(v),
		});
		wrapper
			.findComponent({ name: "BaseROIColumnsMenu" })
			.vm.$emit("update:hiddenColumns", ["cargo"]);
		expect(updates.at(-1)).toMatchObject({ hiddenColumns: ["cargo"] });
	});

	it("an empty table says so", async () => {
		const wrapper = await mountTable({ rows: [] });
		expect(wrapper.text()).toContain("base_roi.table.empty");
	});

	it("highlights the row hovered in the chart", async () => {
		const wrapper = await mountTable({ active: rows[0].key });
		expect(
			wrapper.find(`tr[data-row-key="${rows[0].key}"]`).classes()
		).toContain("!bg-white/10");
	});

	it("the ⚠ lists the price scenarios (criterion 11)", async () => {
		const row: IBaseROIRow = {
			...rows[0],
			metrics: {
				...rows[0].metrics,
				scenarios: [
					{ prices: [{ ticker: "IND", side: "bid", price: 4060 }], dailyProfit: -500 },
					{ prices: [{ ticker: "CU", side: "ask", price: 1400 }], dailyProfit: 900 },
				],
			},
		};
		const wrapper = await mountTable({ rows: [row] });
		const warn = wrapper.find('button[aria-label="base_roi.table.volatility"]');
		expect(warn.text()).toBe("2");
		await warn.trigger("click");
		await flushPromises();
		const text = document.body.textContent!;
		expect(text).toContain("IND (base_roi.table.bid 4,060.00)");
		expect(text).toContain("base_roi.table.volatility_title");
	});

	it("planet rows without a name or a route, rows without expertise or outputs", async () => {
		const planet: IBaseROIRow = {
			...rows.find((r) => r.kind === "resource")!,
			key: "noname",
			planetName: null,
			jumps: null,
		};
		const bare: IBaseROIRow = {
			...rows[0],
			key: "bare",
			expertise: null,
			outputs: [],
			workforce: [],
		};
		const wrapper = await mountTable({ rows: [planet, bare, rows[1]], series: { AI1: {} } });
		expect(wrapper.text()).toContain(`@ ${planet.planetNaturalId} (base_roi.table.no_route)`);
		expect(wrapper.find('tr[data-row-key="bare"]').text()).toContain("—");
		const sortExpertise = wrapper
			.findAll("thead button.p-data-table-title")
			.find((b) => b.text().includes("base_roi.columns.expertise"))!;
		await sortExpertise.trigger("click");
		await sortExpertise.trigger("click");
		expect(wrapper.findAll("tbody tr[data-row-key]")).toHaveLength(3);
	});
});
