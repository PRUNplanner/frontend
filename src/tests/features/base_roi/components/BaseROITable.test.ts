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
});
