import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import BaseROIRowDetail from "@/features/base_roi/components/BaseROIRowDetail.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PLayerClose from "@/ui/components/PLayerClose.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import { baseROIRows } from "@/tests/features/base_roi/baseROI.fixtures";
import { copyToClipboard } from "@/util/data";
import { usePlanningStore } from "@/stores/planningStore";
import { createPinia, type Pinia } from "pinia";

// Types & Interfaces
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

const query = vi.hoisted(() => ({
	calls: [] as { name: string; params: unknown }[],
	failCreate: false,
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params: unknown) => ({
		execute: async () => {
			query.calls.push({ name, params });
			if (name === "GetPlanetSearchIndex")
				return [
					{ planet_natural_id: "UV-072c", planet_name: "UV-072c" },
					{ planet_natural_id: "OT-580b", planet_name: "Montem" },
				];
			if (name === "CreatePlan") {
				if (query.failCreate) throw new Error("400");
				return { uuid: "new-plan" };
			}
			throw new Error(name);
		},
	}),
}));
const push = vi.fn();
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/util/data", async (original) => ({
	...(await original()),
	copyToClipboard: vi.fn(),
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: { name: "MaterialTile", props: ["ticker"], render: () => null },
}));
vi.mock("@/ui/charts/PLineChart.vue", () => ({
	default: { name: "PLineChart", props: ["days", "series", "label"], render: () => null },
}));

let rows: IBaseROIRow[];
beforeAll(async () => {
	rows = await baseROIRows();
});
beforeEach(() => {
	query.calls = [];
	push.mockReset();
	vi.mocked(copyToClipboard).mockReset();
});

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));

async function mountDetail(
	row: IBaseROIRow,
	tryOnPlanet = vi.fn(),
	pinia: Pinia = createPinia(),
	props: Record<string, unknown> = {}
) {
	const closes: unknown[] = [];
	const { wrapper } = await mountComponent(
		BaseROIRowDetail,
		{
			row,
			settings: defaultBaseROISettings(),
			series: null,
			tryOnPlanet,
			cxUuid: undefined,
			onClose: () => closes.push(true),
			...props,
		},
		{ pinia }
	);
	await flushPromises();
	const button = (label: string) =>
		wrapper.findAll("button").find((b) => b.text() === label)!;
	return { wrapper, button, closes };
}

describe("BaseROIRowDetail (criteria 16, 26)", () => {
	it("shows all ten sections with formulas", async () => {
		const { wrapper } = await mountDetail(rows[0]);
		const sections = wrapper.findAll("section");
		expect(sections).toHaveLength(10);
		for (let i = 1; i <= 10; i++)
			expect(sections[i - 1].text()).toContain(`base_roi.detail.s${i}`);
		expect(wrapper.text()).toContain("base_roi.detail.buffer_formula");
	});

	it("copies the same numbers as text", async () => {
		const row = rows[0];
		const { wrapper, button } = await mountDetail(row);
		await button("base_roi.detail.copy").trigger("click");
		const text = vi.mocked(copyToClipboard).mock.calls[0][0];
		for (const dd of wrapper.findAll("dd").map((d) => d.text()))
			expect(text).toContain(dd);
	});

	it("opens a plan with the row's layout", async () => {
		const row = rows[0];
		const { button } = await mountDetail(row);
		await button("base_roi.detail.open_plan").trigger("click");
		await flushPromises();
		const create = query.calls.find((c) => c.name === "CreatePlan")!;
		const data = (create.params as { data: Record<string, any> }).data;
		expect(data.planet_natural_id).toBe("OT-580b");
		expect(data.plan_data.buildings).toEqual([
			{
				name: row.building,
				amount: row.productionBuildings,
				active_recipes: [{ recipeid: row.recipeId, amount: 1 }],
			},
		]);
		expect(push).toHaveBeenCalledWith("/plan/OT-580b/new-plan");
	});

	it("opens the plan in an empire without a faction bonus for the building", async () => {
		// TNP is Chemistry: Outside Region gives it a bonus
		const row = rows.find((r) => r.building === "TNP")!;
		const empire = (uuid: string, empire_faction: string) => ({
			uuid,
			empire_name: uuid,
			empire_faction,
			empire_permits_used: 1,
			empire_permits_total: 3,
			plans: [],
		});
		const pinia = createPinia();
		const store = usePlanningStore(pinia);
		// @ts-expect-error mock data
		store.setEmpires([empire("outside", "OUTSIDEREGION"), empire("none", "NONE")]);
		toast.mockReset();
		const { button } = await mountDetail(row, vi.fn(), pinia);
		await button("base_roi.detail.open_plan").trigger("click");
		await flushPromises();
		const create = query.calls.find((c) => c.name === "CreatePlan")!;
		expect((create.params as { data: { empire_uuid?: string } }).data.empire_uuid).toBe("none");
		expect(toast).not.toHaveBeenCalled();

		// no such empire: the plan opens anyway, with a note
		store.setEmpires([]);
		query.calls = [];
		await button("base_roi.detail.open_plan").trigger("click");
		await flushPromises();
		expect(toast).toHaveBeenCalledWith(
			"base_roi.detail.plan_other_empire",
			expect.anything()
		);
	});

	it("tries a recipe row on a planet and back (criterion 26)", async () => {
		const row = rows.find((r) => r.kind === "recipe")!;
		const onPlanet: IBaseROIRow = {
			...row,
			planetNaturalId: "UV-072c",
			planetName: "UV-072c",
			metrics: { ...row.metrics, buildingCost: row.metrics.buildingCost + 1000 },
		};
		const tryOnPlanet = vi.fn().mockResolvedValue(onPlanet);
		const { wrapper, button } = await mountDetail(row, tryOnPlanet);

		wrapper.findComponent(PSelect).vm.$emit("update:value", "UV-072c");
		await flushPromises();
		expect(tryOnPlanet).toHaveBeenCalledWith(row, "UV-072c");
		expect(wrapper.text()).toContain("base_roi.detail.compare");
		expect(wrapper.text()).toContain("UV-072c");

		await button("base_roi.detail.back_standard").trigger("click");
		await flushPromises();
		expect(wrapper.text()).not.toContain("base_roi.detail.compare");
		expect(tryOnPlanet).toHaveBeenCalledTimes(1);
	});

	it("planet rows have no planet picker", async () => {
		const row = rows.find((r) => r.kind === "resource")!;
		const { wrapper } = await mountDetail(row);
		expect(wrapper.findComponent(PSelect).exists()).toBe(false);
		expect(query.calls.map((c) => c.name)).not.toContain("GetPlanetSearchIndex");
	});

	it("section 9: the 30-day chart from the series, or the no-history note", async () => {
		const row = rows[0];
		// every material on AI1 with a 7D price: one series per ticker
		const priced = {
			...row,
			materials: row.materials.map((m) => ({
				...m,
				source: { ...m.source, exchange: "AI1" as const, key: "vwap_7d" as const },
			})),
		};
		const series = {
			AI1: Object.fromEntries(priced.materials.map((m) => [m.ticker, Array(30).fill(m.price)])),
		};
		const { wrapper } = await mountDetail(priced, vi.fn(), createPinia(), { series });
		const chart = wrapper.findComponent({ name: "PLineChart" });
		expect(chart.props("series")).toHaveLength(3);
		expect(chart.props("days")).toHaveLength(30);
		expect(wrapper.text()).toContain("base_roi.detail.history_note");

		const none = await mountDetail(row, vi.fn(), createPinia(), { series: { AI1: {} } });
		expect(none.wrapper.text()).toContain("base_roi.table.history_none");
	});

	it("the close button closes it", async () => {
		const { wrapper, closes } = await mountDetail(rows[0]);
		wrapper.findComponent(PLayerClose).vm.$emit("click");
		expect(closes).toHaveLength(1);
	});

	it("names planets by name and id, falls back to the id", async () => {
		const row = rows.find((r) => r.kind === "recipe")!;
		const never: IBaseROIRow = {
			...row,
			metrics: { ...row.metrics, breakEven: Infinity },
		};
		const onPlanet: IBaseROIRow = {
			...never,
			planetNaturalId: "OT-580b",
			planetName: null,
		};
		const { wrapper } = await mountDetail(never, vi.fn().mockResolvedValue(onPlanet));
		const select = wrapper.findComponent(PSelect);
		expect(select.props("options").map((o: { label: string }) => o.label)).toEqual([
			"UV-072c",
			"Montem (OT-580b)",
		]);
		select.vm.$emit("update:value", "OT-580b");
		await flushPromises();
		expect(wrapper.text()).toContain("OT-580b");
		expect(wrapper.text()).toContain("base_roi.detail.open_planet");
	});

	it("a planet that fails to load says so and keeps the standard planet", async () => {
		toast.mockReset();
		const row = rows.find((r) => r.kind === "recipe")!;
		const { wrapper } = await mountDetail(row, vi.fn().mockRejectedValue(new Error("down")));
		wrapper.findComponent(PSelect).vm.$emit("update:value", "UV-072c");
		await flushPromises();
		expect(toast).toHaveBeenCalledWith("base_roi.detail.planet_failed", { type: "error" });
		expect(wrapper.text()).not.toContain("base_roi.detail.compare");
	});

	it("a plan that can't be created says so", async () => {
		toast.mockReset();
		query.calls = [];
		query.failCreate = true;
		const { button } = await mountDetail(rows[0]);
		await button("base_roi.detail.open_plan").trigger("click");
		await flushPromises();
		query.failCreate = false;
		expect(toast).toHaveBeenCalledWith("base_roi.detail.plan_failed", { type: "error" });
		expect(push).not.toHaveBeenCalled();
	});
});
