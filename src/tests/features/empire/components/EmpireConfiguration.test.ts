import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { reactive } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import EmpireConfiguration from "@/features/empire/components/EmpireConfiguration.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IEmpirePlanListData } from "@/features/empire/empire.types";

const mock = new AxiosMockAdapter(apiService.client);

const EMPIRE_UUID = "00000001-0000-4000-8000-000000000000";
const PUT_URL = new RegExp(`planning/empire/${EMPIRE_UUID}/$`);

function empire(overrides: Partial<PlanEmpireElement> = {}): PlanEmpireElement {
	return {
		uuid: EMPIRE_UUID,
		empire_name: "Main Empire",
		empire_faction: "ANTARES",
		empire_permits_used: 5,
		empire_permits_total: 7,
		plans: [],
		modified_at: "v1",
		...overrides,
	};
}

const plan = (permits: number) =>
	({ uuid: `plan-${permits}`, permits }) as IEmpirePlanListData;

// 1 + 3 = 4 planned permits
const PLANS = [plan(1), plan(3)];

async function mountConfiguration(props: Record<string, unknown> = {}) {
	return mountComponent(EmpireConfiguration, {
		data: empire(),
		planListData: PLANS,
		...props,
	});
}

function button(wrapper: VueWrapper, key: string) {
	const b = wrapper
		.findAll("button")
		.find((b) => b.text() === `common.buttons.${key}`);
	expect(b).toBeDefined();
	return b!;
}

async function click(wrapper: VueWrapper, key: string) {
	await button(wrapper, key).trigger("click");
	await flushPromises();
}

/** name, faction, permits total, permits used */
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

async function edit(wrapper: VueWrapper) {
	await wrapper.find("input").setValue("Renamed");
	wrapper.findComponent(PSelect).vm.$emit("update:value", "MORIA");
	const [total, used] = wrapper.findAllComponents(PInputNumber);
	await total.find("input").setValue("9");
	await used.find("input").setValue("4");
	await flushPromises();
}

const warning = (wrapper: VueWrapper) => wrapper.find(".bg-warning\\/20");

describe("EmpireConfiguration", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onPut(PUT_URL).reply((config) => [
			200,
			{
				uuid: EMPIRE_UUID,
				...JSON.parse(config.data),
				modified_at: "v2",
			},
		]);
	});

	it("fills the form from the empire", async () => {
		const { wrapper } = await mountConfiguration();

		expect(form(wrapper)).toEqual({
			name: "Main Empire",
			faction: "ANTARES",
			total: "7",
			used: "5",
		});
	});

	it("warns when used permits differ from the planned ones", async () => {
		const { wrapper } = await mountConfiguration();

		// 5 used, 1 + 3 planned
		expect(warning(wrapper).exists()).toBe(true);

		await wrapper
			.findAllComponents(PInputNumber)
			.at(1)!
			.find("input")
			.setValue("4");
		expect(warning(wrapper).exists()).toBe(false);
	});

	it("sums the permits of all plans", async () => {
		const { wrapper, setProps } = await mountConfiguration({
			data: empire({ empire_permits_used: 6 }),
		});
		expect(warning(wrapper).exists()).toBe(true);

		// 1 + 3 + 2
		await setProps({ planListData: [...PLANS, plan(2)] });
		expect(warning(wrapper).exists()).toBe(false);
	});

	it("does not warn about an empire without plans and permits", async () => {
		const { wrapper, setProps } = await mountConfiguration({
			planListData: [],
		});
		expect(warning(wrapper).exists()).toBe(true);

		await setProps({ data: empire({ empire_permits_used: 0 }) });
		expect(warning(wrapper).exists()).toBe(false);
	});

	it("saves the edited empire and asks for a reload", async () => {
		const { wrapper, component } = await mountConfiguration();

		await edit(wrapper);
		await click(wrapper, "save");

		expect(mock.history.put).toHaveLength(1);
		expect(JSON.parse(mock.history.put[0].data)).toEqual({
			empire_name: "Renamed",
			empire_faction: "MORIA",
			empire_permits_used: 4,
			empire_permits_total: 9,
			base_modified_at: "v1",
		});
		expect(component.emitted("reload:empires")).toEqual([[]]);
		expect(button(wrapper, "save").attributes("aria-busy")).toBe("false");
	});

	it("shows the reloaded empire from its parent", async () => {
		const { wrapper, setProps } = await mountConfiguration();
		await edit(wrapper);
		await click(wrapper, "save");

		// the parent reloads and the backend trimmed the name
		await setProps({
			data: empire({
				empire_name: "Backend",
				empire_permits_used: 4,
				modified_at: "v2",
			}),
		});

		expect(form(wrapper)).toEqual({
			name: "Backend",
			faction: "ANTARES",
			total: "7",
			used: "4",
		});
		expect(warning(wrapper).exists()).toBe(false);
	});

	it("follows changes inside the empire object", async () => {
		const data = reactive(empire());
		const { wrapper } = await mountConfiguration({ data });

		data.empire_permits_total = 12;
		await flushPromises();

		expect(form(wrapper).total).toBe("12");
	});

	it("keeps unsaved edits when another tab saved, and says so", async () => {
		const data = reactive(empire());
		const { wrapper } = await mountConfiguration({ data });
		await edit(wrapper);

		data.empire_permits_total = 12;
		data.modified_at = "v2";
		await flushPromises();

		expect(form(wrapper).name).toBe("Renamed");
		expect(wrapper.find("[role=status]").text()).toContain(
			"save_conflict.notice.saved_elsewhere"
		);
	});

	it("reload discards unsaved edits", async () => {
		const { wrapper } = await mountConfiguration();
		await edit(wrapper);
		expect(form(wrapper).name).toBe("Renamed");

		await click(wrapper, "reload");

		expect(form(wrapper)).toEqual({
			name: "Main Empire",
			faction: "ANTARES",
			total: "7",
			used: "5",
		});
		expect(mock.history.put).toHaveLength(0);
	});

	it("keeps the edits and stops the spinner when saving fails", async () => {
		mock.resetHandlers();
		mock.onPut(PUT_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountConfiguration();
		await edit(wrapper);

		await click(wrapper, "save");

		expect(mock.history.put).toHaveLength(1);
		expect(component.emitted("reload:empires")).toBeUndefined();
		expect(form(wrapper).name).toBe("Renamed");
		expect(button(wrapper, "save").attributes("aria-busy")).toBe("false");
		expect(error).toHaveBeenCalledWith(
			"Error patching empire",
			expect.any(Error)
		);
		error.mockRestore();
	});
});
