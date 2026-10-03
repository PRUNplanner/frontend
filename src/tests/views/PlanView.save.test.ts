import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";

import PlanView from "@/views/PlanView.vue";
import { mountComponent } from "@/tests/mountComponent";
import { useUserStore } from "@/stores/userStore";
import {
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

// Types & Interfaces
import type { ISaveConflictRequest } from "@/features/save_conflict/saveConflict.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";

const mocks = vi.hoisted(() => ({
	saveExistingPlan: vi.fn(),
	createNewPlan: vi.fn(),
	ask: vi.fn(),
	execute: vi.fn(),
	push: vi.fn(),
	trackEvent: vi.fn(),
}));

vi.mock("@unhead/vue", () => ({ useHead: () => {} }));
vi.mock("@/lib/analytics/useAnalytics", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: mocks.trackEvent,
}));
vi.mock("@/router", () => ({ default: { push: mocks.push } }));
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => ({ getPlanet: async () => planet_etherwind }),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: () => ({ execute: mocks.execute }),
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => () => {} }));
vi.mock("@/features/plan_analytics/components/PlanAnalyticsBox.vue", () => ({
	__esModule: true,
	default: { name: "PlanAnalyticsBox", render: () => null },
}));
vi.mock("@/features/help/components/HelpDrawer.vue", () => ({
	__esModule: true,
	default: { name: "HelpDrawer", render: () => null },
}));
vi.mock("@/features/planning_data/usePlan", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("@/features/planning_data/usePlan")
		>();
	return {
		...actual,
		usePlan: () => ({
			...actual.usePlan(),
			saveExistingPlan: mocks.saveExistingPlan,
			createNewPlan: mocks.createNewPlan,
		}),
	};
});
vi.mock("@/features/save_conflict/useSaveConflict", async () => {
	const { ref } = await import("vue");
	return {
		useSaveConflict: () => ({ show: ref(false), ask: mocks.ask }),
	};
});

function plan(modifiedAt: string | undefined = "v1") {
	return { ...etherwindPlan(), modified_at: modifiedAt };
}

async function mountPlan(pinia: Pinia, planData: object = plan()) {
	const mounted = await mountComponent(PlanView, { planData }, { pinia });
	// the first mount waits on the plan's game data
	await vi.waitFor(() =>
		expect(mounted.wrapper.find("[aria-busy]").exists()).toBe(true)
	);
	return mounted;
}

async function save(): Promise<void> {
	window.dispatchEvent(
		new KeyboardEvent("keydown", { key: "s", ctrlKey: true })
	);
	await flushPromises();
}

describe("PlanView: saving with versions and conflicts", () => {
	let pinia: Pinia;

	beforeAll(async () => {
		await setupPlanningTestData();
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		const userStore = useUserStore();
		userStore.accessToken = "access";
		userStore.refreshToken = "refresh";
		Object.values(mocks).forEach((m) => m.mockReset());
		mocks.execute.mockResolvedValue(undefined);
	});

	it("sends the loaded version, then the saved one", async () => {
		mocks.saveExistingPlan
			.mockResolvedValueOnce({ uuid: "p", modifiedAt: "v2" })
			.mockResolvedValueOnce({ uuid: "p", modifiedAt: "v3" });
		const { wrapper } = await mountPlan(pinia);

		await save();
		await save();

		const bases = mocks.saveExistingPlan.mock.calls.map((c) => c[2]);
		expect(bases).toEqual(["v1", "v2"]);
		expect(mocks.ask).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it("a new plan saves edits made while creating with its version", async () => {
		const { wrapper } = await mountPlan(pinia, {
			...plan(undefined),
			uuid: undefined,
		});
		mocks.createNewPlan.mockImplementationOnce(async () => {
			// edited while the create was in flight
			wrapper
				.findComponent({ name: "PlanConfiguration" })
				.vm.$emit("update:plan-name", "Edited");
			await flushPromises();
			return { uuid: "new", modifiedAt: "v1" };
		});
		mocks.saveExistingPlan.mockResolvedValueOnce({
			uuid: "new",
			modifiedAt: "v2",
		});

		await save();

		expect(mocks.saveExistingPlan).toHaveBeenCalledTimes(1);
		expect(mocks.saveExistingPlan.mock.calls[0][1].plan_name).toBe(
			"Edited"
		);
		expect(mocks.saveExistingPlan.mock.calls[0][2]).toBe("v1");
		expect(mocks.push).toHaveBeenCalledWith(
			expect.stringMatching(/\/new$/)
		);
		expect(mocks.ask).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it("conflict: lists the changes and overwrites without a version", async () => {
		const saved = { ...plan("v5"), plan_name: "Theirs" };
		mocks.execute.mockResolvedValue(saved);
		mocks.saveExistingPlan
			.mockResolvedValueOnce({ error: "conflict" })
			.mockResolvedValueOnce({ uuid: "p", modifiedAt: "v6" });
		mocks.ask.mockImplementationOnce(
			async (request: ISaveConflictRequest) => {
				const changes = await request.loadChanges!();
				expect(changes.theirs).toContainEqual(
					expect.objectContaining({ area: "name", key: "name" })
				);
				return "overwrite";
			}
		);
		const { wrapper } = await mountPlan(pinia);

		await save();

		expect(mocks.ask.mock.calls[0][0]).toMatchObject({
			deleted: false,
			options: ["save_as_new", "overwrite", "reload"],
		});
		expect(mocks.execute).toHaveBeenCalledWith({ forceRefetch: true });
		expect(mocks.saveExistingPlan.mock.calls.map((c) => c[2])).toEqual([
			"v1",
			undefined,
		]);
		wrapper.unmount();
	});

	it("conflict: reload shows the saved plan and saves from its version", async () => {
		mocks.execute.mockResolvedValue({ ...plan("v5"), plan_name: "Theirs" });
		mocks.saveExistingPlan
			.mockResolvedValueOnce({ error: "conflict" })
			.mockResolvedValueOnce({ uuid: "p", modifiedAt: "v6" });
		mocks.ask.mockResolvedValueOnce("reload");
		const { wrapper } = await mountPlan(pinia);

		await save();
		expect(wrapper.text()).toContain("Theirs");

		await save();
		expect(mocks.saveExistingPlan.mock.calls[1][2]).toBe("v5");
		wrapper.unmount();
	});

	it("conflict: save as new plan creates a copy in the plan's empire", async () => {
		mocks.saveExistingPlan.mockResolvedValueOnce({ error: "conflict" });
		mocks.createNewPlan.mockResolvedValueOnce({
			uuid: "copy",
			modifiedAt: "v1",
		});
		mocks.ask.mockResolvedValueOnce("save_as_new");
		const planData = plan();
		const { wrapper } = await mountPlan(pinia, planData);

		await save();

		expect(mocks.createNewPlan).toHaveBeenCalledWith(
			expect.objectContaining({
				plan_name: "save_conflict.copy_name",
				empire_uuid: planData.empires?.[0]?.uuid,
			})
		);
		expect(mocks.push).toHaveBeenCalledWith(
			expect.stringMatching(/\/copy$/)
		);
		wrapper.unmount();
	});

	it("deleted: offers only save as new plan, closing keeps the edits", async () => {
		mocks.saveExistingPlan.mockResolvedValueOnce({ error: "deleted" });
		mocks.ask.mockResolvedValueOnce(null);
		const { wrapper } = await mountPlan(pinia);

		await save();

		expect(mocks.ask.mock.calls[0][0]).toMatchObject({
			deleted: true,
			options: ["save_as_new"],
		});
		expect(mocks.trackEvent).toHaveBeenCalledWith("plan:save_conflict", {
			planet_natural_id: planet_etherwind.planet_natural_id,
			is_deleted: true,
			choice: "close",
		});
		expect(mocks.ask.mock.calls[0][0].loadChanges).toBeUndefined();
		expect(mocks.createNewPlan).not.toHaveBeenCalled();
		expect(mocks.saveExistingPlan).toHaveBeenCalledTimes(1);
		wrapper.unmount();
	});
});
