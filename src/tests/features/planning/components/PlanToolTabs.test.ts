import { describe, it, expect } from "vitest";

import PlanToolTabs from "@/features/planning/components/PlanToolTabs.vue";
import { mountComponent } from "@/tests/mountComponent";

const tabs = [
	{ key: "configuration", label: "Configuration" },
	{ key: "popr", label: "POPR" },
	{ key: "supply-cart", label: "Supply Cart" },
];

describe("PlanToolTabs", () => {
	it("marks only the open tool as pressed", async () => {
		const { wrapper, setProps } = await mountComponent(PlanToolTabs, {
			tabs,
			active: "popr",
			label: "Plan tools",
		});

		expect(wrapper.find("nav").attributes("aria-label")).toBe("Plan tools");
		const pressed = () =>
			wrapper.findAll("button[aria-pressed=true]").map((b) => b.text());
		expect(pressed()).toEqual(["POPR"]);

		await setProps({ active: null });
		expect(pressed()).toEqual([]);
	});

	it("emits the clicked tab, also the open one so it can close", async () => {
		const { wrapper, component } = await mountComponent(PlanToolTabs, {
			tabs,
			active: "popr",
			label: "Plan tools",
		});

		await wrapper.findAll("button")[1].trigger("click");
		await wrapper.findAll("button")[2].trigger("click");
		expect(component.emitted("toggle")).toEqual([
			["popr"],
			["supply-cart"],
		]);
	});

	// a strip 300 px wide showing 300 of 600 px of tabs
	function overflow(nav: HTMLElement, scrollLeft = 0) {
		Object.defineProperty(nav, "clientWidth", {
			value: 300,
			configurable: true,
		});
		Object.defineProperty(nav, "scrollWidth", {
			value: 600,
			configurable: true,
		});
		nav.scrollLeft = scrollLeft;
	}

	it("fades the edge where tabs are cut off", async () => {
		const { wrapper } = await mountComponent(PlanToolTabs, {
			tabs,
			active: "popr",
			label: "Plan tools",
		});
		const nav = wrapper.find("nav");
		expect(nav.attributes("data-fade")).toBeUndefined();

		overflow(nav.element);
		await nav.trigger("scroll");
		expect(nav.attributes("data-fade")).toBe("right");
		expect(nav.attributes("style")).toContain("to left");

		overflow(nav.element, 150);
		await nav.trigger("scroll");
		expect(nav.attributes("data-fade")).toBe("both");
	});

	it("scrolls an overflowing strip with the mouse wheel", async () => {
		const { wrapper } = await mountComponent(PlanToolTabs, {
			tabs,
			active: "popr",
			label: "Plan tools",
		});
		const nav = wrapper.find("nav");

		await nav.trigger("wheel", { deltaY: 100 });
		expect(nav.element.scrollLeft).toBe(0);

		overflow(nav.element);
		await nav.trigger("wheel", { deltaY: 100 });
		expect(nav.element.scrollLeft).toBe(100);
		// a sideways swipe is left to the browser
		await nav.trigger("wheel", { deltaY: 10, deltaX: 40 });
		expect(nav.element.scrollLeft).toBe(100);
	});
});
