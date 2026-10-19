import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import ResourceROIChartDrawer from "@/features/resource_roi_overview/components/ResourceROIChartDrawer.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PLayerClose from "@/ui/components/PLayerClose.vue";
import { mountComponent } from "@/tests/mountComponent";
import resourceROI from "@/locales/en_US/resource_roi.json";

// Types & Interfaces
import type { IResourceROIResult } from "@/features/resource_roi_overview/useResourceROIOverview.types";

// jsdom has no CSS tokens: a fixed colour per exchange
const COLOURS: Record<string, string> = {
	AI1: "rgb(61, 140, 230)",
	CI1: "rgb(217, 106, 34)",
	IC1: "rgb(31, 166, 122)",
	NC1: "rgb(200, 95, 208)",
};
vi.mock("@/ui/charts/chartTheme", async () => {
	const { computed } = await import("vue");
	return {
		useChartTheme: () =>
			computed(() => ({
				ink: "white",
				muted: "grey",
				grid: "grey",
				axis: "grey",
				positive: "lime",
				exchange: (code: string) => COLOURS[code],
			})),
	};
});

function row(
	planetName: string,
	planROI: number,
	dailyProfit: number,
	[ai1, ci1, ic1, nc1]: [number, number, number, number]
): IResourceROIResult {
	return {
		planetNaturalId: planetName,
		planetName,
		buildingTicker: "EXT",
		dailyYield: 0,
		percentMaxDailyYield: 0,
		cogm: undefined,
		outputProfit: 0,
		dailyProfit,
		planCost: 0,
		planROI,
		planArea: 0,
		planProfitArea: 0,
		planetSurface: [],
		planetGravity: [],
		planetPressure: [],
		planetTemperature: [],
		planetCOGC: null,
		planetInfrastructures: [],
		distanceAI1: ai1,
		distanceCI1: ci1,
		distanceIC1: ic1,
		distanceNC1: nc1,
	};
}

const ROWS = [
	row("Nascent (QJ-149c)", 11.88, 106750, [2, 9, 10, 12]),
	row("Deimos (ZV-759c)", 12.46, 101761, [1, 8, 9, 11]),
	row("BI-500b", 12.82, 128111, [19, 26, 19, 25]),
	row("Loss", -5, -100, [3, 3, 3, 3]),
	row("Nowhere", 12, 1, [-1, -1, -1, -1]),
	row("Slow", 40, 1, [1, 1, 1, 1]),
];

async function mountDrawer(
	listeners: Record<string, unknown> = {},
	rows: IResourceROIResult[] = ROWS
) {
	const { wrapper } = await mountComponent(
		ResourceROIChartDrawer,
		{ rows, show: true, ...listeners },
		{ messages: { resource_roi: resourceROI }, attach: true }
	);
	await flushPromises();
	return wrapper;
}

const svgText = (wrapper: VueWrapper) =>
	wrapper.findAll("svg text").map((t) => t.text());
const fills = (wrapper: VueWrapper) =>
	wrapper
		.findAll(".scatter-dot")
		.map((d) => d.findAll("circle")[1].attributes("fill"));

describe("ResourceROIChartDrawer", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			800
		);
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
			300
		);
	});
	afterEach(() => vi.restoreAllMocks());

	it("plots payback against jumps to the nearest exchange", async () => {
		const wrapper = await mountDrawer();

		expect(wrapper.findAll(".scatter-dot")).toHaveLength(3);
		expect(svgText(wrapper)).toEqual(
			expect.arrayContaining([
				"plan ROI (d)",
				"jumps to nearest CX",
				"Nascent",
				"Deimos",
			])
		);
		expect(wrapper.text()).toContain(
			"dot size = daily profit · colour = nearest exchange"
		);
		// all three are nearest to AI1 (BI-500b ties with IC1)
		expect(fills(wrapper)).toEqual(Array(3).fill(COLOURS.AI1));
		expect(wrapper.find("ul").text()).toBe("AI1");
		expect(wrapper.text()).toContain(
			"Nascent and Deimos pay back fastest and sit 1–2 jumps from AI1. BI-500b earns the most per day but is 19 jumps out."
		);
		expect(wrapper.text()).toContain(
			"1 planet pays back in more than 23.76 d (twice the fastest) and is not shown. 1 planet never pays back and is not shown. 1 planet has no route to an exchange and is not shown."
		);
	});

	it("measures to a chosen exchange", async () => {
		const wrapper = await mountDrawer();

		wrapper.findComponent(PSelect).vm.$emit("update:value", "NC1");
		await flushPromises();

		expect(svgText(wrapper)).toContain("jumps to NC1");
		expect(wrapper.text()).toContain(
			"dot size = daily profit · jumps to NC1"
		);
		expect(fills(wrapper)).toEqual(Array(3).fill(COLOURS.NC1));
		expect(wrapper.find("ul").text()).toBe("NC1");
		expect(wrapper.text()).toContain("sit 11–12 jumps from NC1");
		// the planet without any route is counted for this exchange
		expect(wrapper.text()).toContain(
			"1 planet has no route to NC1 and is not shown."
		);
	});

	it("shares the hovered dot", async () => {
		const onActive = vi.fn();
		const wrapper = await mountDrawer({ "onUpdate:active": onActive });

		await wrapper.find('[aria-label="Deimos"]').trigger("mouseenter");
		expect(onActive).toHaveBeenLastCalledWith("Deimos (ZV-759c)#EXT");
	});

	it("closes on Esc and on the close button", async () => {
		const onShow = vi.fn();
		const wrapper = await mountDrawer({ "onUpdate:show": onShow });

		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
		);
		expect(onShow).toHaveBeenLastCalledWith(false);

		onShow.mockClear();
		// its root is a comment and the button
		await wrapper
			.findComponent(PLayerClose)
			.find("button")
			.trigger("click");
		expect(onShow).toHaveBeenLastCalledWith(false);
	});

	it("resizes from the grip with the arrow keys, within bounds", async () => {
		const wrapper = await mountDrawer();
		const grip = wrapper.find('[role="separator"]');
		const height = () => Number(grip.attributes("aria-valuenow"));
		const start = height();

		await grip.trigger("keydown", { key: "ArrowUp" });
		expect(height()).toBe(start + 24);
		for (let i = 0; i < 40; i++)
			await grip.trigger("keydown", { key: "ArrowDown" });
		expect(height()).toBe(
			Math.round(Math.max(window.innerHeight * 0.25, 240))
		);
	});

	it("sizes the dots by daily profit, from 5 px to 11 px", async () => {
		const wrapper = await mountDrawer();

		// Nascent, Deimos and BI-500b (dailyProfit 106750, 101761, 128111)
		const radii = wrapper
			.findAll(".scatter-dot")
			.map((d) => Number(d.findAll("circle")[1].attributes("r")))
			.sort((a, b) => a - b);
		const size = (profit: number) => (profit - 101761) / (128111 - 101761);
		expect(radii[0]).toBe(5);
		expect(radii[1]).toBeCloseTo(5 + 6 * size(106750), 5);
		expect(radii[2]).toBe(11);
	});

	it("draws a mid-sized dot when every profit is the same", async () => {
		const wrapper = await mountDrawer({}, [
			row("Alpha", 10, 500, [2, 9, 9, 9]),
			row("Beta", 11, 500, [3, 9, 9, 9]),
		]);

		const radii = wrapper
			.findAll(".scatter-dot")
			.map((d) => d.findAll("circle")[1].attributes("r"));
		expect(radii).toEqual(["8", "8"]);
	});

	it("says so when no planet pays back, without insight or left-outs", async () => {
		const wrapper = await mountDrawer({}, [
			row("Loss", -5, -100, [3, 3, 3, 3]),
		]);

		expect(wrapper.find(".scatter-dot").exists()).toBe(false);
		expect(wrapper.text()).toContain(
			"No planet pays back with these filters."
		);
		expect(wrapper.text()).not.toContain("pays back fastest");
		// the one that never pays back is still counted
		expect(wrapper.text()).toContain("1 planet never pays back");
		expect(wrapper.find("ul").text()).toBe("");
	});

	it("names a single fastest planet and its exact jump count", async () => {
		const wrapper = await mountDrawer({}, [
			row("Alpha (AB-123a)", 10, 500, [1, 9, 9, 9]),
			row("Beta", 15, 100, [4, 9, 9, 9]),
		]);

		expect(wrapper.text()).toContain(
			"Alpha pays back fastest and sits 1 jump from AI1."
		);
		// nothing is left out, so no sentence about hidden planets
		expect(wrapper.text()).not.toContain("is not shown");
		expect(wrapper.text()).not.toContain("are not shown");
	});

	it("falls back to 'an exchange' when the leaders sit at different ones", async () => {
		const wrapper = await mountDrawer({}, [
			row("Alpha", 10, 900, [3, 20, 20, 20]),
			row("Beta", 12, 100, [20, 20, 20, 1]),
		]);

		expect(wrapper.text()).toContain(
			"Alpha and Beta pay back fastest and sit 1–3 jumps from an exchange."
		);
		// the most profitable planet is a leader itself: no extra sentence
		expect(wrapper.text()).not.toContain("earns the most per day");
		expect(wrapper.find("ul").text()).toBe("AI1 NC1");
	});

	it("resizes by dragging the grip and stops when released", async () => {
		const wrapper = await mountDrawer();
		const grip = wrapper.find('[role="separator"]');
		const height = () => Number(grip.attributes("aria-valuenow"));
		const start = height();
		// jsdom has no PointerEvent: a mouse event under the pointer's name
		const pointer = async (type: string, clientY = 0) => {
			grip.element.dispatchEvent(
				new MouseEvent(type, { clientY, bubbles: true })
			);
			await wrapper.vm.$nextTick();
		};

		await pointer("pointerdown", 500);
		await pointer("pointermove", 470);
		expect(height()).toBe(start + 30);

		await pointer("pointerup");
		await pointer("pointermove", 300);
		expect(height()).toBe(start + 30);

		// a cancelled drag also ends
		await pointer("pointerdown", 500);
		await pointer("pointercancel");
		await pointer("pointermove", 300);
		expect(height()).toBe(start + 30);
	});

	it("shrinks with the arrow down key", async () => {
		const wrapper = await mountDrawer();
		const grip = wrapper.find('[role="separator"]');
		const start = Number(grip.attributes("aria-valuenow"));

		await grip.trigger("keydown", { key: "ArrowUp" });
		await grip.trigger("keydown", { key: "ArrowDown" });

		expect(Number(grip.attributes("aria-valuenow"))).toBe(start);
	});
});
