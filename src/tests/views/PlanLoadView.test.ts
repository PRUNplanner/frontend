import { beforeEach, describe, expect, it, vi } from "vitest";
import { h, type Slots } from "vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import PlanLoadView from "@/views/PlanLoadView.vue";
import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
import PlanView from "@/views/PlanView.vue";
import { useUserStore } from "@/stores/userStore";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	Plan,
	PlanShare,
} from "@/features/api/schemas/planningData.schemas";

// vi.mock factories are hoisted, so are their helpers. __esModule lets
// defineAsyncComponent pick the default export of a mocked module
const { loaded, trackEvent, replace } = vi.hoisted(() => ({
	// what the planning loader hands its default slot
	loaded: { slot: {} as Record<string, unknown> },
	trackEvent: vi.fn(),
	replace: vi.fn(),
}));

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent }));
vi.mock("@/router", () => ({ default: { replace } }));
vi.mock("@/features/wrapper/components/WrapperPlanningDataLoader.vue", () => ({
	__esModule: true,
	default: {
		name: "WrapperPlanningDataLoader",
		props: [
			"planetNaturalId",
			"planUuid",
			"sharedPlanUuid",
			"empireList",
			"loadCX",
			"planList",
		],
		emits: ["data:shared:plan", "data:plan:list"],
		setup:
			(_: unknown, { slots }: { slots: Slots }) =>
			() =>
				slots.default?.(loaded.slot),
	},
}));
vi.mock("@/features/wrapper/components/WrapperGameDataLoader.vue", () => ({
	__esModule: true,
	default: {
		name: "WrapperGameDataLoader",
		setup:
			(_: unknown, { slots }: { slots: Slots }) =>
			() =>
				h("div", { "data-game-data": "" }, slots.default?.()),
	},
}));
vi.mock("@/views/PlanView.vue", () => ({
	__esModule: true,
	default: {
		name: "PlanView",
		props: [
			"disabled",
			"shared",
			"planData",
			"empireList",
			"sharedPlanUuid",
		],
		render: () => null,
	},
}));

const OWN_UUID = "11111111-1111-4111-8111-111111111111";
const sharedPlan = {
	plan_details: { uuid: OWN_UUID, planet_natural_id: "KW-688c" },
} as PlanShare;

let pinia: Pinia;

beforeEach(() => {
	pinia = createPinia();
	setActivePinia(pinia);
	trackEvent.mockClear();
	replace.mockClear();
	loaded.slot = {};
});

const loader = (w: Awaited<ReturnType<typeof mountComponent>>) =>
	w.wrapper.findComponent(WrapperPlanningDataLoader);

describe("PlanLoadView", () => {
	it("tracks a plan view of a saved plan", async () => {
		await mountComponent(
			PlanLoadView,
			{ planetNaturalId: "KW-688c", planUuid: OWN_UUID },
			{ pinia }
		);

		expect(trackEvent).toHaveBeenCalledWith("plan:view", {
			planet_natural_id: "KW-688c",
			is_shared: false,
		});
	});

	it("tracks a view of a shared plan as shared", async () => {
		await mountComponent(
			PlanLoadView,
			{ sharedPlanUuid: "shared-1" },
			{ pinia }
		);

		expect(trackEvent).toHaveBeenCalledWith("plan:view", {
			planet_natural_id: undefined,
			is_shared: true,
		});
	});

	it("loads the user's data and plans for an own plan", async () => {
		const w = await mountComponent(
			PlanLoadView,
			{ planetNaturalId: "KW-688c", planUuid: OWN_UUID },
			{ pinia }
		);

		expect(loader(w).props()).toMatchObject({
			planetNaturalId: "KW-688c",
			planUuid: OWN_UUID,
			sharedPlanUuid: undefined,
			empireList: true,
			loadCX: true,
			planList: false,
		});
	});

	it("loads nothing of the viewer's for a logged out shared view", async () => {
		const w = await mountComponent(
			PlanLoadView,
			{ sharedPlanUuid: "shared-1" },
			{ pinia }
		);

		expect(loader(w).props()).toMatchObject({
			sharedPlanUuid: "shared-1",
			empireList: false,
			loadCX: false,
			planList: false,
		});
	});

	it("loads empires, CX and plans for a logged in shared view", async () => {
		useUserStore().setToken("access", "refresh");
		const w = await mountComponent(
			PlanLoadView,
			{ sharedPlanUuid: "shared-1" },
			{ pinia }
		);

		expect(loader(w).props()).toMatchObject({
			empireList: true,
			loadCX: true,
			planList: true,
		});
	});

	it("loads the user data once the viewer logs in on the page", async () => {
		const w = await mountComponent(
			PlanLoadView,
			{ sharedPlanUuid: "shared-1" },
			{ pinia }
		);
		expect(loader(w).props("empireList")).toBe(false);

		useUserStore().setToken("access", "refresh");
		await flushPromises();

		expect(loader(w).props()).toMatchObject({
			empireList: true,
			planList: true,
		});
	});

	it("renders nothing until the plan definition is there", async () => {
		loaded.slot = { planDefinition: null };
		const w = await mountComponent(PlanLoadView, {}, { pinia });

		expect(w.wrapper.find("[data-game-data]").exists()).toBe(false);
		expect(w.wrapper.findComponent(PlanView).exists()).toBe(false);
	});

	it("hands the loaded plan to the plan view inside the game data", async () => {
		const planDefinition = { planet_id: "KW-688c" };
		const empireList = [{ uuid: "e1" }];
		loaded.slot = {
			planDefinition,
			empireList,
			disabled: true,
			shared: true,
		};
		const w = await mountComponent(
			PlanLoadView,
			{ sharedPlanUuid: "shared-1" },
			{ pinia }
		);

		await vi.waitFor(() =>
			expect(
				w.wrapper
					.find("[data-game-data]")
					.findComponent(PlanView)
					.exists()
			).toBe(true)
		);
		expect(w.wrapper.findComponent(PlanView).props()).toEqual({
			disabled: true,
			shared: true,
			planData: planDefinition,
			empireList,
			sharedPlanUuid: "shared-1",
		});
	});

	describe("the owner opening their own share link", () => {
		const own = [{ uuid: OWN_UUID }] as Plan[];

		it("is sent to the plan once the shared plan and plan list are in", async () => {
			const w = await mountComponent(
				PlanLoadView,
				{ sharedPlanUuid: "shared-1" },
				{ pinia }
			);

			loader(w).vm.$emit("data:shared:plan", sharedPlan);
			expect(replace).not.toHaveBeenCalled();
			loader(w).vm.$emit("data:plan:list", own);

			expect(replace).toHaveBeenCalledExactlyOnceWith(
				`/plan/KW-688c/${OWN_UUID}`
			);
		});

		it("is sent the same way when the list arrives first", async () => {
			const w = await mountComponent(
				PlanLoadView,
				{ sharedPlanUuid: "shared-1" },
				{ pinia }
			);

			loader(w).vm.$emit("data:plan:list", own);
			expect(replace).not.toHaveBeenCalled();
			loader(w).vm.$emit("data:shared:plan", sharedPlan);

			expect(replace).toHaveBeenCalledExactlyOnceWith(
				`/plan/KW-688c/${OWN_UUID}`
			);
		});

		it("stays on the shared page for someone else's plan", async () => {
			const w = await mountComponent(
				PlanLoadView,
				{ sharedPlanUuid: "shared-1" },
				{ pinia }
			);

			loader(w).vm.$emit("data:shared:plan", sharedPlan);
			loader(w).vm.$emit("data:plan:list", [
				{ uuid: "22222222-2222-4222-8222-222222222222" },
			] as Plan[]);

			expect(replace).not.toHaveBeenCalled();
		});
	});
});
