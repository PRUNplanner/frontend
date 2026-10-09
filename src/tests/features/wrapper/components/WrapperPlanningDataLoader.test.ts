import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useQuery } from "@/lib/query_cache/useQuery";
import { useUserStore } from "@/stores/userStore";
import { trackUser } from "@/lib/analytics/useAnalytics";
import { remoteChange } from "@/lib/crossTab";
import { invalidate } from "@/lib/query_cache/queries/queries.util";

vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackUser: vi.fn(),
}));

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
	modified_at: "v1",
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

	it("hands out a working copy with the viewer's empires", async () => {
		mock.onGet(/planning\/shared\//).reply(200, {
			uuid: DELETED,
			created_at: "2026-02-09T12:07:21.068265Z",
			view_count: 1,
			plan_details: plan,
		});
		mock.onGet(/data\/planet\//).reply(200, planet);
		mock.onGet(/planning\/empire\/$/).reply(200, [empire(E1)]);

		// the slot's props, as PlanLoadView gets them
		let slot: Record<string, unknown> = {};
		const Host = defineComponent({
			setup: () => () =>
				h(
					WrapperPlanningDataLoader,
					{ sharedPlanUuid: DELETED, empireList: true },
					{
						default: (props: Record<string, unknown>) => {
							slot = props;
							return null;
						},
					}
				),
		});

		await mountComponent(Host);
		await vi.waitFor(() => expect(slot.planDefinition).toBeDefined());

		const definition = slot.planDefinition as Record<string, unknown>;
		expect(slot.shared).toBe(true);
		expect(slot.disabled).toBe(false);
		expect(definition.uuid).toBeUndefined();
		expect(definition).not.toHaveProperty("empires");
		expect(definition.plan_name).toBe(plan.plan_name);
		expect(slot.empireList).toHaveLength(1);
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
		// person property, from every page that loads the list
		expect(trackUser).toHaveBeenCalledWith({ empire_count: 1 });

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

	it("reloads loaded lists another tab changed, keeping the page", async () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		const cx = {
			uuid: E1,
			cx_name: "CX",
			empires: [],
			modified_at: "v1",
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: [],
				ticker_planets: [],
			},
		};
		mock.onGet(/planning\/empire\/$/).replyOnce(200, [empire(E1)]);
		mock.onGet(/planning\/empire\/$/).reply(200, [empire(E1), empire(E2)]);
		mock.onGet(/planning\/cx\/$/).reply(200, [cx]);

		const { wrapper, component } = await mountComponent(
			WrapperPlanningDataLoader,
			{ empireList: true, empireUuid: E1, loadCX: true },
			{ pinia }
		);
		await vi.waitFor(() =>
			expect(component.emitted("complete")).toHaveLength(1)
		);

		// as the cross-tab receiver does for an empire change
		await invalidate(["planningdata", "empire"]);
		remoteChange.value = {
			keys: [["planningdata", "empire"]],
			uuid: E2,
			seq: (remoteChange.value?.seq ?? 0) + 1,
		};
		// the list and the empire's plans
		await vi.waitFor(() =>
			expect(component.emitted("refreshed")).toHaveLength(2)
		);

		expect(component.emitted("data:empire:list")).toEqual([
			[[empire(E1)]],
			[[empire(E1), empire(E2)]],
		]);
		// the CX list wasn't changed, it isn't reloaded
		expect(component.emitted("data:cx")).toHaveLength(1);
		expect(loading(wrapper.text())).toBe(false);
	});

	it("a reloaded CX list keeps the selected CX", async () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		const cx = (id: string) => ({
			uuid: id,
			cx_name: `CX ${id}`,
			empires: [],
			modified_at: "v1",
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: [],
				ticker_planets: [],
			},
		});
		mock.onGet(/planning\/cx\/$/).replyOnce(200, [cx(E1)]);
		mock.onGet(/planning\/cx\/$/).reply(200, [cx(E2), cx(E1)]);

		const { component } = await mountComponent(
			WrapperPlanningDataLoader,
			{ loadCX: true },
			{ pinia }
		);
		await vi.waitFor(() =>
			expect(component.emitted("complete")).toHaveLength(1)
		);

		await invalidate(["planningdata", "cx"]);
		remoteChange.value = {
			keys: [["planningdata", "cx"]],
			uuid: E2,
			seq: (remoteChange.value?.seq ?? 0) + 1,
		};
		await vi.waitFor(() =>
			expect(component.emitted("data:cx")).toHaveLength(2)
		);

		expect(component.emitted("update:cxUuid")).toEqual([[E1]]);
	});
});
