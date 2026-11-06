import { describe, expect, it } from "vitest";

import PlanLayoutElementsPanel from "@/features/planning/components/layout/PlanLayoutElementsPanel.vue";
import { mountComponent } from "@/tests/mountComponent";
import { presetLayout } from "@/features/planning/layout/presets";
import plan from "@/locales/en_US/plan.json";

// Types & Interfaces
import type { ElementId } from "@/features/planning/layout/planLayout.types";

async function mountPanel(loggedIn = true) {
	const layout = presetLayout("today");
	// Supply and Experts hidden
	layout.items = layout.items
		.map((i) => ({ ...i, els: i.els.filter((e) => e !== "supply-cart") }))
		.filter((i) => !i.els.includes("experts"));
	return mountComponent(
		PlanLayoutElementsPanel,
		{ layout, loggedIn, where: (el: ElementId) => `where ${el}` },
		{ messages: { plan } }
	);
}

describe("PlanLayoutElementsPanel", () => {
	it("lists every element in its group with where it is", async () => {
		const { wrapper } = await mountPanel();
		expect(wrapper.findAll("h3").map((h) => h.text())).toEqual([
			"Base",
			"Production & tools",
			"Material I/O",
			"Results",
		]);
		expect(wrapper.findAll("[data-element-row]")).toHaveLength(20);
		expect(wrapper.find("[data-element-row='planet']").text()).toContain(
			"where planet"
		);
	});

	it("leaves POPR out for a visitor", async () => {
		const { wrapper } = await mountPanel(false);
		expect(wrapper.find("[data-element-row='popr']").exists()).toBe(false);
	});

	it("shows a placed element, adds a hidden one, drags either", async () => {
		const { wrapper, component } = await mountPanel();
		const row = (el: string) => wrapper.find(`[data-element-row="${el}"]`);
		expect(row("planet").attributes("data-placed")).toBe("true");

		await row("planet").find("button").trigger("click");
		await row("experts").find("button").trigger("click");
		await row("supply-cart").find("[data-drag]").trigger("pointerdown");
		await row("planet").find("[data-drag]").trigger("pointerdown");

		expect(component.emitted("show")).toEqual([["planet"]]);
		expect(component.emitted("add")).toEqual([["experts"]]);
		expect(component.emitted("drag")!.map((d) => d[1])).toEqual([
			"supply-cart",
			"planet",
		]);
		expect(row("experts").find("button").attributes("aria-label")).toBe(
			"Add Experts"
		);
	});
});
