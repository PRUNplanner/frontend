import { describe, it, expect } from "vitest";

import ChainBasesActions from "@/features/production_chain/components/ChainBasesActions.vue";
import { mountComponent } from "@/tests/mountComponent";

const props = { planCount: 3, ready: false, noPlanet: 0, overArea: 0 };

describe("ChainBasesActions", () => {
	it("makes auto layout the primary step until the bases are ready", async () => {
		const { wrapper } = await mountComponent(ChainBasesActions, {
			...props,
			noPlanet: 2,
			overArea: 1,
		});
		const type = (id: string) =>
			wrapper
				.findAllComponents({ name: "PButton" })
				.find((b) => b.attributes("data-testid") === id)!
				.props("type");
		expect(type("chain-auto-layout")).toBe("primary");
		expect(type("chain-bases-create")).toBe("secondary");
		const blocked = wrapper.find("[data-testid='chain-bases-blocked']");
		expect(blocked.text()).toContain("actions.no_planet");
		expect(blocked.text()).toContain("overview.over");
		expect(wrapper.find("[data-testid='chain-bases-ready']").exists()).toBe(
			false
		);
	});

	it("makes create the primary step once the bases are ready", async () => {
		const { wrapper } = await mountComponent(ChainBasesActions, {
			...props,
			ready: true,
		});
		const type = (id: string) =>
			wrapper
				.findAllComponents({ name: "PButton" })
				.find((b) => b.attributes("data-testid") === id)!
				.props("type");
		expect(type("chain-auto-layout")).toBe("secondary");
		expect(type("chain-bases-create")).toBe("primary");
		expect(wrapper.find("[data-testid='chain-bases-ready']").exists()).toBe(
			true
		);
		expect(
			wrapper.find("[data-testid='chain-bases-blocked']").exists()
		).toBe(false);
	});

	it("emits auto layout, fit, create and the max base size", async () => {
		const { wrapper, component } = await mountComponent(ChainBasesActions, {
			...props,
			planCount: 0,
		});
		await wrapper
			.find("[data-testid='chain-auto-layout']")
			.trigger("click");
		await wrapper.find("[data-testid='chain-fit']").trigger("click");
		expect(
			wrapper
				.find("[data-testid='chain-bases-create']")
				.attributes("disabled")
		).toBeDefined();
		wrapper
			.findAllComponents({ name: "PSelect" })
			.find((s) => s.attributes("data-testid") === "chain-max-area")!
			.vm.$emit("update:value", null);
		expect(component.emitted("autoLayout")).toHaveLength(1);
		expect(component.emitted("fit")).toEqual([[2]]);
		expect(component.emitted("update:maxArea")).toBeUndefined();
	});
});
