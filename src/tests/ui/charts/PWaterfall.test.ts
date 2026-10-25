import { describe, it, expect } from "vitest";
import { h, nextTick } from "vue";

import PWaterfall from "@/ui/charts/PWaterfall.vue";
import { mountComponent } from "@/tests/mountComponent";
import { switchPalette } from "@/tests/switchPalette";

// Types & Interfaces
import type { IWaterfallColumn } from "@/ui/charts/charts.types";

const COLUMNS: IWaterfallColumn[] = [
	{
		key: "out",
		label: "Output value",
		kind: "total",
		value: 51717,
		tone: "neutral",
		segments: [
			{ key: "FE", label: "FE", value: 47417, chipClass: "chip-fe" },
			{ key: "LST", label: "LST", value: 2700 },
			{ key: "FLX", label: "FLX", value: 1600 },
		],
	},
	{
		key: "deg",
		label: "Degradation",
		kind: "step",
		value: -32404,
		tone: "hatched",
		segments: [],
	},
	{
		key: "profit",
		label: "Daily profit",
		kind: "total",
		value: 19313,
		tone: "positive",
		segments: [],
	},
];

async function mountWaterfall(columns = COLUMNS) {
	const { wrapper } = await mountComponent(
		{
			setup: () => () =>
				h(
					PWaterfall,
					{ columns, label: "Profit" },
					{
						tooltip: ({ column, segment }: any) =>
							h("span", `${column.key}:${segment.key}`),
					}
				),
		},
		{},
		{ attach: true }
	);
	return wrapper;
}

const tooltip = () => document.body.querySelector("[role=tooltip]");

describe("PWaterfall", () => {
	it("draws a bar per segment, a value per column and its labels", async () => {
		const wrapper = await mountWaterfall();
		const bars = wrapper.findAll("button");

		// 3 segments, and one bar each for the columns without
		expect(bars).toHaveLength(5);
		expect(wrapper.text()).toContain("51,717");
		expect(wrapper.text()).toContain("-32,404");
		expect(wrapper.text()).toContain("Daily profit");
		// wide slots: labels on one line at sm, never turned
		expect(wrapper.find(".origin-top-right").exists()).toBe(false);

		// FE is tall enough for its chip inside, LST and FLX sit beside
		expect(bars[0].find(".chip-fe").text()).toBe("FE");
		expect(bars[0].text()).toContain("47.4k");
		// beside a bar: the name over its value, two lines that fit the gap
		const beside = wrapper.findAll("div.flex-col span").map((s) => s.text());
		expect(beside.slice(0, 2)).toEqual(["LST", "2.7k"]);
		// one dashed connector between each pair of columns
		expect(wrapper.findAll(".border-dashed")).toHaveLength(2);
	});

	it("opens the tooltip on hover, focus and tap, and closes it", async () => {
		const wrapper = await mountWaterfall();
		const bars = wrapper.findAll("button");

		await bars[0].trigger("mouseenter");
		await nextTick();
		expect(tooltip()?.textContent).toBe("out:FE");
		expect(bars[0].attributes("aria-describedby")).toBeDefined();
		await bars[0].trigger("mouseenter");
		expect(tooltip()?.textContent).toBe("out:FE");

		await bars[0].trigger("mouseleave");
		expect(tooltip()).toBeNull();

		await bars[3].trigger("click");
		await nextTick();
		expect(tooltip()?.textContent).toBe("deg:deg");

		await bars[3].trigger("keydown", { key: "Escape" });
		expect(tooltip()).toBeNull();

		await bars[4].trigger("focus");
		await nextTick();
		expect(tooltip()?.textContent).toBe("profit:profit");
		await bars[4].trigger("blur");
		expect(tooltip()).toBeNull();
	});

	it("colours by tone and follows the colour-blind palette", async () => {
		await switchPalette("default", {
			"--color-positive": "#00ff00",
			"--color-negative": "#ff0000",
		});
		const wrapper = await mountWaterfall();
		const profit = () => wrapper.findAll("button")[4];
		expect(profit().attributes("style")).toContain("rgb(0, 255, 0)");

		await switchPalette("colorblind", { "--color-positive": "#0000ff" });
		expect(profit().attributes("style")).toContain("rgb(0, 0, 255)");
		await switchPalette("default", {});
	});

	it("scrolls in its box instead of squeezing many columns", async () => {
		const many = Array.from({ length: 20 }, (_, i) => ({
			key: `b${i}`,
			label: `B${i}`,
			kind: "step" as const,
			value: 100,
			tone: "neutral" as const,
			segments: [],
		}));
		many[19].label = "Degradation";
		const wrapper = await mountWaterfall(many);

		// 20 columns × 48 px + the axis, values shortened
		expect(wrapper.find("[role=group]").attributes("style")).toContain(
			"width: 1004px"
		);
		expect(wrapper.text()).toContain("100");
		// "Degradation" doesn't fit 48 px: the labels turn instead of breaking
		const last = wrapper.findAll(".origin-top-right").at(-1)!;
		expect(last.text()).toBe("Degradation");
		expect(last.attributes("style")).toContain("rotate(-35deg)");
	});
});
