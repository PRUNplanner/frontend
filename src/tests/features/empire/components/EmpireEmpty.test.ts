import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { flushPromises, RouterLinkStub, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import EmpireEmpty from "@/features/empire/components/EmpireEmpty.vue";
import { mountComponent } from "@/tests/mountComponent";

const mock = new AxiosMockAdapter(apiService.client);

const uuid = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const [EMPIRE, CX1, CX2] = [1, 2, 3].map(uuid);

const SIGNUP_EMPIRE = {
	empire_name: "My Empire",
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
};

const cx = (id: string) => ({
	uuid: id,
	cx_name: "CX",
	cx_data: {
		cx_empire: [],
		cx_planets: [],
		ticker_empire: [],
		ticker_planets: [],
	},
	empires: [],
});

async function create(wrapper: VueWrapper) {
	await wrapper
		.findAll("button")
		.find((b) => b.text() === "empire.empty.create")!
		.trigger("click");
	await flushPromises();
}

describe("EmpireEmpty", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onPost(/planning\/empire\/$/).reply(200, {
			uuid: EMPIRE,
			...SIGNUP_EMPIRE,
		});
		mock.onPost(/planning\/cx\/junctions\/$/).reply(200, []);
	});

	it("creates the signup empire with the first CX and reports it", async () => {
		mock.onGet(/planning\/cx\/$/).reply(200, [cx(CX1), cx(CX2)]);
		const { wrapper, component } = await mountComponent(EmpireEmpty, {});

		await create(wrapper);

		expect(JSON.parse(mock.history.post[0].data)).toEqual(SIGNUP_EMPIRE);
		expect(JSON.parse(mock.history.post[1].data)).toEqual([
			{ cx_uuid: CX1, empires: [{ empire_uuid: EMPIRE }] },
		]);
		expect(component.emitted("created")).toEqual([[EMPIRE]]);
	});

	it("assigns no CX when the user has none", async () => {
		mock.onGet(/planning\/cx\/$/).reply(200, []);
		const { wrapper, component } = await mountComponent(EmpireEmpty, {});

		await create(wrapper);

		expect(mock.history.post).toHaveLength(1);
		expect(component.emitted("created")).toEqual([[EMPIRE]]);
	});

	it("reports nothing when creating fails", async () => {
		mock.onPost(/planning\/empire\/$/).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountComponent(EmpireEmpty, {});

		await create(wrapper);

		expect(component.emitted("created")).toBeUndefined();
		error.mockRestore();
	});

	it("links to management", async () => {
		const { wrapper } = await mountComponent(EmpireEmpty, {});

		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe("/manage");
	});
});
