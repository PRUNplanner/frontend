import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { flushPromises, RouterLinkStub, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import EmpireOnboarding from "@/features/empire/components/EmpireOnboarding.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

const mock = new AxiosMockAdapter(apiService.client);

const EMPIRE_UUID = "00000001-0000-4000-8000-000000000000";
const PUT_URL = new RegExp(`planning/empire/${EMPIRE_UUID}/$`);

// what signup seeds
const EMPIRE: PlanEmpireElement = {
	uuid: EMPIRE_UUID,
	empire_name: "My Empire",
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
	plans: [],
};

const mountOnboarding = () => mountComponent(EmpireOnboarding, { empire: EMPIRE });

function form(wrapper: VueWrapper) {
	const [total, used] = wrapper
		.findAllComponents(PInputNumber)
		.map((i) => (i.find("input").element as HTMLInputElement).value);
	return {
		name: (wrapper.find("input").element as HTMLInputElement).value,
		faction: wrapper.findComponent(PSelect).props("value"),
		total,
		used,
	};
}

const saveButton = (wrapper: VueWrapper) =>
	wrapper.findAll("button").find((b) => b.text() === "common.buttons.save")!;

describe("EmpireOnboarding", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onPut(PUT_URL).reply((config) => [
			200,
			{ uuid: EMPIRE_UUID, ...JSON.parse(config.data) },
		]);
	});

	it("shows the three steps with the seeded empire prefilled", async () => {
		const { wrapper } = await mountOnboarding();

		expect(wrapper.text()).toContain("empire.onboarding.title");
		expect(wrapper.findAll("ol > li")).toHaveLength(3);
		expect(form(wrapper)).toEqual({
			name: "My Empire",
			faction: "NONE",
			total: "2",
			used: "1",
		});
		// no permit warning on the card
		expect(wrapper.find(".bg-amber-500\\/20").exists()).toBe(false);
	});

	it("saves the edited empire, confirms and asks for a reload", async () => {
		const { wrapper, component } = await mountOnboarding();
		expect(wrapper.text()).not.toContain("empire.onboarding.empire.saved");

		await wrapper.find("input").setValue("Test Empire");
		wrapper.findComponent(PSelect).vm.$emit("update:value", "MORIA");
		const [total, used] = wrapper.findAllComponents(PInputNumber);
		await total.find("input").setValue("3");
		await used.find("input").setValue("2");
		await saveButton(wrapper).trigger("click");
		await flushPromises();

		expect(JSON.parse(mock.history.put[0].data)).toEqual({
			empire_name: "Test Empire",
			empire_faction: "MORIA",
			empire_permits_used: 2,
			empire_permits_total: 3,
		});
		expect(component.emitted("reload:empires")).toEqual([[]]);
		expect(wrapper.text()).toContain("empire.onboarding.empire.saved");
	});

	it("does not confirm a failed save", async () => {
		mock.resetHandlers();
		mock.onPut(PUT_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountOnboarding();

		await saveButton(wrapper).trigger("click");
		await flushPromises();

		expect(component.emitted("reload:empires")).toBeUndefined();
		expect(wrapper.text()).not.toContain("empire.onboarding.empire.saved");
		error.mockRestore();
	});

	// the exchanges link sits in an i18n-t slot, which the key-only test
	// i18n doesn't interpolate
	it("links step 2 to planet search", async () => {
		const { wrapper } = await mountOnboarding();

		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			"/search"
		);
	});
});
