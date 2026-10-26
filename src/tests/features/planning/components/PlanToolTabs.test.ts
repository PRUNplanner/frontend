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
		expect(component.emitted("toggle")).toEqual([["popr"], ["supply-cart"]]);
	});
});
