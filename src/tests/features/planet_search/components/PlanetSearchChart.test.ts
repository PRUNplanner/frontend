import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import PlanetSearchChart from "@/features/planet_search/components/PlanetSearchChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type { VueWrapper } from "@vue/test-utils";
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";

const resolve = vi.fn((to: string) => ({ href: `/app${to}` }));
vi.mock("vue-router", () => ({ useRouter: () => ({ resolve }) }));

function planet(
	id: string,
	h2o: number,
	feo: number,
	fertility: number,
	program: string | null = null
): PlanetSearchIndexEntry {
	return {
		planet_natural_id: id,
		planet_name: `Name ${id}`,
		system_id: `sys-${id}`,
		surface: true,
		gravity_type: "NORMAL",
		pressure_type: "NORMAL",
		temperature_type: "NORMAL",
		fertility,
		has_localmarket: true,
		has_chamberofcommerce: false,
		has_warehouse: true,
		has_administrationcenter: false,
		has_shipyard: false,
		cogc_program_status: null,
		cogc_programs: program
			? [{ program_type: program, start_epochms: 0, end_epochms: 10 }]
			: [],
		resources: [
			{ material_ticker: "H2O", resource_type: "LIQUID", daily_extraction: h2o, max_daily_extraction: h2o },
			{ material_ticker: "FEO", resource_type: "MINERAL", daily_extraction: feo, max_daily_extraction: feo },
		],
	} as PlanetSearchIndexEntry;
}

const PLANETS = [
	planet("A", 45, 1, 0.4, "ADVERTISING_AGRICULTURE"),
	planet("B", 30, 9, 0.1),
	planet("C", 25, 5, 0),
];
const JUMPS: Record<string, number> = { "sys-A": 7, "sys-B": 4, "sys-C": 8 };
const ctx: IPlanetSearchContext = {
	now: 5,
	refJumps: (ref) =>
		ref.kind === "cx" && ref.code === "CI1"
			? new Map(Object.entries(JUMPS))
			: undefined,
};

async function mountChart(props: Record<string, unknown> = {}) {
	const onPin = vi.fn();
	const { component } = await mountComponent(
		PlanetSearchChart,
		{
			planets: PLANETS,
			filter: {
				...defaultFilter(),
				materialGroups: [{ op: "all", materials: ["H2O", "FEO"] }],
				references: [{ kind: "cx", code: "CI1" }],
			},
			ctx,
			pins: ["A"],
			showPins: true,
			refName: (r: { code?: string }) => r.code ?? "plan",
			onPin,
			...props,
		},
		{ attach: true }
	);
	return { chart: component as VueWrapper, onPin };
}

const rows = (chart: VueWrapper) =>
	chart.findAll("ol li").map((li) => li.attributes("data-key"));

describe("PlanetSearchChart", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(700);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(480);
	});
	afterEach(() => vi.restoreAllMocks());

	it("plots the first material against jumps, frontier green and ranked", async () => {
		const { chart } = await mountChart();

		expect(chart.findAll(".scatter-dot")).toHaveLength(3);
		expect(chart.findAll(".scatter-ring")).toHaveLength(1);
		expect(chart.find(".scatter-frontier").exists()).toBe(true);
		expect(rows(chart)).toEqual(["A", "B", "C"]);
		// A and B are the trade-off, C is beaten by both
		const bars = chart.findAll("ol li .h-full");
		expect(bars.map((b) => b.classes().includes("bg-positive"))).toEqual([
			true,
			true,
			false,
		]);
		expect(chart.text()).toContain("planet_search.chart.per_day");
		expect(chart.text()).toContain("planet_search.chart.x_refs");
	});

	it("redraws for another Y material", async () => {
		const { chart } = await mountChart();
		chart.findComponent({ name: "PSelect" }).vm.$emit("update:value", "FEO");
		await chart.vm.$nextTick();
		expect(rows(chart)).toEqual(["B", "C", "A"]);
	});

	it("falls back to fertility without a material filter, at constant size", async () => {
		const { chart } = await mountChart({
			filter: {
				...defaultFilter(),
				references: [{ kind: "cx", code: "CI1" }],
			},
		});
		expect(chart.findComponent({ name: "PSelect" }).exists()).toBe(false);
		expect(chart.text()).toContain("planet_search.chart.fertility");
		const radii = chart
			.findAll(".scatter-dot")
			.map((g) => g.findAll("circle")[1].attributes("r"));
		expect(new Set(radii)).toEqual(new Set(["6"]));
	});

	it("pins from the list and the chart, and opens a plan on a double-click", async () => {
		vi.useFakeTimers();
		const open = vi.spyOn(window, "open").mockReturnValue(null);
		const { chart, onPin } = await mountChart();

		chart.find(".scatter-dot").element.dispatchEvent(
			new MouseEvent("click", { detail: 1, bubbles: true })
		);
		vi.advanceTimersByTime(300);
		expect(onPin).toHaveBeenCalledTimes(1);

		await chart.findAll("ol li button")[0].trigger("click");
		expect(onPin).toHaveBeenLastCalledWith("A");

		await chart.find('[aria-label="Name B"]').trigger("dblclick");
		expect(open).toHaveBeenCalledWith("/app/plan/B", "_blank", "noopener");
		vi.useRealTimers();
	});

	it("doesn't pin from the chart without the compare tray", async () => {
		const { chart, onPin } = await mountChart({ showPins: false });
		await chart.find('[aria-label="Name B"]').trigger("keydown", { key: "Enter" });
		expect(onPin).not.toHaveBeenCalled();
	});

	it("links hover between the list and the chart", async () => {
		const { chart } = await mountChart();
		await chart.findAll("ol li")[1].trigger("mouseenter");
		expect(chart.findAll("ol li")[1].classes()).toContain("bg-white/10");

		await chart.findAll("ol li")[1].trigger("mouseleave");
		await chart.find('[aria-label="Name C"]').trigger("mouseenter");
		expect(chart.findAll("ol li")[2].classes()).toContain("bg-white/10");
		expect(document.body.querySelector("[role=tooltip]")?.textContent).toContain(
			"LM · WAR"
		);
	});

	it("colours by COGC program with a legend", async () => {
		const { chart } = await mountChart();
		const cogc = chart
			.findAll("button")
			.find((b) => b.text() === "planet_search.chart.colour_cogc")!;
		await cogc.trigger("click");
		expect(chart.find("ul").text()).toContain(
			"game.cogc_program.ADVERTISING_AGRICULTURE"
		);
		expect(chart.find("ul").text()).toContain("planet_search.chart.no_program");
	});
});
