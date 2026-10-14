import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import PLineChart from "@/ui/charts/PLineChart.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { ILineSeries } from "@/ui/charts/charts.types";

const DAY = 86400000;
const D0 = 1790294400000; // 2026-09-25 00:00 UTC
const DAYS = [D0, D0 + DAY, D0 + 2 * DAY, D0 + 3 * DAY, D0 + 4 * DAY];

const SERIES: ILineSeries[] = [
	{ key: "AI1", label: "AI1", color: "#3d8ce6", values: [240, 238, 236, 237, 236] },
	{ key: "CI1", label: "CI1", color: "#d96a22", values: [250, 255, null, 257, 258] },
	{ key: "IC1", label: "IC1", color: "#1fa67a", values: [245, 246, 248, 247, 247] },
	{ key: "NC1", label: "NC1", color: "#c85fd0", values: [265, 268, 269, 270, 270] },
];
const VOLUME = [100, 200, 0, 400, 300];

async function mountChart(props: Record<string, unknown> = {}) {
	const { wrapper } = await mountComponent(
		PLineChart,
		{
			days: DAYS,
			series: SERIES,
			volume: VOLUME,
			label: "VWAP of RAT",
			volumeTitle: "Traded volume, all exchanges",
			volumeUnit: "units / day",
			volumeLabel: "Volume",
			...props,
		},
		{ attach: true }
	);
	return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountChart>>;

/** a pointer event at x px of the plot's hit area (which starts at 0) */
async function pointer(
	wrapper: Wrapper,
	type: string,
	x: number,
	pointerType = "mouse"
) {
	const hit = wrapper.find(".line-hit");
	vi.spyOn(hit.element, "getBoundingClientRect").mockReturnValue({
		left: 0,
		top: 0,
	} as DOMRect);
	// jsdom has no PointerEvent: a mouse event with its pointerType
	const event = new MouseEvent(type, { clientX: x, bubbles: true });
	Object.defineProperty(event, "pointerType", { value: pointerType });
	hit.element.dispatchEvent(event);
	await wrapper.vm.$nextTick();
}

const tooltipRows = (wrapper: Wrapper) =>
	wrapper
		.findAll(".line-tooltip .flex.items-center")
		.map((r) =>
			r
				.findAll("span")
				.map((span) => span.text())
				.filter(Boolean)
				.join(" ")
		);

describe("PLineChart", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(500);
	});
	afterEach(() => vi.restoreAllMocks());

	it("draws a 2 px line per series, broken at gaps", async () => {
		const wrapper = await mountChart();

		const lines = wrapper.findAll(".line-series");
		expect(lines).toHaveLength(4);
		expect(lines[0].attributes("stroke-width")).toBe("2");
		expect(lines[0].attributes("stroke")).toBe("#3d8ce6");
		// CI1 misses day 2: two moves
		expect(lines[1].attributes("d")!.match(/M/g)).toHaveLength(2);
		expect(wrapper.find("svg").attributes("aria-label")).toBe("VWAP of RAT");
	});

	it("draws a dot for a day without values on either side", async () => {
		const wrapper = await mountChart({
			series: [
				{ key: "AI1", label: "AI1", color: "#3d8ce6", values: [null, 371, null, null, 360] },
				{ key: "CI1", label: "CI1", color: "#d96a22", values: [320, 324, null, null, null] },
			],
		});

		// AI1 days 1 and 4 stand alone, CI1 days 0 and 1 form a line
		const dots = wrapper.findAll(".line-dot");
		expect(dots).toHaveLength(2);
		expect(dots.map((d) => d.attributes("fill"))).toEqual([
			"#3d8ce6",
			"#3d8ce6",
		]);
	});

	it("labels every line end inside the svg, never closer than 18 px", async () => {
		const wrapper = await mountChart();

		const labels = wrapper.findAll(".line-label");
		expect(labels.map((l) => l.text())).toEqual([
			"NC1 270",
			"CI1 258",
			"IC1 247",
			"AI1 236",
		]);
		const ys = labels.map((l) => Number(l.find("text").attributes("y")));
		ys.slice(1).forEach((y, i) => expect(y - ys[i]).toBeGreaterThanOrEqual(18));
		// the widest label ends inside the 800 px box
		labels.forEach((l) => {
			const text = l.find("text");
			const right =
				Number(text.attributes("x")) + text.text().length * 7;
			expect(right).toBeLessThanOrEqual(800);
		});
	});

	it("draws the volume panel on its own axis with title and unit", async () => {
		const wrapper = await mountChart();

		const panel = wrapper.find(".line-volume");
		expect(panel.text()).toContain("Traded volume, all exchanges");
		expect(panel.text()).toContain("units / day");
		expect(panel.findAll("rect")).toHaveLength(5);

		const none = await mountChart({ volume: [] });
		expect(none.find(".line-volume").exists()).toBe(false);
	});

	it("shows a crosshair tooltip sorted as the lines on hover", async () => {
		const wrapper = await mountChart();

		// plot runs from 44 px; the last day sits at its right end
		await pointer(wrapper, "pointermove", 1000);

		expect(wrapper.find(".line-tooltip").text()).toContain("Sep 29, 2026");
		expect(tooltipRows(wrapper)).toEqual([
			"NC1 270.00",
			"CI1 258.00",
			"IC1 247.00",
			"AI1 236.00",
		]);
		expect(wrapper.find(".line-tooltip").text()).toContain("Volume");
		expect(wrapper.find(".line-tooltip").text()).toContain("300");
		expect(wrapper.findAll("circle")).toHaveLength(4);

		// a day without a CI1 value leaves it out
		await pointer(wrapper, "pointermove", 44 + 2.5 * ((800 - 44 - 92) / 4));
		expect(tooltipRows(wrapper).map((r) => r.split(" ")[0])).not.toContain(
			"CI1"
		);

		await pointer(wrapper, "pointerleave", 0);
		expect(wrapper.find(".line-tooltip").exists()).toBe(false);
	});

	it("opens on tap and closes on a second tap or one outside", async () => {
		const wrapper = await mountChart();

		await pointer(wrapper, "pointerdown", 1000, "touch");
		expect(wrapper.find(".line-tooltip").exists()).toBe(true);
		// a touch move doesn't move or close it
		await pointer(wrapper, "pointerleave", 0, "touch");
		expect(wrapper.find(".line-tooltip").exists()).toBe(true);

		await pointer(wrapper, "pointerdown", 1000, "touch");
		expect(wrapper.find(".line-tooltip").exists()).toBe(false);

		await pointer(wrapper, "pointerdown", 1000, "touch");
		document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		await wrapper.vm.$nextTick();
		expect(wrapper.find(".line-tooltip").exists()).toBe(false);
	});

	it("steps through the days with the arrow keys", async () => {
		const wrapper = await mountChart();
		const hit = wrapper.find(".line-hit");

		await hit.trigger("keydown", { key: "ArrowRight" });
		expect(hit.attributes("aria-valuenow")).toBe("0");
		expect(wrapper.find(".line-tooltip").text()).toContain("Sep 25, 2026");

		await hit.trigger("keydown", { key: "ArrowLeft" });
		expect(hit.attributes("aria-valuenow")).toBe("0");

		await hit.trigger("keydown", { key: "Escape" });
		expect(wrapper.find(".line-tooltip").exists()).toBe(false);
	});

	it("thins the date ticks on a narrow chart", async () => {
		const wide = await mountChart();
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(340);
		const narrow = await mountChart();

		expect(narrow.findAll(".line-x-tick").length).toBeLessThan(
			wide.findAll(".line-x-tick").length
		);
		expect(narrow.findAll(".line-x-tick").length).toBeGreaterThanOrEqual(2);
	});

	it("never repeats a tick and keeps the cents of cheap prices", async () => {
		const narrow = await mountChart({
			series: [
				{ key: "AI1", label: "AI1", color: "#1", values: [36.2, 36.5, 36.9, 37, 36.4] },
				{ key: "CI1", label: "CI1", color: "#2", values: [36.3, 36.6, 36.8, 36.7, 36.55] },
			],
		});
		const ticks = narrow
			.findAll("text")
			.map((t) => t.text())
			.filter((t) => /^36|^37/.test(t));
		expect(ticks.length).toBeGreaterThan(2);
		expect(new Set(ticks).size).toBe(ticks.length);
		// top to bottom: the higher CI1 first
		expect(narrow.findAll(".line-label").map((l) => l.text())).toEqual([
			"CI1 36.55",
			"AI1 36.40",
		]);

		const thousands = await mountChart({
			series: [
				{ key: "AI1", label: "AI1", color: "#1", values: [1236, 1240, 1250, 1255, 1262] },
				{ key: "CI1", label: "CI1", color: "#2", values: [1238, 1241, 1244, 1246, 1248] },
			],
		});
		expect(thousands.findAll(".line-label").map((l) => l.text())).toEqual([
			"AI1 1,262",
			"CI1 1,248",
		]);
		expect(thousands.text()).toContain("1,240");
		expect(thousands.text()).not.toContain("1.2k");
	});

	it("shows whole counts without decimals, as traded units", async () => {
		const counts = await mountChart({
			series: [
				{ key: "AI1", label: "AI1", color: "#1", values: [3, 5, 4, 6, 7] },
				{ key: "CI1", label: "CI1", color: "#2", values: [12, 30, 20, 10, 40] },
			],
		});

		expect(counts.findAll(".line-label").map((l) => l.text())).toEqual([
			"CI1 40",
			"AI1 7",
		]);
	});

	it("drops the volume unit where it doesn't fit beside the title", async () => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
		const narrow = await mountChart();

		expect(narrow.find(".line-volume").text()).toContain(
			"Traded volume, all exchanges"
		);
		expect(narrow.find(".line-volume").text()).not.toContain("units / day");
	});

	it("keeps the tooltip off the end labels and rounds the volume", async () => {
		const wrapper = await mountChart({ volume: [1, 2, 3, 4, 2119.6305] });

		await pointer(wrapper, "pointermove", 1000);

		const tooltip = wrapper.find(".line-tooltip");
		const left = parseFloat(tooltip.attributes("style")!.split("left: ")[1]);
		const firstLabel = Number(
			wrapper.find(".line-label line").attributes("x1")
		);
		expect(left + 176).toBeLessThanOrEqual(firstLabel);
		expect(tooltip.text()).toContain("2,120");
	});

	it("draws one date tick per day at most", async () => {
		const wrapper = await mountChart({
			days: DAYS.slice(0, 2),
			series: SERIES.map((s) => ({ ...s, values: s.values.slice(0, 2) })),
			volume: [],
		});

		const keys = wrapper.findAll(".line-x-tick").map((t) => t.text());
		expect(keys).toHaveLength(2);
	});

	it("draws nothing for less than two days", async () => {
		const wrapper = await mountChart({ days: [D0] });

		expect(wrapper.find("svg").exists()).toBe(false);
	});
});
