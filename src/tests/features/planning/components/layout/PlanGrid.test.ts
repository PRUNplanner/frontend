import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { h } from "vue";

import PlanGrid from "@/features/planning/components/layout/PlanGrid.vue";
import PlanToolTabs from "@/features/planning/components/PlanToolTabs.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	planViewContext,
	provideContext,
} from "@/tests/features/planning/components/elements/planViewContext.fixtures";
import { presetLayout } from "@/features/planning/layout/presets";
import { PRESET_KEYS } from "@/features/planning/layout/presets";

// Types & Interfaces
import type {
	ElementId,
	GridLayout,
} from "@/features/planning/layout/planLayout.types";

// every element has its own test: a line of its id
vi.mock("@/features/planning/layout/elementComponents", () => ({
	elementView: (id: string) => ({
		component: {
			name: `El-${id}`,
			render: () => h("p", { "data-el": id }, id),
		},
		props: {},
	}),
}));

// a ResizeObserver the test drives, and frames that run on the next tick
const observers: { cb: ResizeObserverCallback; els: Element[] }[] = [];
beforeEach(() => {
	observers.length = 0;
	vi.stubGlobal(
		"ResizeObserver",
		class {
			els: Element[] = [];
			constructor(cb: ResizeObserverCallback) {
				observers.push({ cb, els: this.els });
			}
			observe(el: Element) {
				this.els.push(el);
			}
			unobserve() {}
			disconnect() {}
		}
	);
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		queueMicrotask(() => cb(0));
		return 1;
	});
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

async function mountGrid(
	props: { layout?: GridLayout; folded?: ElementId[]; width?: number } = {}
) {
	return mountComponent(
		PlanGrid,
		{ layout: presetLayout("today"), folded: [], width: 1440, ...props },
		{ setup: provideContext(planViewContext()) }
	);
}

const box = (
	wrapper: Awaited<ReturnType<typeof mountGrid>>["wrapper"],
	id: string
) => wrapper.find(`[data-item="${id}"]`);

describe("PlanGrid", () => {
	it.each(PRESET_KEYS)("renders %s: the band and the page", async (key) => {
		const layout = presetLayout(key);
		const { wrapper } = await mountGrid({ layout });
		const band = wrapper.find("[data-region='band']");
		const page = wrapper.find("[data-region='page']");
		expect(band.findAll("[data-item]")).toHaveLength(
			layout.items.filter((i) => i.pin).length
		);
		expect(page.findAll("[data-item]")).toHaveLength(
			layout.items.filter((i) => !i.pin).length
		);
		// moved with transform, never top/left
		for (const el of wrapper.findAll("[data-item]")) {
			expect(el.attributes("style")).toContain("transform: translate(");
			expect(el.attributes("style")).not.toMatch(/(^|;)\s*(top|left):/);
		}
	});

	it("keeps the band in view while it takes at most 40 % of the window", async () => {
		vi.stubGlobal("innerHeight", 1000);
		// unmeasured items are 180 px: one row of results tiles
		const { wrapper } = await mountGrid();
		expect(
			wrapper.find("[data-region='band']").attributes("data-sticky")
		).toBe("true");
		expect(wrapper.find("[data-region='band']").classes()).toContain(
			"sticky"
		);

		// a short window: the band scrolls with the page
		vi.stubGlobal("innerHeight", 400);
		window.dispatchEvent(new Event("resize"));
		await flushPromises();
		expect(
			wrapper.find("[data-region='band']").attributes("data-sticky")
		).toBeUndefined();
	});

	it("has no band without items kept in view", async () => {
		const layout = presetLayout("today");
		layout.items = layout.items.filter((i) => !i.pin);
		const { wrapper } = await mountGrid({ layout });
		expect(wrapper.find("[data-region='band']").exists()).toBe(false);
	});

	it("packs from measured content heights, once per frame", async () => {
		const height = vi
			.spyOn(HTMLElement.prototype, "offsetHeight", "get")
			.mockReturnValue(300);
		const { wrapper } = await mountGrid();
		// the grid's observer watches the most (tab strips have their own)
		const { cb, els } = [...observers].sort(
			(a, b) => b.els.length - a.els.length
		)[0];
		cb(
			els.map((target) => ({ target }) as ResizeObserverEntry),
			{} as ResizeObserver
		);
		await flushPromises();
		// title row 300 + content 300 + 2 px of border
		expect(box(wrapper, "i-empire").attributes("style")).toContain(
			"height: 602px"
		);
		// a results tile has no title row
		expect(box(wrapper, "i-kpi-profit").attributes("style")).toContain(
			"height: 302px"
		);

		// folded or hidden (0 px): the last height stays
		height.mockReturnValue(0);
		cb(
			els.map((target) => ({ target }) as ResizeObserverEntry),
			{} as ResizeObserver
		);
		await flushPromises();
		expect(box(wrapper, "i-empire").attributes("style")).toContain(
			"height: 602px"
		);
		height.mockRestore();
	});

	it("measures the page's width without a preview width", async () => {
		const width = vi
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(700);
		const { wrapper } = await mountComponent(
			PlanGrid,
			{ layout: presetLayout("stacked"), folded: [] },
			{ setup: provideContext(planViewContext()) }
		);
		await flushPromises();
		// below 760 px: a phone, everything stacked
		expect(box(wrapper, "i-production").attributes("style")).toContain(
			"width: 700px"
		);
		width.mockRestore();
	});

	it("folds an item to its title row and emits it", async () => {
		const { wrapper, component } = await mountGrid({ folded: ["planet"] });
		const planet = box(wrapper, "i-planet");
		expect(planet.attributes("data-folded")).toBe("true");
		expect(planet.attributes("style")).toContain("height: 46px");
		expect(planet.find("[data-body]").attributes("style")).toContain(
			"display: none"
		);

		await planet.find("[data-fold]").trigger("click");
		await box(wrapper, "i-experts").find("[data-fold]").trigger("click");
		expect(component.emitted("fold")).toEqual([
			["planet", false],
			["experts", true],
		]);
		// results tiles don't fold
		expect(box(wrapper, "i-kpi-area").find("[data-fold]").exists()).toBe(
			false
		);
	});

	it("shows a tab group's tabs, mounts a tab when first shown and keeps it", async () => {
		const { wrapper, component, setProps } = await mountGrid();
		const prod = box(wrapper, "i-production");
		expect(prod.find("[data-el='production']").exists()).toBe(true);
		expect(prod.find("[data-el='supply-cart']").exists()).toBe(false);

		prod.findComponent(PlanToolTabs).vm.$emit("toggle", "supply-cart");
		expect(component.emitted("tab")).toEqual([
			["i-production", "supply-cart"],
		]);

		await setProps({ tabs: { "i-production": "supply-cart" } });
		expect(prod.find("[data-el='supply-cart']").exists()).toBe(true);
		await setProps({ tabs: {} });
		// kept mounted, hidden
		expect(
			(prod.find("[data-element='supply-cart']").element as HTMLElement)
				.style.display
		).toBe("none");
	});

	it("shows the stored tab when the one picked left the item", async () => {
		// Supply picked on Today's, then Wide, where Production has no Supply
		const { wrapper, setProps } = await mountGrid({
			layout: presetLayout("wide"),
		});
		await setProps({ tabs: { "i-production": "supply-cart" } });
		const prod = box(wrapper, "i-production");
		expect(prod.find("[data-el='production']").exists()).toBe(true);
		expect(prod.find("[data-el='supply-cart']").exists()).toBe(false);
	});

	it("makes the body inert while customising", async () => {
		const { wrapper } = await mountComponent(
			PlanGrid,
			{
				layout: presetLayout("today"),
				folded: [],
				width: 1440,
				editing: true,
			},
			{ setup: provideContext(planViewContext()) }
		);
		expect(
			wrapper
				.findAll("[data-body]")
				.every((b) => b.attributes("inert") !== undefined)
		).toBe(true);
	});

	it("scrolls only a box lower than its content, clips nothing else", async () => {
		// every title row and content 500 px: 1,002 px of content per item
		const height = vi
			.spyOn(HTMLElement.prototype, "offsetHeight", "get")
			.mockReturnValue(500);
		const { wrapper } = await mountGrid({ layout: presetLayout("wide") });
		await flushPromises();
		// Plan check is at most 360 px: it scrolls inside
		expect(
			box(wrapper, "i-plan-check").find("[data-body]").classes()
		).toContain("overflow-y-auto");
		// the rest fit: no clipping, so hit areas near the edge stay whole
		expect(
			box(wrapper, "i-empire").find("[data-body]").classes()
		).toContain("overflow-visible");
		height.mockRestore();
	});
});
