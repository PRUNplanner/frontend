import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import PLineChart from "@/ui/charts/PLineChart.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { ILineSeries } from "@/ui/charts/charts.types";

const DAY = 86400000;
const D0 = 1790294400000; // 2026-09-25 00:00 UTC
const DAYS = [D0, D0 + DAY, D0 + 2 * DAY, D0 + 3 * DAY, D0 + 4 * DAY];

const SERIES: ILineSeries[] = [
	{
		key: "AI1",
		label: "AI1",
		color: "#3d8ce6",
		values: [240, 238, 236, 237, 236],
	},
	{
		key: "CI1",
		label: "CI1",
		color: "#d96a22",
		values: [250, 255, null, 257, 258],
	},
	{
		key: "IC1",
		label: "IC1",
		color: "#1fa67a",
		values: [245, 246, 248, 247, 247],
	},
	{
		key: "NC1",
		label: "NC1",
		color: "#c85fd0",
		values: [265, 268, 269, 270, 270],
	},
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
	wrapper.findAll(".line-tooltip .flex.items-center").map((r) =>
		r
			.findAll("span")
			.map((span) => span.text())
			.filter(Boolean)
			.join(" ")
	);

const yTickTexts = (wrapper: Wrapper) =>
	wrapper
		.findAll("g.text-xs:not(.pointer-events-none) > g text")
		.map((t) => t.text());

describe("PLineChart", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			800
		);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
			500
		);
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
		expect(wrapper.find("svg").attributes("aria-label")).toBe(
			"VWAP of RAT"
		);
	});

	it("draws a dot for a day without values on either side", async () => {
		const wrapper = await mountChart({
			series: [
				{
					key: "AI1",
					label: "AI1",
					color: "#3d8ce6",
					values: [null, 371, null, null, 360],
				},
				{
					key: "CI1",
					label: "CI1",
					color: "#d96a22",
					values: [320, 324, null, null, null],
				},
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
		ys.slice(1).forEach((y, i) =>
			expect(y - ys[i]).toBeGreaterThanOrEqual(18)
		);
		// the widest label ends inside the 800 px box
		labels.forEach((l) => {
			const text = l.find("text");
			const right = Number(text.attributes("x")) + text.text().length * 7;
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
		document.body.dispatchEvent(
			new Event("pointerdown", { bubbles: true })
		);
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
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			340
		);
		const narrow = await mountChart();

		expect(narrow.findAll(".line-x-tick").length).toBeLessThan(
			wide.findAll(".line-x-tick").length
		);
		expect(narrow.findAll(".line-x-tick").length).toBeGreaterThanOrEqual(2);
	});

	it("never repeats a tick and keeps the cents of cheap prices", async () => {
		const narrow = await mountChart({
			series: [
				{
					key: "AI1",
					label: "AI1",
					color: "#1",
					values: [36.2, 36.5, 36.9, 37, 36.4],
				},
				{
					key: "CI1",
					label: "CI1",
					color: "#2",
					values: [36.3, 36.6, 36.8, 36.7, 36.55],
				},
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
				{
					key: "AI1",
					label: "AI1",
					color: "#1",
					values: [1236, 1240, 1250, 1255, 1262],
				},
				{
					key: "CI1",
					label: "CI1",
					color: "#2",
					values: [1238, 1241, 1244, 1246, 1248],
				},
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
				{
					key: "AI1",
					label: "AI1",
					color: "#1",
					values: [3, 5, 4, 6, 7],
				},
				{
					key: "CI1",
					label: "CI1",
					color: "#2",
					values: [12, 30, 20, 10, 40],
				},
			],
		});

		expect(counts.findAll(".line-label").map((l) => l.text())).toEqual([
			"CI1 40",
			"AI1 7",
		]);
	});

	it("drops the volume unit where it doesn't fit beside the title", async () => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			300
		);
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
		const left = parseFloat(
			tooltip.attributes("style")!.split("left: ")[1]
		);
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

	it("follows the box size through a ResizeObserver and stops on unmount", async () => {
		const observers: {
			callback: ResizeObserverCallback;
			observe: ReturnType<typeof vi.fn>;
			disconnect: ReturnType<typeof vi.fn>;
		}[] = [];
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				disconnect = vi.fn();
				constructor(public callback: ResizeObserverCallback) {
					observers.push(this);
				}
			}
		);
		const wrapper = await mountChart();
		expect(wrapper.find("svg").attributes("width")).toBe("800");

		const [observer] = observers;
		expect(observer.observe).toHaveBeenCalledOnce();
		observer.callback(
			[
				{
					contentRect: { width: 640, height: 320 },
				} as ResizeObserverEntry,
			],
			observer as unknown as ResizeObserver
		);
		await wrapper.vm.$nextTick();
		expect(wrapper.find("svg").attributes("width")).toBe("640");
		expect(wrapper.find("svg").attributes("height")).toBe("320");

		wrapper.unmount();
		expect(observer.disconnect).toHaveBeenCalledOnce();
	});

	it("renders without a ResizeObserver at the initial size", async () => {
		vi.stubGlobal("ResizeObserver", undefined);
		const wrapper = await mountChart();

		expect(wrapper.find("svg").attributes("width")).toBe("800");
		expect(wrapper.findAll(".line-series")).toHaveLength(4);
	});

	it("draws empty axes and no lines for series without values", async () => {
		const wrapper = await mountChart({
			series: [
				{
					key: "AI1",
					label: "AI1",
					color: "#1",
					values: [null, null, null, null, null],
				},
			],
			volume: [],
		});

		expect(wrapper.find(".line-series").attributes("d")).toBe("");
		expect(wrapper.findAll(".line-label")).toHaveLength(0);
		// fallback ticks 0 and 1
		const ticks = yTickTexts(wrapper);
		expect(ticks).toEqual(["0", "1"]);
	});

	it("compacts the y ticks once the step reaches a thousand", async () => {
		const wrapper = await mountChart({
			series: [
				{
					key: "AI1",
					label: "AI1",
					color: "#1",
					values: [0, 2000, 4000, 8000, 10000],
				},
			],
			volume: [],
		});

		const ticks = yTickTexts(wrapper);
		expect(ticks).toEqual(["0", "2k", "4k", "6k", "8k", "10k"]);
	});

	it("adds decimals for tiny tick steps", async () => {
		const wrapper = await mountChart({
			series: [
				{
					key: "AI1",
					label: "AI1",
					color: "#1",
					values: [0.00001, 0.00002, 0.00003, 0.00002, 0.00004],
				},
			],
			volume: [],
		});

		const ticks = yTickTexts(wrapper);
		// capped at four decimals
		expect(ticks.every((t) => /^0\.\d{4}$/.test(t))).toBe(true);
	});

	it("labels the date ticks with the year once the range exceeds a year", async () => {
		const wrapper = await mountChart({
			days: [
				D0,
				D0 + 200 * DAY,
				D0 + 400 * DAY,
				D0 + 600 * DAY,
				D0 + 800 * DAY,
			],
		});

		const ticks = wrapper.findAll(".line-x-tick").map((t) => t.text());
		expect(ticks[0]).toBe("Sep 26");
		expect(ticks.at(-1)).toBe("Dec 28");
	});

	it("ignores touch moves and mouse moves while a tap pins the tooltip", async () => {
		const wrapper = await mountChart();

		await pointer(wrapper, "pointermove", 1000, "touch");
		expect(wrapper.find(".line-tooltip").exists()).toBe(false);

		await pointer(wrapper, "pointerdown", 1000, "touch");
		expect(wrapper.find(".line-tooltip").text()).toContain("Sep 29, 2026");

		// pinned: the mouse neither moves nor closes it
		await pointer(wrapper, "pointermove", 44);
		expect(wrapper.find(".line-tooltip").text()).toContain("Sep 29, 2026");
		await pointer(wrapper, "pointerleave", 0);
		expect(wrapper.find(".line-tooltip").exists()).toBe(true);
	});

	it("opens the tooltip on tap only for touch pointers", async () => {
		const wrapper = await mountChart();

		await pointer(wrapper, "pointerdown", 1000, "mouse");

		expect(wrapper.find(".line-tooltip").exists()).toBe(false);
	});

	it("taps another day while pinned and keeps the tooltip open", async () => {
		const wrapper = await mountChart();

		await pointer(wrapper, "pointerdown", 1000, "touch");
		await pointer(wrapper, "pointerdown", 0, "touch");

		expect(wrapper.find(".line-tooltip").text()).toContain("Sep 25, 2026");
	});

	it("clamps the arrow keys at both ends and ignores other keys", async () => {
		const wrapper = await mountChart();
		const hit = wrapper.find(".line-hit");

		// from nothing, left lands on the last day
		await hit.trigger("keydown", { key: "ArrowLeft" });
		expect(hit.attributes("aria-valuenow")).toBe("4");
		await hit.trigger("keydown", { key: "ArrowRight" });
		expect(hit.attributes("aria-valuenow")).toBe("4");

		await hit.trigger("keydown", { key: "a" });
		expect(hit.attributes("aria-valuenow")).toBe("4");
		expect(wrapper.find(".line-tooltip").exists()).toBe(true);
	});

	it("closes an unpinned tooltip on blur but keeps a pinned one", async () => {
		const wrapper = await mountChart();
		const hit = wrapper.find(".line-hit");

		await hit.trigger("keydown", { key: "ArrowRight" });
		await hit.trigger("blur");
		expect(wrapper.find(".line-tooltip").exists()).toBe(false);

		await pointer(wrapper, "pointerdown", 1000, "touch");
		await hit.trigger("blur");
		expect(wrapper.find(".line-tooltip").exists()).toBe(true);
	});

	it("shows the tooltip without a volume row when there is no volume", async () => {
		const wrapper = await mountChart({ volume: [] });

		await pointer(wrapper, "pointermove", 1000);

		expect(wrapper.find(".line-tooltip").exists()).toBe(true);
		expect(wrapper.find(".line-tooltip .border-t").exists()).toBe(false);
	});

	it("shows 0 volume for days beyond the volume array", async () => {
		const wrapper = await mountChart({ volume: [5, 5] });

		await pointer(wrapper, "pointermove", 1000);

		expect(wrapper.find(".line-tooltip .border-t").text()).toBe("Volume0");
	});

	it("maps the pointer on a zero-width plot to the first day", async () => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			60
		);
		const wrapper = await mountChart();

		await pointer(wrapper, "pointermove", 10);

		expect(wrapper.find(".line-hit").attributes("aria-valuenow")).toBe("0");
	});
});
