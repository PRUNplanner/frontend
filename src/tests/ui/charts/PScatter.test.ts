import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { h } from "vue";

import PScatter from "@/ui/charts/PScatter.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { IScatterPoint } from "@/ui/charts/scatter.types";

const POINTS: IScatterPoint[] = [
	{ key: "N", label: "Nemesis", x: 4, y: 30.19, emphasis: true },
	{ key: "P", label: "Pyrgos", x: 7, y: 45.23, emphasis: true, ring: true },
	{ key: "S", label: "Saladin", x: 20, y: 44.86, size: 1 },
	{ key: "H", label: "Harmonia", x: 8, y: 25.71, size: 0 },
];

async function mountScatter(
	props: Record<string, unknown> = {},
	listeners: Record<string, unknown> = {}
) {
	const { wrapper } = await mountComponent(
		{
			render: () =>
				h(
					PScatter,
					{
						points: POINTS,
						frontier: ["N", "P"],
						xTitle: "jumps to CI1",
						yTitle: "H2O per day",
						label: "chart",
						...props,
						...listeners,
					},
					{
						tooltip: ({ point }: { point: IScatterPoint }) =>
							h("i", point.label),
					}
				),
		},
		{},
		{ attach: true }
	);
	return wrapper;
}

// a mouse click: detail counts the clicks of a double-click
const click = (el: Element, detail: number) =>
	el.dispatchEvent(new MouseEvent("click", { detail, bubbles: true }));

const tooltip = () => document.body.querySelector("[role=tooltip]");
const labels = (wrapper: Awaited<ReturnType<typeof mountScatter>>) =>
	wrapper.findAll("text").map((t) => t.text());

describe("PScatter", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(400);
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("draws a dot per point, the frontier, titles and labels", async () => {
		const wrapper = await mountScatter();

		expect(wrapper.find("svg").attributes("aria-label")).toBe("chart");
		expect(wrapper.findAll(".scatter-dot")).toHaveLength(4);
		expect(wrapper.findAll(".scatter-ring")).toHaveLength(1);
		const paths = wrapper.findAll(".scatter-frontier path");
		expect(paths).toHaveLength(2);
		// starts on the floor below the first frontier dot, ends at the right edge
		expect(paths[1].attributes("d")).toMatch(/^M[\d.]+,356 L/);
		expect(paths[1].attributes("d")).toMatch(/L584,[\d.]+$/);
		expect(labels(wrapper)).toEqual(
			expect.arrayContaining([
				"H2O per day",
				"jumps to CI1",
				"Nemesis",
				"Pyrgos",
				"Saladin",
				"Harmonia",
			])
		);
	});

	it("starts the frontier at the top when lower Y is better", async () => {
		const wrapper = await mountScatter({ yBetter: "low", frontier: ["N", "H"] });
		const paths = wrapper.findAll(".scatter-frontier path");
		// plot top is 24 px; the shade closes along the top edge
		expect(paths[1].attributes("d")).toMatch(/^M[\d.]+,24 L/);
		expect(paths[0].attributes("d")).toMatch(/L584,24 Z$/);
	});

	it("fits the x axis to the data without xZero", async () => {
		const points = [
			{ key: "A", label: "A", x: 11.88, y: 2 },
			{ key: "B", label: "B", x: 14.25, y: 1 },
		];
		// x tick labels are the first centred texts
		const xFirst = async (props: Record<string, unknown>) =>
			(await mountScatter({ points, frontier: [], ...props }))
				.findAll("text[text-anchor=middle]")[0]
				.text();
		expect(await xFirst({})).toBe("0");
		expect(await xFirst({ xZero: false })).toBe("11.5");
	});

	it("sizes dots by size, and labels only emphasised ones above maxLabels", async () => {
		const wrapper = await mountScatter({ maxLabels: 2, frontier: [] });
		const r = (label: string) =>
			wrapper
				.find(`[aria-label="${label}"]`)
				.findAll("circle")[1]
				.attributes("r");
		expect(r("Saladin")).toBe("11");
		expect(r("Harmonia")).toBe("5");
		expect(r("Nemesis")).toBe("6");
		expect(wrapper.find(".scatter-frontier").exists()).toBe(false);

		const shown = labels(wrapper);
		expect(shown).toContain("Pyrgos");
		expect(shown).not.toContain("Saladin");
	});

	it("shows the tooltip on hover and sets the active point", async () => {
		const onActive = vi.fn();
		const wrapper = await mountScatter({}, { "onUpdate:active": onActive });
		const dot = wrapper.find('[aria-label="Saladin"]');

		await dot.trigger("mouseenter");
		expect(tooltip()?.textContent).toBe("Saladin");
		expect(onActive).toHaveBeenLastCalledWith("S");

		await dot.trigger("mouseleave");
		expect(tooltip()).toBeNull();
		expect(onActive).toHaveBeenLastCalledWith(null);
	});

	it("opens the tooltip on a tap and closes it on a tap elsewhere", async () => {
		const wrapper = await mountScatter();
		const dot = wrapper.find('[aria-label="Saladin"]');

		// a tap fires mouseenter before the click
		await dot.trigger("mouseenter");
		dot.element.dispatchEvent(
			Object.assign(new MouseEvent("click", { detail: 1, bubbles: true }), {
				pointerType: "touch",
			})
		);
		await wrapper.vm.$nextTick();
		expect(tooltip()?.textContent).toBe("Saladin");

		document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		await wrapper.vm.$nextTick();
		expect(tooltip()).toBeNull();
	});

	it("keeps the dot order when a dot becomes active, so focus stays", async () => {
		const wrapper = await mountScatter();
		const order = () =>
			wrapper.findAll(".scatter-dot").map((d) => d.attributes("aria-label"));
		const before = order();

		await wrapper.find('[aria-label="Saladin"]').trigger("focus");
		expect(order()).toEqual(before);
		expect(wrapper.find(".scatter-active").exists()).toBe(true);
	});

	it("keeps the dot order when a dot gets pinned", async () => {
		const { wrapper, setProps } = await mountComponent(
			PScatter,
			{ points: POINTS, xTitle: "x", yTitle: "y", label: "chart" },
			{ attach: true }
		);
		const order = () =>
			wrapper.findAll(".scatter-dot").map((d) => d.attributes("aria-label"));
		const before = order();

		await setProps({
			points: POINTS.map((p) => (p.key === "S" ? { ...p, ring: true } : p)),
		});
		expect(order()).toEqual(before);
		expect(wrapper.findAll(".scatter-ring")).toHaveLength(2);
	});

	it("emits select on a click and open (only) on a double-click", async () => {
		vi.useFakeTimers();
		const onSelect = vi.fn();
		const onOpen = vi.fn();
		const wrapper = await mountScatter(
			{},
			{ onSelect: onSelect, onOpen: onOpen }
		);
		const dot = wrapper.find('[aria-label="Pyrgos"]');

		click(dot.element, 1);
		vi.advanceTimersByTime(300);
		expect(onSelect).toHaveBeenCalledWith("P");

		onSelect.mockClear();
		click(dot.element, 1);
		click(dot.element, 2);
		await dot.trigger("dblclick");
		vi.advanceTimersByTime(300);
		expect(onSelect).not.toHaveBeenCalled();
		expect(onOpen).toHaveBeenCalledWith("P");

		await dot.trigger("keydown", { key: "Enter" });
		expect(onSelect).toHaveBeenCalledWith("P");
	});
});
