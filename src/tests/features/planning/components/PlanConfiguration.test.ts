import { describe, it, expect } from "vitest";
import { RouterLinkStub, type VueWrapper } from "@vue/test-utils";

import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent, piniaWithCX } from "@/tests/mountComponent";

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
		// unsorted on purpose
		empireOptions: [CHARLIE, ALPHA, BETA],
		activeEmpire: BETA,
		planEmpires: [BETA, CHARLIE],
		...props,
	});
}

const select = (wrapper: VueWrapper) => wrapper.findComponent(PSelect);

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

	it("hides the empire select without empires", async () => {
		const { wrapper } = await mountConfiguration({
			empireOptions: undefined,
			activeEmpire: undefined,
		});

		expect(select(wrapper).exists()).toBe(false);
		// no active empire, no note
		expect(wrapper.text()).not.toContain("plan.base.empire.note");
	});

	it("shows the active empire and its note", async () => {
		const { wrapper } = await mountConfiguration();

		expect(select(wrapper).props("value")).toBe("e-beta");
		expect(select(wrapper).text()).toContain("» Beta");
		expect(wrapper.text()).toContain("plan.base.empire.note");
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

	it("read-only: hides the empire, keeps the note", async () => {
		const { wrapper } = await mountConfiguration({ disabled: true });

		expect(select(wrapper).exists()).toBe(false);
		expect(wrapper.text()).toContain("plan.base.empire.note");
	});

	it("links the active empire's preference in Exchanges", async () => {
		const { wrapper } = await mountComponent(
			PlanConfiguration,
			{
				disabled: false,
				activeEmpire: BETA,
				planEmpires: [BETA],
				cxUuid: "cx-1",
				planetId: "ZV-307c",
			},
			{ pinia: piniaWithCX("cx-1", "Home NC1") }
		);

		const link = wrapper.findComponent(RouterLinkStub);
		expect(link.text()).toBe("Home NC1");
		expect(link.props("to")).toBe("/exchanges/cx-1?scope=ZV-307c");
	});

	it("says prices are Universe without a preference", async () => {
		const { wrapper } = await mountConfiguration({ planetId: "ZV-307c" });

		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
		expect(wrapper.text()).toContain(
			"plan.components.configuration.no_preference"
		);
	});

	it("names the price source of a visitor without empires", async () => {
		const { wrapper } = await mountConfiguration({
			empireOptions: undefined,
			activeEmpire: undefined,
			priceSource: "Universe average",
		});

		expect(wrapper.text()).toContain("Universe average");
		expect(wrapper.text()).not.toContain(
			"plan.components.configuration.no_preference"
		);
	});

	it("read-only: names the exchange without linking it", async () => {
		const { wrapper } = await mountComponent(
			PlanConfiguration,
			{
				disabled: true,
				activeEmpire: BETA,
				planEmpires: [BETA],
				cxUuid: "cx-1",
			},
			{ pinia: piniaWithCX("cx-1", "Home NC1") }
		);

		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
		expect(wrapper.text()).toContain("Home NC1");
	});
});
