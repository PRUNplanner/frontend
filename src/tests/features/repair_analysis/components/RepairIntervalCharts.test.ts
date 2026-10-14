import { describe, it, expect, beforeAll } from "vitest";

import RepairIntervalCharts from "@/features/repair_analysis/components/RepairIntervalCharts.vue";
import { mountComponent } from "@/tests/mountComponent";
import { switchPalette } from "@/tests/switchPalette";
import { repairBuilding } from "@/tests/features/repair_analysis/components/repairFixtures";

import plan from "@/locales/en_US/plan.json";

const building = repairBuilding();

async function mountCharts(props: Record<string, unknown> = {}) {
	return mountComponent(
		RepairIntervalCharts,
		{ building, interval: building.best, ...props },
		{ messages: { plan } }
	);
}

describe("RepairIntervalCharts", () => {
	beforeAll(() => {
		const style = document.documentElement.style;
		style.setProperty("--color-positive", "#00ff00");
		style.setProperty("--chart-ink", "#ffffff");
		style.setProperty("--color-cx-ai1", "#3d8ce6");
		style.setProperty("--color-cx-ci1", "#d96a22");
	});

	it("draws profit, trade-off and condition on one x axis", async () => {
		const { wrapper } = await mountCharts();

		expect(wrapper.findAll("svg")).toHaveLength(3);
		expect(wrapper.text()).toContain(
			`Why ${building.best} days: repair cost vs. lost output`
		);
		expect(wrapper.text()).toContain(
			`good ${building.range[0]}–${building.range[1]} d`
		);
		// axis 0..180 under the condition panel
		for (const day of ["0", "90", "180"])
			expect(wrapper.findAll("text").map((t) => t.text())).toContain(day);
	});

	it("colours the trade-off lines from the chart theme", async () => {
		const { wrapper } = await mountCharts();
		const strokes = wrapper
			.findAll("svg")[1]
			.findAll("path")
			.map((p) => p.attributes("stroke"));

		expect(strokes).toEqual(
			expect.arrayContaining(["#d96a22", "#3d8ce6", "#ffffff"])
		);
	});

	it("follows the colour-blind palette", async () => {
		const { wrapper } = await mountCharts();
		const curve = () =>
			wrapper
				.findAll("svg")[0]
				.findAll("path")
				.find((p) => p.attributes("stroke-width") === "2.5")!;
		expect(curve().attributes("stroke")).toBe("#00ff00");

		await switchPalette("colorblind", { "--color-positive": "#60a5fa" });

		expect(curve().attributes("stroke")).toBe("#60a5fa");
		await switchPalette("default", { "--color-positive": "#00ff00" });
	});

	it("opens the tooltip on hover with the chosen interval", async () => {
		const { wrapper } = await mountCharts({ interval: 90 });
		const chart = wrapper.find("[data-testid=repair-profit-chart]");

		expect(wrapper.find("[role=tooltip]").exists()).toBe(false);
		await chart.trigger("mouseenter");

		const tip = wrapper.find("[role=tooltip]");
		expect(tip.text()).toContain("Every 90 d:");
		expect(tip.text()).toContain(`vs. best (${building.best} d)`);
	});

	it("opens the tooltip on keyboard focus, on the best day it says so", async () => {
		const { wrapper } = await mountCharts();
		const chart = wrapper.find("[data-testid=repair-profit-chart]");

		expect(chart.attributes("tabindex")).toBe("0");
		await chart.trigger("focusin");

		expect(wrapper.find("[role=tooltip]").text()).toContain(
			"best interval"
		);
	});

	it("toggles the tooltip on a tap", async () => {
		const { wrapper } = await mountCharts();
		const chart = wrapper.find("[data-testid=repair-profit-chart]");

		await chart.trigger("touchstart");
		await chart.trigger("click");
		expect(wrapper.find("[role=tooltip]").exists()).toBe(true);

		await chart.trigger("touchstart");
		await chart.trigger("click");
		expect(wrapper.find("[role=tooltip]").exists()).toBe(false);
	});

	it("keeps the tapped day when the tap also focuses the chart", async () => {
		const { wrapper } = await mountCharts();
		const chart = wrapper.find("[data-testid=repair-profit-chart]");
		// 760 wide at x 0: the plot runs from 40 to 746
		chart.element.getBoundingClientRect = () =>
			({ left: 0, width: 760 }) as DOMRect;

		// jsdom has no PointerEvent, the handler only reads clientX
		chart.element.dispatchEvent(
			new MouseEvent("pointerdown", { clientX: 40 + (706 * 120) / 180 })
		);
		await chart.trigger("focusin");
		await chart.trigger("mouseenter");

		expect(wrapper.find("[role=tooltip]").text()).toContain("Every 120 d:");
	});

	it("names a single-day good range once", async () => {
		const best = building.best;
		const { wrapper } = await mountCharts({
			building: { ...building, range: [best, best] },
		});

		expect(wrapper.text()).toContain(`good ${best} d`);
		expect(wrapper.text()).not.toContain(`good ${best}–${best} d`);
	});

	it.each([150, 500, 2000, 20000, -500])(
		"keeps the trade-off labels apart (production %i)",
		async (production) => {
			const { wrapper } = await mountCharts({
				building: repairBuilding({}, production),
			});
			const labels = wrapper
				.findAll("svg")[1]
				.findAll("g[font-size='12'] text")
				.map((t) => {
					const x = Number(t.attributes("x"));
					const anchor = t.attributes("text-anchor") ?? "start";
					return {
						left: anchor === "end" ? x - 68 : anchor === "middle" ? x - 34 : x,
						y: Number(t.attributes("y")),
					};
				});

			expect(labels).toHaveLength(3);
			const [repair, lost] = labels;
			expect(
				Math.abs(repair.left - lost.left) >= 68 ||
					Math.abs(repair.y - lost.y) >= 15
			).toBe(true);
		}
	);

	it("keeps the repair cost in view for output worth less than nothing", async () => {
		const { wrapper } = await mountCharts({
			building: repairBuilding({}, -500),
		});
		const tradeoff = wrapper.findAll("svg")[1];
		const ticks = tradeoff
			.findAll("g[text-anchor='end'] text")
			.map((t) => t.text());
		// a real axis, not 0 / 1 / 1
		expect(new Set(ticks).size).toBe(ticks.length);
		expect(ticks.length).toBeGreaterThanOrEqual(2);

		// repair cost line, days 8 to 180, inside the 120 px plot from y 4
		const repair = tradeoff
			.findAll("path")
			.find((p) => p.attributes("stroke") === "#d96a22")!;
		const ys = repair
			.attributes("d")!
			.trim()
			.split(/[ML]/)
			.filter(Boolean)
			.map((pt) => Number(pt.trim().split(" ")[1]));
		for (const y of ys.slice(7)) {
			expect(y).toBeGreaterThanOrEqual(4);
			expect(y).toBeLessThanOrEqual(124);
		}
	});

	it("keeps a range label at the right end inside the plot", async () => {
		const { wrapper } = await mountCharts({
			building: { ...building, range: [176, 180] },
		});
		const label = wrapper
			.findAll("svg")[0]
			.findAll("text")
			.find((t) => t.text() === "good 176–180 d")!;

		// 760 wide, plot ends at 746: centred 50 px before it
		expect(Number(label.attributes("x"))).toBe(696);
	});

	it("marks the player's buildings by age, one marker per age", async () => {
		const { wrapper } = await mountCharts({ ages: [12, 40, 40] });

		expect(wrapper.findAll(".repair-fio-marker")).toHaveLength(2);
		expect(wrapper.findAll(".repair-fio-dot")).toHaveLength(2);
		expect(wrapper.text()).toContain("your buildings today (FIO)");
	});

	it("has no FIO markers without ages", async () => {
		const { wrapper } = await mountCharts();

		expect(wrapper.findAll(".repair-fio-marker")).toHaveLength(0);
		expect(wrapper.text()).not.toContain("(FIO)");
	});

	it("leaves no hex colour in the repair analysis components", () => {
		const sources = import.meta.glob(
			[
				"/src/features/repair_analysis/components/*.vue",
				"/src/features/planning/components/tools/PlanRepairAnalysis.vue",
			],
			{ query: "?raw", import: "default", eager: true }
		) as Record<string, string>;

		expect(Object.keys(sources).length).toBeGreaterThan(5);
		for (const [file, source] of Object.entries(sources))
			expect(source.match(/#[0-9a-f]{3,8}\b/gi), file).toBeNull();
	});
});
