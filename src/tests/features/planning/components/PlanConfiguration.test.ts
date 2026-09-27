import { describe, it, expect } from "vitest";
import { VueWrapper } from "@vue/test-utils";

import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";

const empire = (uuid: string, name: string): PlanEmpire => ({
	uuid,
	empire_name: name,
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
});

const ALPHA = empire("e-alpha", "Alpha");
const BETA = empire("e-beta", "Beta");
const CHARLIE = empire("e-charlie", "Charlie");

async function mountConfiguration(props: Record<string, unknown> = {}) {
	return mountComponent(PlanConfiguration, {
		disabled: false,
		planName: "My Plan",
		// unsorted on purpose
		empireOptions: [CHARLIE, ALPHA, BETA],
		activeEmpire: BETA,
		planEmpires: [BETA, CHARLIE],
		...props,
	});
}

const select = (wrapper: VueWrapper) => wrapper.findComponent(PSelect);
const nameInput = (wrapper: VueWrapper) =>
	wrapper.find("input").element as HTMLInputElement;

describe("PlanConfiguration", () => {
	it("marks the plan's empires and sorts the options by label", async () => {
		const { wrapper } = await mountConfiguration();

		// "»" sorts after the letters, so the plan's empires come last
		expect(select(wrapper).props("options")).toEqual([
			{ label: "Alpha", value: "e-alpha" },
			{ label: "» Beta", value: "e-beta" },
			{ label: "» Charlie", value: "e-charlie" },
		]);
	});

	it("sorts unassigned empires alphabetically", async () => {
		const { wrapper } = await mountConfiguration({ planEmpires: [] });

		expect(
			(select(wrapper).props("options") as { label: string }[]).map(
				(o) => o.label
			)
		).toEqual(["Alpha", "Beta", "Charlie"]);
	});

	it("has no options without empires", async () => {
		const { wrapper } = await mountConfiguration({
			empireOptions: undefined,
			activeEmpire: undefined,
		});

		expect(select(wrapper).props("options")).toEqual([]);
		expect(select(wrapper).props("value")).toBeUndefined();
	});

	it("shows the plan name and the active empire", async () => {
		const { wrapper } = await mountConfiguration();

		expect(nameInput(wrapper).value).toBe("My Plan");
		expect(select(wrapper).props("value")).toBe("e-beta");
		expect(select(wrapper).text()).toContain("» Beta");
	});

	it("emits a new plan name, but not an empty one", async () => {
		const { wrapper, component } = await mountConfiguration();

		await wrapper.find("input").setValue("Renamed");
		await wrapper.find("input").setValue("");

		expect(component.emitted("update:plan-name")).toEqual([["Renamed"]]);
	});

	it("emits the selected empire", async () => {
		const { wrapper, component } = await mountConfiguration();

		select(wrapper).vm.$emit("update:value", "e-alpha");

		expect(component.emitted("update:active-empire")).toEqual([
			["e-alpha"],
		]);
	});

	it("follows a new active empire", async () => {
		const { wrapper, setProps } = await mountConfiguration();

		await setProps({ activeEmpire: ALPHA });

		expect(select(wrapper).props("value")).toBe("e-alpha");
	});

	it("disables name and empire", async () => {
		const { wrapper } = await mountConfiguration({ disabled: true });

		expect(nameInput(wrapper).disabled).toBe(true);
		expect(select(wrapper).props("disabled")).toBe(true);
	});

	it("enables name and empire", async () => {
		const { wrapper } = await mountConfiguration();

		expect(nameInput(wrapper).disabled).toBe(false);
		expect(select(wrapper).props("disabled")).toBe(false);
	});
});
