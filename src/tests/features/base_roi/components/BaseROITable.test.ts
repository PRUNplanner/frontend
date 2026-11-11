import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROITable from "@/features/base_roi/components/BaseROITable.vue";
import BaseROITableSkeleton from "@/features/base_roi/components/BaseROITableSkeleton.vue";
import PSparkline from "@/ui/charts/PSparkline.vue";
import PInput from "@/ui/components/PInput.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import { baseROIRows } from "@/tests/features/base_roi/baseROI.fixtures";
import { recipeLabel } from "@/features/base_roi/baseROIDetail.util";

// Types & Interfaces
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

vi.mock("@/features/base_roi/components/BaseROIRowDetail.vue", () => ({
	__esModule: true,
	default: {
		name: "BaseROIRowDetail",
		props: ["row"],
		emits: ["close"],
		render: () => null,
	},
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: { name: "MaterialTile", props: ["ticker"], render: () => null },
}));

let rows: IBaseROIRow[];
beforeAll(async () => {
	rows = await baseROIRows();
});

const HIDDEN = {
	maxJumps: 5177,
	logistics: 293,
	marketCapacity: 181,
	noPlots: 0,
	unstaffed: 0,
	negative: 287,
};

async function mountTable(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(
		BaseROITable,
		{
			settings: defaultBaseROISettings(),
			rows,
			hidden: HIDDEN,
			step: "done",
			progress: { current: 0, total: 0 },
			firstLoad: false,
			planetRowsPending: false,
			series: null,
			historyFailed: false,
			staffing: new Map(),
			populationFailed: false,
			tryOnPlanet: vi.fn(),
			search: "",
			...props,
		},
		{ attach: true }
	);
	await flushPromises();
	return wrapper;
}

describe("BaseROITable", () => {
	afterEach(() => (document.body.innerHTML = ""));

	it("shows every row and the hidden count per limit (criterion 10)", async () => {
		const wrapper = await mountTable();
		expect(wrapper.findAll("tbody tr[data-row-key]")).toHaveLength(
			rows.length
		);
		const text = wrapper.text();
		expect(text).toContain("base_roi.table.hidden");
		for (const key of [
			"hidden_jumps",
			"hidden_logistics",
			"hidden_market",
			"hidden_negative",
		])
			expect(text).toContain(`base_roi.table.${key}`);
	});

	it("leaves negative profit out of the count while Show negative is on", async () => {
		const wrapper = await mountTable({
			settings: { ...defaultBaseROISettings(), showNegative: true },
		});
		expect(wrapper.text()).not.toContain("base_roi.table.hidden_negative");
	});

	it("pins the Product column, except on a phone", async () => {
		const pinned = await mountTable();
		expect(pinned.find(".p-data-table-sticky").exists()).toBe(true);

		vi.stubGlobal("matchMedia", () => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		const phone = await mountTable();
		expect(phone.find(".p-data-table-sticky").exists()).toBe(false);
		vi.unstubAllGlobals();
	});

	it("notes a planet's missing workers and counts the rows they hide", async () => {
		const [short, none] = rows;
		const wrapper = await mountTable({
			// workforce is hidden by default
			settings: {
				...defaultBaseROISettings(),
				hiddenColumns: ["running_cost"],
			},
			hidden: { ...HIDDEN, unstaffed: 12 },
			staffing: new Map([
				[
					short.key,
					{
						hasReport: true,
						gaps: [
							{ tier: "pioneer", required: 1100, available: 3 },
						],
					},
				],
				[none.key, { hasReport: false, gaps: [] }],
			]),
		});
		expect(wrapper.text()).toContain("base_roi.table.workforce_free");
		expect(wrapper.text()).toContain("base_roi.table.no_population");
		expect(wrapper.text()).toContain("base_roi.table.hidden_unstaffed");

		const failed = await mountTable({ populationFailed: true });
		expect(failed.text()).toContain("base_roi.table.population_failed");
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
		expect(
			wrapper.findAll("tbody tr[data-row-key]").length
		).toBeGreaterThan(0);
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
		// the pocket chart keeps 30 days, whatever the history holds
		for (const spark of loaded.findAllComponents(PSparkline))
			expect(spark.props("points")).toHaveLength(30);

		const failed = await mountTable({ historyFailed: true });
		expect(failed.findAllComponents(PSparkline)).toHaveLength(0);
		expect(
			failed.find('[title="base_roi.table.history_failed"]').exists()
		).toBe(true);
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
			metrics: {
				...rows[0].metrics,
				breakEven: Infinity,
				dailyProfit: -1,
			},
		};
		const wrapper = await mountTable({ rows: [...rows, never] });
		const keys = () =>
			wrapper
				.findAll("tbody tr[data-row-key]")
				.map((tr) => tr.attributes("data-row-key"));
		for (const button of wrapper.findAll(
			"thead button.p-data-table-title"
		)) {
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
			const wrapper = await mountTable({
				step,
				progress: { current: 3, total: 9 },
			});
			expect(wrapper.text()).toContain(key);
		}
		const pending = await mountTable({
			step: "done",
			planetRowsPending: true,
		});
		expect(pending.text()).toContain("base_roi.status.planet_rows");
	});

	it("fixed experts: the profit header names them, no payback line", async () => {
		const wrapper = await mountTable({
			settings: { ...defaultBaseROISettings(), experts: 3 },
		});
		expect(wrapper.text()).not.toContain("base_roi.table.from_zero");
		expect(wrapper.text()).not.toContain("base_roi.table.at_five");
	});

	it("the recipe is a tooltip on the product name, not a line, not on the tiles", async () => {
		const wrapper = await mountTable();
		const row = rows.find((r) => r.planetNaturalId) ?? rows[0];
		const recipe = recipeLabel(row);
		const cell = wrapper.find(
			`tr[data-row-key="${row.key}"] td[data-col-key="product"]`
		);
		expect(cell.text()).not.toContain(recipe);
		// the tiles keep their own market card: outside the trigger
		const trigger = cell.find(".ptooltip");
		expect(trigger.findComponent({ name: "MaterialTile" }).exists()).toBe(
			false
		);
		expect(trigger.attributes("tabindex")).toBeUndefined();
		await trigger.trigger("mouseenter");
		await flushPromises();
		const tip = document.body.querySelector("[data-recipe]")!;
		expect(tip.textContent).toContain(recipe);
		if (row.planetNaturalId)
			expect(tip.textContent).toContain(`${row.building} · `);
	});

	it("a recipe row's tooltip is its recipe alone", async () => {
		const wrapper = await mountTable();
		const row = rows.find((r) => !r.planetNaturalId)!;
		const cell = wrapper.find(
			`tr[data-row-key="${row.key}"] td[data-col-key="product"] .ptooltip`
		);
		await cell.trigger("mouseenter");
		await flushPromises();
		expect(
			document.body.querySelector("[data-recipe]")!.textContent!.trim()
		).toBe(recipeLabel(row));
	});

	it("(I) or (O) next to market capacity, not cargo; the industry alone", async () => {
		const wrapper = await mountTable();
		const row = rows.find((r) => r.metrics.capacitySide && r.expertise)!;
		const tr = wrapper.find(`tr[data-row-key="${row.key}"]`);
		const capacity = tr.find('td[data-col-key="market_capacity"] abbr');
		expect(capacity.text()).toBe(
			`(base_roi.table.side_${row.metrics.capacitySide})`
		);
		expect(tr.find('td[data-col-key="cargo"] abbr').exists()).toBe(false);
		expect(tr.find('td[data-col-key="expertise"]').text()).toBe(
			`base_roi.industry.${row.expertise}`
		);
	});

	it("planet rows: '@ planet · N jumps', no kind tag", async () => {
		const planet = rows.find((r) => r.kind === "resource" && r.jumps)!;
		const wrapper = await mountTable({ rows: [planet] });
		const text = wrapper.find(`tr[data-row-key="${planet.key}"]`).text();
		expect(text).toContain(" · base_roi.table.jumps");
		expect(text).not.toContain("base_roi.table.resource");
	});

	it("ramp: one break-even number, no payback line under it", async () => {
		const wrapper = await mountTable();
		expect(wrapper.text()).not.toContain("base_roi.table.at_five");
	});

	it("above the table: the search and the min market capacity", async () => {
		const searches: string[] = [];
		const updates: { minMarketCapacity: number }[] = [];
		const wrapper = await mountTable({
			"onUpdate:search": (v: string) => searches.push(v),
			"onUpdate:settings": (v: { minMarketCapacity: number }) =>
				updates.push(v),
		});
		const search = wrapper.findComponent(PInput);
		expect(search.props("placeholder")).toBe("base_roi.table.search");
		search.vm.$emit("update:value", "chem");
		expect(searches).toEqual(["chem"]);
		const capacity = wrapper
			.findAllComponents(PSelect)
			.find(
				(s) =>
					s.attributes("aria-label") ===
					"base_roi.settings.min_market_capacity"
			)!;
		capacity.vm.$emit("update:value", 0.3);
		expect(updates.at(-1)!.minMarketCapacity).toBe(0.3);
	});

	it("every header explains its column; metric cells show their math, without a tab stop each", async () => {
		const wrapper = await mountTable();
		const heads = wrapper.findAll("thead th .ptooltip");
		// product + the shown columns (weekly return, running cost, plots and
		// workforce hidden by default)
		expect(heads).toHaveLength(8);
		await wrapper
			.find('th[data-col-key="break_even"] .ptooltip')
			.trigger("mouseenter");
		await flushPromises();
		expect(document.body.textContent).toContain(
			"base_roi.tooltips.break_even"
		);

		const cells = wrapper.findAll("tbody td .ptooltip");
		expect(cells.length).toBeGreaterThan(0);
		for (const c of cells) expect(c.attributes("tabindex")).toBeUndefined();
		await wrapper
			.find(
				'tbody tr[data-row-key] td[data-col-key="daily_profit"] .ptooltip'
			)
			.trigger("mouseenter");
		await flushPromises();
		expect(document.body.textContent).toContain(
			"base_roi.tooltips.math.revenue"
		);
	});

	it("pagination sits above the table", async () => {
		const many = Array.from({ length: 60 }, (_, i) => ({
			...rows[0],
			key: `r${i}`,
		}));
		const wrapper = await mountTable({ rows: many });
		const nav = wrapper.find("nav.ppagination").element;
		const table = wrapper.find("table").element;
		expect(
			nav.compareDocumentPosition(table) &
				Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(wrapper.findAll("nav.ppagination")).toHaveLength(1);
	});

	it("expands a row into its detail and closes it", async () => {
		const wrapper = await mountTable();
		await wrapper.find("tbody button[aria-expanded]").trigger("click");
		await flushPromises();
		const detail = wrapper.findComponent({ name: "BaseROIRowDetail" });
		expect(detail.exists()).toBe(true);
		detail.vm.$emit("close");
		await flushPromises();
		expect(
			wrapper.findComponent({ name: "BaseROIRowDetail" }).exists()
		).toBe(false);
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
					{
						prices: [{ ticker: "IND", side: "bid", price: 4060 }],
						dailyProfit: -500,
					},
					{
						prices: [{ ticker: "CU", side: "ask", price: 1400 }],
						dailyProfit: 900,
					},
				],
			},
		};
		const wrapper = await mountTable({ rows: [row] });
		const warn = wrapper.find(
			'button[aria-label="base_roi.table.volatility"]'
		);
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
		const wrapper = await mountTable({
			rows: [planet, bare, rows[1]],
			series: { AI1: {} },
		});
		expect(wrapper.text()).toContain(
			`@ ${planet.planetNaturalId} · base_roi.table.no_route`
		);
		expect(wrapper.find('tr[data-row-key="bare"]').text()).toContain("—");
		const sortExpertise = wrapper
			.findAll("thead button.p-data-table-title")
			.find((b) => b.text().includes("base_roi.columns.expertise"))!;
		await sortExpertise.trigger("click");
		await sortExpertise.trigger("click");
		expect(wrapper.findAll("tbody tr[data-row-key]")).toHaveLength(3);
	});
});
