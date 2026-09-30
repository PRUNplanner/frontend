import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useQuery } from "@/lib/query_cache/useQuery";
import { useUserStore } from "@/stores/userStore";

// test data
import plan from "@/tests/test_data/api_data_plan_etherwind.json";
import planet from "@/tests/test_data/api_data_planet_etherwind.json";

const mock = new AxiosMockAdapter(apiService.client);

const uuid = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const [E1, E2, DELETED] = [1, 2, 9].map(uuid);

const empire = (id: string) => ({
	uuid: id,
	empire_name: `Empire ${id}`,
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
	plans: [],
});

const planRequests = () =>
	mock.history.get
		.map((r) => r.url!)
		.filter((url) => url.includes("/plans/"));

const loading = (text: string) => text.includes("wrapper.loading");

describe("WrapperPlanningDataLoader with a shared plan", () => {
	beforeEach(() => mock.reset());

	it("says that a share link is gone instead of loading forever", async () => {
		mock.onGet(/planning\/shared\//).reply(404, { detail: "No match" });

		const { wrapper } = await mountComponent(WrapperPlanningDataLoader, {
			sharedPlanUuid: DELETED,
		});

		expect(wrapper.text()).toContain("sharing.unavailable.title");
		expect(loading(wrapper.text())).toBe(false);
	});

	it("loads for a visitor whose session has expired", async () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		axiosSetup();
		mock.onPost(/user\/refresh\/$/).reply(401);
		mock.onGet(/user\/profile\/$/).reply(401);
		// the dead token is refused, the logged out retry answered
		mock.onGet(/planning\/shared\//).reply((config) =>
			config.headers?.Authorization
				? [401]
				: [
						200,
						{
							uuid: DELETED,
							created_at: "2026-02-09T12:07:21.068265Z",
							view_count: 1,
							plan_details: plan,
						},
					]
		);
		mock.onGet(/data\/planet\//).reply(200, planet);
		useUserStore().setToken("access", "r".repeat(120));

		const { wrapper, component } = await mountComponent(
			WrapperPlanningDataLoader,
			{ sharedPlanUuid: DELETED },
			{ pinia }
		);
		await vi.waitFor(() =>
			expect(component.emitted("complete")).toHaveLength(1)
		);

		expect(component.emitted("data:planet")).toHaveLength(1);
		expect(useUserStore().isLoggedIn).toBe(false);
		expect(loading(wrapper.text())).toBe(false);
	});

	it("keeps the loader with its failed step for other errors", async () => {
		mock.onGet(/planning\/shared\//).reply(500);

		const { wrapper } = await mountComponent(WrapperPlanningDataLoader, {
			sharedPlanUuid: DELETED,
		});

		expect(wrapper.text()).not.toContain("sharing.unavailable.title");
		expect(loading(wrapper.text())).toBe(true);
	});
});

describe("WrapperPlanningDataLoader with an empire list", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onGet(/planning\/empire\/[^/]+\/plans\/$/).reply(200, []);
	});

	it("replaces a selected empire that no longer exists", async () => {
		mock.onGet(/planning\/empire\/$/).reply(200, [empire(E1)]);

		const { wrapper, component, setProps } = await mountComponent(
			WrapperPlanningDataLoader,
			{ empireList: true, empireUuid: DELETED }
		);

		// never asks for the deleted empire's plans
		expect(planRequests()).toEqual([]);
		expect(component.emitted("update:empireUuid")).toEqual([[E1]]);

		await setProps({ empireUuid: E1 });

		expect(planRequests()).toEqual([`planning/empire/${E1}/plans/`]);
		expect(component.emitted("data:empire:plans")).toEqual([[[]]]);
		expect(loading(wrapper.text())).toBe(false);
	});

	it("finishes loading without empires", async () => {
		mock.onGet(/planning\/empire\/$/).reply(200, []);

		const { wrapper, component } = await mountComponent(
			WrapperPlanningDataLoader,
			{ empireList: true, empireUuid: DELETED }
		);

		expect(planRequests()).toEqual([]);
		expect(component.emitted("data:empire:list")).toEqual([[[]]]);
		expect(component.emitted("complete")).toHaveLength(1);
		expect(loading(wrapper.text())).toBe(false);
	});

	it("reloads the list for an empire created after it loaded", async () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		mock.onGet(/planning\/empire\/$/).replyOnce(200, []);
		mock.onGet(/planning\/empire\/$/).reply(200, [empire(E2)]);
		mock.onPost(/planning\/empire\/$/).reply(201, empire(E2));

		const { component, setProps } = await mountComponent(
			WrapperPlanningDataLoader,
			{ empireList: true, empireUuid: undefined },
			{ pinia }
		);
		// as EmpireEmpty does, which invalidates the cached list
		await useQuery("CreateEmpire", {
			data: {
				empire_name: "My Empire",
				empire_faction: "NONE",
				empire_permits_used: 1,
				empire_permits_total: 2,
			},
		}).execute();
		await setProps({ empireUuid: E2 });

		expect(component.emitted("data:empire:list")).toEqual([
			[[]],
			[[empire(E2)]],
		]);
		expect(planRequests()).toEqual([`planning/empire/${E2}/plans/`]);
	});
});
