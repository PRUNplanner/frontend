import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import AxiosMockAdapter from "axios-mock-adapter";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, h, isProxy } from "vue";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useQuery } from "@/lib/query_cache/useQuery";
import { useUserStore } from "@/stores/userStore";
import { trackUser } from "@/lib/analytics/useAnalytics";
import { remoteChange } from "@/lib/crossTab";
import { invalidate } from "@/lib/query_cache/queries/queries.util";
import { useQueryStore } from "@/lib/query_cache/queryStore";

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

	it("hands out the cached list itself, not a copy or a proxy", async () => {
		mock.onGet(/planning\/empire\/$/).reply(200, [empire(E1)]);

		const { component } = await mountComponent(WrapperPlanningDataLoader, {
			empireList: true,
		});
		const [[list]] = component.emitted("data:empire:list")!;

		expect(list).toBe(await useQuery("GetAllEmpires").execute());
		expect(isProxy(list)).toBe(false);
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
			uuids: [E2],
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
			uuids: [E2],
			seq: (remoteChange.value?.seq ?? 0) + 1,
		};
		await vi.waitFor(() =>
			expect(component.emitted("data:cx")).toHaveLength(2)
		);

		expect(component.emitted("update:cxUuid")).toEqual([[E1]]);
	});
});

describe("WrapperPlanningDataLoader plan data", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.mocked(trackUser).mockClear();
	});

	/** Mounts the loader in a host whose slot props are captured */
	async function mountWithSlot(
		props: Record<string, unknown>,
		pinia = createPinia()
	) {
		const slot: { current: Record<string, unknown> } = { current: {} };
		const Host = defineComponent({
			// attrs follow setProps
			setup:
				(_, { attrs }) =>
				() =>
					h(
						WrapperPlanningDataLoader,
						{ ...attrs },
						{
							default: (slotProps: Record<string, unknown>) => {
								slot.current = slotProps;
								return null;
							},
						}
					),
		});
		const mounted = await mountComponent(Host, props, { pinia });
		const loader = mounted.wrapper.findComponent(WrapperPlanningDataLoader);
		return { ...mounted, loader, slot };
	}

	it("refuses to load a shared plan together with other plan data", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		try {
			await expect(
				mountComponent(WrapperPlanningDataLoader, {
					sharedPlanUuid: DELETED,
					planUuid: plan.uuid,
				})
			).rejects.toThrow("must not load any other plan data");
			await expect(
				mountComponent(WrapperPlanningDataLoader, {
					sharedPlanUuid: DELETED,
					planetNaturalId: "KW-688c",
				})
			).rejects.toThrow("must not load any other plan data");
		} finally {
			error.mockRestore();
			warn.mockRestore();
		}
	});

	it("uses the loaded plan as definition and reloads on another plan", async () => {
		const other = { ...plan, uuid: uuid(7), plan_name: "Other plan" };
		mock.onGet(`/planning/plan/${plan.uuid}/`).reply(200, plan);
		mock.onGet(`/planning/plan/${other.uuid}/`).reply(200, other);

		const { loader, slot, setProps } = await mountWithSlot({
			planUuid: plan.uuid,
		});
		await vi.waitFor(() =>
			expect(slot.current.planDefinition).toBeTruthy()
		);

		expect(slot.current.shared).toBe(false);
		expect((slot.current.planDefinition as typeof plan).uuid).toBe(
			plan.uuid
		);
		expect(loader.emitted("data:plan")).toHaveLength(1);

		await setProps({ planUuid: other.uuid });
		await vi.waitFor(() =>
			expect(loader.emitted("data:plan")).toHaveLength(2)
		);

		expect(loader.emitted("data:plan")![1][0]).toMatchObject({
			uuid: other.uuid,
		});
		expect(
			mock.history.get
				.map((r) => r.url!)
				.filter((url) => url.includes("planning/plan/"))
		).toEqual([
			`/planning/plan/${plan.uuid}/`,
			`/planning/plan/${other.uuid}/`,
		]);
	});

	it("creates a blank plan for a planet without a plan", async () => {
		mock.onGet(/data\/planet\//).reply(200, planet);

		const { slot } = await mountWithSlot({
			planetNaturalId: planet.planet_natural_id,
		});
		await vi.waitFor(() =>
			expect(slot.current.planDefinition).toBeTruthy()
		);

		expect(slot.current.planetData).toMatchObject({
			planet_natural_id: planet.planet_natural_id,
		});
		expect(slot.current.planDefinition).toMatchObject({
			planet_natural_id: planet.planet_natural_id,
		});
		expect(
			(slot.current.planDefinition as Record<string, unknown>).uuid
		).toBeUndefined();
	});

	it("loads plan and shared lists and reports the planets", async () => {
		mock.onGet(/planning\/plan\/$/).reply(200, [plan]);
		mock.onGet(/planning\/shared\/$/).reply(200, []);

		const { loader, slot } = await mountWithSlot({
			planList: true,
			loadShared: true,
		});
		await vi.waitFor(() =>
			expect(loader.emitted("complete")).toHaveLength(1)
		);

		expect(loader.emitted("data:plan:list")).toHaveLength(1);
		expect(slot.current.planList).toHaveLength(1);
		expect(loader.emitted("data:plan:list:planets")).toEqual([
			[[plan.planet_natural_id]],
		]);
		expect(loader.emitted("data:shared")).toEqual([[[]]]);
		expect(slot.current.sharedData).toEqual([]);
		expect(trackUser).toHaveBeenCalledWith({ plan_count: 1 });
	});

	it("loads the plans of an empire without an empire list", async () => {
		mock.onGet(/planning\/empire\/[^/]+\/plans\/$/).reply(200, [plan]);

		const { loader, slot } = await mountWithSlot({ empireUuid: E1 });
		await vi.waitFor(() =>
			expect(loader.emitted("complete")).toHaveLength(1)
		);

		// no CX known for the empire
		expect(loader.emitted("update:cxUuid")).toEqual([[undefined]]);
		expect(loader.emitted("data:empire:plans")).toHaveLength(1);
		expect(slot.current.empirePlanetList).toEqual([plan.planet_natural_id]);
	});

	it("keeps a given CX while loading empire plans", async () => {
		mock.onGet(/planning\/empire\/[^/]+\/plans\/$/).reply(200, []);

		const { loader } = await mountWithSlot({
			empireUuid: E1,
			cxUuid: uuid(5),
		});
		await vi.waitFor(() =>
			expect(loader.emitted("complete")).toHaveLength(1)
		);

		expect(loader.emitted("update:cxUuid")).toBeUndefined();
	});

	it("lists the planets of the empires when only the list loads", async () => {
		mock.onGet(/planning\/empire\/$/).reply(200, [
			{
				...empire(E1),
				plans: [
					{ uuid: uuid(3), plan_name: "A", planet_natural_id: "AAA" },
					{ uuid: uuid(4), plan_name: "B", planet_natural_id: "BBB" },
					{ uuid: uuid(6), plan_name: "A", planet_natural_id: "AAA" },
				],
			},
		]);

		const { slot } = await mountWithSlot({ empireList: true });
		await vi.waitFor(() =>
			expect(slot.current.empirePlanetList).toEqual(["AAA", "BBB"])
		);
	});

	describe("reload after a change in another tab", () => {
		function change(...keys: string[][]) {
			remoteChange.value = {
				keys,
				uuids: [E2],
				seq: (remoteChange.value?.seq ?? 0) + 1,
			};
		}

		it("ignores a cleared change", async () => {
			mock.onGet(/planning\/shared\/$/).reply(200, []);
			const { loader } = await mountWithSlot({ loadShared: true });
			await vi.waitFor(() =>
				expect(loader.emitted("complete")).toHaveLength(1)
			);

			remoteChange.value = null;
			await flushPromises();

			expect(loader.emitted("refreshed")).toBeUndefined();
		});

		it("keeps the old data when the reload fails", async () => {
			const pinia = createPinia();
			setActivePinia(pinia);
			mock.onGet(/planning\/shared\/$/).reply(200, []);
			const { loader } = await mountWithSlot({ loadShared: true }, pinia);
			await vi.waitFor(() =>
				expect(loader.emitted("complete")).toHaveLength(1)
			);
			const log = vi.spyOn(console, "error").mockImplementation(() => {});
			vi.spyOn(useQueryStore(), "execute").mockRejectedValue(
				new Error("offline")
			);

			try {
				change(["planningdata", "shared"]);
				await vi.waitFor(() => expect(log).toHaveBeenCalled());

				expect(loader.emitted("refreshed")).toBeUndefined();
				expect(loader.emitted("data:shared")).toHaveLength(1);
			} finally {
				log.mockRestore();
			}
		});
	});


	describe("on another planet", () => {
		const otherPlanet = {
			...planet,
			planet_natural_id: "OT-001a",
			planet_name: "Other",
		};
		const otherPlan = {
			...plan,
			uuid: uuid(7),
			planet_natural_id: otherPlanet.planet_natural_id,
		};
		const planetRequests = () =>
			mock.history.get
				.map((r) => r.url!)
				.filter((url) => url.includes("data/planet/"));

		beforeEach(() => {
			mock.onGet(`/planning/plan/${plan.uuid}/`).reply(200, plan);
			mock.onGet(`/planning/plan/${otherPlan.uuid}/`).reply(200, otherPlan);
			mock.onGet(`/data/planet/${planet.planet_natural_id}/`).reply(
				200,
				planet
			);
			mock.onGet(`/data/planet/${otherPlanet.planet_natural_id}/`).reply(
				200,
				otherPlanet
			);
		});

		async function mountOnPlan() {
			const mounted = await mountWithSlot({
				planetNaturalId: planet.planet_natural_id,
				planUuid: plan.uuid,
			});
			await vi.waitFor(() =>
				expect(mounted.loader.emitted("complete")).toHaveLength(1)
			);
			return mounted;
		}

		it("loads the new planet with the new plan", async () => {
			const { loader, slot, setProps } = await mountOnPlan();

			await setProps({
				planetNaturalId: otherPlanet.planet_natural_id,
				planUuid: otherPlan.uuid,
			});
			await vi.waitFor(() =>
				expect(loader.emitted("data:planet")).toHaveLength(2)
			);

			expect(planetRequests()).toEqual([
				`/data/planet/${planet.planet_natural_id}/`,
				`/data/planet/${otherPlanet.planet_natural_id}/`,
			]);
			expect(slot.current.planetData).toMatchObject({
				planet_natural_id: otherPlanet.planet_natural_id,
			});
		});

		it("creates a blank plan for the new planet, not the old", async () => {
			const { slot, setProps } = await mountOnPlan();

			await setProps({
				planetNaturalId: otherPlanet.planet_natural_id,
				planUuid: undefined,
			});
			await vi.waitFor(() =>
				expect(slot.current.planDefinition).toMatchObject({
					planet_natural_id: otherPlanet.planet_natural_id,
				})
			);

			expect(
				(slot.current.planDefinition as Record<string, unknown>).uuid
			).toBeUndefined();
		});

		it("keeps the planet for another plan on it", async () => {
			const samePlanet = { ...plan, uuid: uuid(8) };
			mock.onGet(`/planning/plan/${samePlanet.uuid}/`).reply(
				200,
				samePlanet
			);
			const { loader, setProps } = await mountOnPlan();

			await setProps({
				planetNaturalId: planet.planet_natural_id,
				planUuid: samePlanet.uuid,
			});
			await vi.waitFor(() =>
				expect(loader.emitted("complete")).toHaveLength(2)
			);

			expect(planetRequests()).toHaveLength(1);
			expect(loader.emitted("data:planet")).toHaveLength(1);
		});

		it("loads another share with the planet it brings", async () => {
			const share = (id: string, details: typeof plan) => ({
				uuid: id,
				created_at: "2026-02-09T12:07:21.068265Z",
				view_count: 1,
				plan_details: details,
			});
			mock.onGet(`/planning/shared/${E1}/`).reply(200, share(E1, plan));
			mock.onGet(`/planning/shared/${E2}/`).reply(
				200,
				share(E2, otherPlan)
			);

			const { loader, slot, setProps } = await mountWithSlot({
				sharedPlanUuid: E1,
			});
			await vi.waitFor(() =>
				expect(loader.emitted("complete")).toHaveLength(1)
			);

			await setProps({ sharedPlanUuid: E2 });
			await vi.waitFor(() =>
				expect(loader.emitted("data:planet")).toHaveLength(2)
			);

			expect(slot.current.planetData).toMatchObject({
				planet_natural_id: otherPlanet.planet_natural_id,
			});
			expect(slot.current.planDefinition).toMatchObject({
				planet_natural_id: otherPlanet.planet_natural_id,
			});
		});

		it("loads the plan the owner of a share is sent to", async () => {
			mock.onGet(`/planning/shared/${E1}/`).reply(200, {
				uuid: E1,
				created_at: "2026-02-09T12:07:21.068265Z",
				view_count: 1,
				plan_details: plan,
			});
			const { loader, slot, setProps } = await mountWithSlot({
				sharedPlanUuid: E1,
			});
			await vi.waitFor(() =>
				expect(loader.emitted("complete")).toHaveLength(1)
			);

			// as PlanLoadView's owner redirect does
			await setProps({
				sharedPlanUuid: undefined,
				planetNaturalId: planet.planet_natural_id,
				planUuid: plan.uuid,
			});
			await vi.waitFor(() =>
				expect(loader.emitted("complete")).toHaveLength(2)
			);

			expect(slot.current.shared).toBe(false);
			expect(slot.current.planDefinition).toMatchObject({
				uuid: plan.uuid,
			});
		});
	});

	it("shows an error of a step that rejects with a plain value", async () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		const store = useQueryStore();
		const execute = vi.spyOn(store, "execute");
		execute.mockRejectedValue("plain failure");

		const { wrapper } = await mountComponent(
			WrapperPlanningDataLoader,
			{ loadShared: true },
			{ pinia }
		);

		expect(wrapper.text()).toContain("wrapper.loading");
		expect(wrapper.text()).toContain("wrapper.planning_data.shared_list");
	});
});
