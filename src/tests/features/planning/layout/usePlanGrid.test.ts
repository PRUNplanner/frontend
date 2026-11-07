import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

// Util
import {
	usePlanGrid,
	visibleLayout,
} from "@/features/planning/layout/usePlanGrid";
import { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
import { presetLayout } from "@/features/planning/layout/presets";
import { trackEvent } from "@/lib/analytics/useAnalytics";

vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
}));

/** A box for an item, as PlanGrid renders it */
function box(id: string): HTMLElement {
	const el = document.createElement("section");
	el.dataset.item = id;
	el.tabIndex = -1;
	document.body.append(el);
	return el;
}

describe("visibleLayout", () => {
	it("keeps POPR for logged in users only", () => {
		const layout = presetLayout("standard");
		expect(visibleLayout(layout, true)).toBe(layout);
		const anon = visibleLayout(layout, false);
		expect(anon.items.flatMap((i) => i.els)).not.toContain("popr");
		expect(layout.items.flatMap((i) => i.els)).toContain("popr");
	});

	it("drops an item of POPR alone and moves its shown tab", () => {
		const layout = presetLayout("standard");
		const prod = layout.items.find((i) => i.els.includes("popr"))!;
		prod.active = "popr";
		layout.items.push({ ...prod, id: "x", els: ["popr"], active: "popr" });
		const anon = visibleLayout(layout, false);
		expect(anon.items.some((i) => i.id === "x")).toBe(false);
		expect(anon.items.find((i) => i.id === prod.id)!.active).toBe(
			"production"
		);
	});

	it("gives one shown with POPR a tab of its own, never joins it elsewhere", () => {
		const layout = presetLayout("standard");
		const prod = layout.items.find((i) => i.els.includes("popr"))!;
		// Experts beside POPR, in Production's group
		prod.els.splice(prod.els.indexOf("popr") + 1, 0, "experts");
		prod.join = { experts: "beside" };
		layout.items = layout.items.filter((i) => i.els[0] !== "experts");
		const anon = visibleLayout(layout, false).items.find(
			(i) => i.id === prod.id
		)!;
		expect(anon.els).toContain("experts");
		expect(anon.join).toBeUndefined();
		// the stored layout keeps it
		expect(prod.join).toEqual({ experts: "beside" });
	});
});

describe("usePlanGrid", () => {
	const setup = (loggedIn = true) => {
		const pref = usePlanLayoutPreference();
		return { pref, grid: usePlanGrid(pref, () => loggedIn) };
	};

	it("shows a tab and tracks it", () => {
		const { grid } = setup();
		grid.showTab("i-production", "supply-cart");
		expect(grid.tabs["i-production"]).toBe("supply-cart");
		expect(trackEvent).toHaveBeenCalledWith("plan:tool_toggle", {
			panel: "supply-cart",
		});
	});

	it("folds and tracks it", () => {
		const { grid, pref } = setup();
		grid.fold("planet", true);
		expect(pref.folded.value).toEqual(["planet"]);
		expect(trackEvent).toHaveBeenCalledWith("plan:panel_fold", {
			panel: "planet",
			folded: true,
		});
	});

	it("focuses an element in a tab group: its tab, scrolled to, focused", async () => {
		const { grid } = setup();
		const el = box("i-production");
		const scroll = vi.spyOn(el, "scrollIntoView");
		grid.focusElement("plan-check");
		expect(grid.tabs["i-production"]).toBe("plan-check");
		await nextTick();
		expect(scroll).toHaveBeenCalledWith({
			block: "nearest",
			behavior: "smooth",
		});
		expect(document.activeElement).toBe(el);
		el.remove();
	});

	it("focuses one shown with another: the tab they share", async () => {
		const { grid, pref } = setup();
		const g = presetLayout("standard");
		const prod = g.items.find((i) => i.els[0] === "production")!;
		prod.els.splice(prod.els.indexOf("repair-analysis") + 1, 0, "experts");
		prod.join = { experts: "below" };
		g.items = g.items.filter((i) => i.els[0] !== "experts");
		pref.saveCustom(g);
		const el = box("i-production");
		grid.focusElement("experts");
		expect(grid.tabs["i-production"]).toBe("repair-analysis");
		await nextTick();
		el.remove();
	});

	it("unfolds a folded element it focuses, also one kept in view", async () => {
		const { grid, pref } = setup();
		pref.setFolded("planet", true);
		grid.focusElement("planet");
		expect(pref.folded.value).toEqual([]);
		// a results tile (in the band) needs no tab and no unfolding
		grid.focusElement("kpi-area");
		expect(grid.tabs["i-kpi-area"]).toBeUndefined();
		await nextTick();
	});

	it("opens a hidden element in the dialog", () => {
		const { grid, pref } = setup();
		const custom = presetLayout("standard");
		custom.items = custom.items.filter((i) => !i.els.includes("experts"));
		pref.saveCustom(custom);
		grid.focusElement("experts");
		expect(grid.refDialog.value).toBe("experts");
	});

	it("opens POPR in the dialog for a visitor, who has no POPR tab", () => {
		const { grid } = setup(false);
		grid.focusElement("popr");
		expect(grid.refDialog.value).toBe("popr");
	});
});
