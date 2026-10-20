import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import MarketTreemap from "@/features/market_report/components/MarketTreemap.vue";
import { mountComponent } from "@/tests/mountComponent";

import fixture from "@/tests/test_data/api_data_market_summary.json";
import type { MarketSummary } from "@/features/api/schemas/marketSummary.schemas";

const summary = fixture as MarketSummary;

// jsdom has no layout: give the box a size
beforeEach(() => {
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(960);
	vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(480);
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
		left: 0,
		top: 0,
	} as DOMRect);
});
afterEach(() => vi.restoreAllMocks());

// jsdom has no PointerEvent: a mouse event with the pointer fields set
function pointer(
	el: Element,
	type: string,
	init: { clientX?: number; clientY?: number; pointerType?: string } = {}
) {
	const event = new MouseEvent(type, { bubbles: true, ...init });
	Object.defineProperty(event, "pointerType", {
		value: init.pointerType ?? "mouse",
	});
	el.dispatchEvent(event);
	return flushPromises();
}

const mountTreemap = (s: MarketSummary = summary) =>
	mountComponent(MarketTreemap, { summary: s });

describe("MarketTreemap", () => {
	it("lays out every traded material, flat ones hatched", async () => {
		const { wrapper } = await mountTreemap();
		const tiles = wrapper.findAll("[role=listitem]");
		expect(tiles).toHaveLength(
			summary.materials.filter((m) => m.turnover_30d > 0).length
		);
		expect(
			wrapper
				.findAll("[data-flat]")
				.map((t) => t.attributes("data-ticker"))
				.sort()
		).toEqual(["AIR", "CBL", "CBS", "CCD", "IDC", "RED"]);
		// sector labels where they fit
		expect(wrapper.text()).toContain("market_report.sector.");
	});

	it("only tiles of 24 px and more take focus", async () => {
		const { wrapper } = await mountTreemap();
		wrapper.findAll("[role=listitem]").forEach((t) => {
			const style = t.attributes("style")!;
			const w = parseFloat(/width: ([\d.]+)px/.exec(style)![1]);
			const h = parseFloat(/height: ([\d.]+)px/.exec(style)![1]);
			expect(t.attributes("tabindex")).toBe(
				w >= 24 && h >= 24 ? "0" : undefined
			);
		});
	});

	it("shows a tooltip on hover and focus, and hides it again", async () => {
		const { wrapper } = await mountTreemap();
		const tile = (ticker: string) =>
			wrapper.find(`[data-ticker="${ticker}"]`);

		await pointer(tile("RAT").element, "pointermove", {
			clientX: 900,
			clientY: 450,
		});
		const tip = () => wrapper.find("[role=tooltip]");
		expect(tip().text()).toContain("Rations · RAT");
		// kept inside the box at the bottom right
		expect(tip().attributes("style")).toMatch(/left: \d/);

		await pointer(tile("RAT").element, "pointerleave");
		expect(tip().exists()).toBe(false);

		await tile("AIR").trigger("focus");
		expect(tip().text()).toContain("market_report.treemap.flat_note");
		await tile("AIR").trigger("blur");
		expect(tip().exists()).toBe(false);

		// a tap keeps it open
		await pointer(tile("DW").element, "pointerdown", {
			clientX: 10,
			clientY: 10,
			pointerType: "touch",
		});
		await pointer(tile("DW").element, "pointerleave", {
			pointerType: "touch",
		});
		expect(tip().text()).toContain("Drinking Water");
	});

	it("a material without prices or change says so", async () => {
		const quiet = {
			...summary,
			materials: [
				{
					...summary.materials[0],
					ticker: "QQQ",
					name: "Quiet",
					vwap_7d: null,
					vwap_30d: null,
					change_pct: null,
					is_flat: false,
				},
			],
		};
		const { wrapper } = await mountTreemap(quiet);
		await wrapper.find('[data-ticker="QQQ"]').trigger("focus");
		const tip = wrapper.find("[role=tooltip]").text();
		expect(tip).toContain("market_report.treemap.few_trades");
		expect(tip).toContain("–");
	});

	it("draws nothing without a size", async () => {
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			0
		);
		const { wrapper } = await mountTreemap();
		await flushPromises();
		expect(wrapper.findAll("[role=listitem]")).toHaveLength(0);
	});
});
