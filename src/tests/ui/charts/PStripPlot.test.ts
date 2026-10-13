import { describe, it, expect, vi } from "vitest";
import { h, nextTick } from "vue";

import PStripPlot from "@/ui/charts/PStripPlot.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IStripItem } from "@/ui/charts/charts.types";

const ITEMS: IStripItem[] = [
	{ key: "C", value: 3 },
	{ key: "DW", value: 8 },
	{ key: "PT", value: 26.7 },
	{ key: "EXO", value: 40 },
	{ key: "REP", value: 58.3 },
	{ key: "FE", value: Infinity },
];

async function mountStrip(items = ITEMS) {
	const { wrapper } = await mountComponent(
		PStripPlot,
		{
			items,
			axis: 30,
			red: 5,
			yellow: 10,
			label: "Plan A",
		},
		{ attach: true }
	);
	return wrapper;
}

const tooltip = () => document.body.querySelector("[role=tooltip]");

describe("PStripPlot", () => {
	it("draws one dot per value on the axis, coloured by zone, and counts the rest", async () => {
		const wrapper = await mountStrip();
		const dots = wrapper.findAll("[role=group] .relative button");

		expect(dots.map((d) => d.attributes("aria-label"))).toEqual([
			"common.ui.strip.dot",
			"common.ui.strip.dot",
			"common.ui.strip.dot",
		]);
		expect(dots.map((d) => d.attributes("style"))).toEqual([
			"left: 10%; top: 50%;",
			expect.stringContaining("left: 26.666"),
			"left: 89%; top: 50%;",
		]);
		expect(dots[0].classes()).toContain("bg-negative");
		expect(dots[1].classes()).toContain("bg-warning");
		expect(dots[2].classes()).toContain("bg-white/70");
		expect(wrapper.text()).toContain("+2");
	});

	it("shows a dot's tooltip on hover and focus, with a ring", async () => {
		const wrapper = await mountStrip();
		const dot = wrapper.findAll("[role=group] .relative button")[0];

		await dot.trigger("mouseenter");
		expect(tooltip()).not.toBeNull();
		expect(dot.classes()).toContain("ring-2");
		expect(dot.attributes("aria-describedby")).toBe(tooltip()!.id);

		await dot.trigger("mouseleave");
		expect(tooltip()).toBeNull();

		await dot.trigger("focus");
		expect(tooltip()).not.toBeNull();
		await dot.trigger("keydown", { key: "Escape" });
		expect(tooltip()).toBeNull();
	});

	it("opens on tap and lists every value beyond the axis for +n", async () => {
		const { wrapper } = await mountComponent(
			{
				render: () =>
					h(
						PStripPlot,
						{
							items: ITEMS,
							axis: 30,
							red: 5,
							yellow: 10,
							label: "A",
						},
						{
							tooltip: ({ items }: { items: IStripItem[] }) =>
								items.map((i) => h("i", i.key)),
						}
					),
			},
			{},
			{ attach: true }
		);

		await wrapper.find("[role=group] > button").trigger("click");
		expect(
			[...tooltip()!.querySelectorAll("i")].map((i) => i.textContent)
		).toEqual(["EXO", "REP"]);
	});

	it("lists every dot under the finger on a tap", async () => {
		const { wrapper } = await mountComponent(
			{
				render: () =>
					h(
						PStripPlot,
						{
							items: ITEMS,
							axis: 30,
							red: 5,
							yellow: 10,
							label: "A",
						},
						{
							tooltip: ({ items }: { items: IStripItem[] }) =>
								items.map((i) => h("i", i.key)),
						}
					),
			},
			{},
			{ attach: true }
		);
		const dots = wrapper.findAll("[role=group] .relative button");
		// C at 10 px, DW at 30 px, PT far away
		[10, 30, 200].forEach((x, i) =>
			vi
				.spyOn(dots[i].element, "getBoundingClientRect")
				.mockReturnValue(new DOMRect(x - 5.5, 0, 11, 11))
		);

		const tap = new MouseEvent("click", { clientX: 14, clientY: 6 });
		Object.defineProperty(tap, "pointerType", { value: "touch" });
		dots[0].element.dispatchEvent(tap);
		await nextTick();
		await nextTick();

		expect(
			[...tooltip()!.querySelectorAll("i")].map((i) => i.textContent)
		).toEqual(["C", "DW"]);
		expect(dots[1].classes()).toContain("ring-2");
		expect(dots[2].classes()).not.toContain("ring-2");
	});

	it("has no +n without values beyond the axis", async () => {
		const wrapper = await mountStrip([{ key: "C", value: 3 }]);

		expect(wrapper.find("[role=group] > button").exists()).toBe(false);
	});
});
