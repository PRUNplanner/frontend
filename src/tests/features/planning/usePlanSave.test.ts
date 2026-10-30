import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import { usePlanSave } from "@/features/planning/usePlanSave";
import { useUserStore } from "@/stores/userStore";
import { remoteChange } from "@/lib/crossTab";
import { mountComposable } from "@/tests/mountComponent";

// Types & Interfaces
import type {
	IPlanCalculation,
	IPlanViewProps,
} from "@/features/planning/planView.types";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";

const m = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	flushPlanEdits: vi.fn(),
	toast: vi.fn(),
	push: vi.fn(),
	createNewPlan: vi.fn(),
	saveExistingPlan: vi.fn(),
	reloadExistingPlan: vi.fn(),
	getPlan: vi.fn(),
	ask: vi.fn(),
	guard: vi.fn(),
}));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: m.trackEvent,
	flushPlanEdits: m.flushPlanEdits,
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => m.toast }));
vi.mock("@/router", () => ({ default: { push: m.push } }));
vi.mock("@/features/planning_data/usePlan", () => ({
	usePlan: () => ({
		createNewPlan: m.createNewPlan,
		saveExistingPlan: m.saveExistingPlan,
		reloadExistingPlan: m.reloadExistingPlan,
	}),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string) => ({
		execute: () => (name === "GetPlan" ? m.getPlan() : undefined),
	}),
}));
vi.mock("@/features/save_conflict/useSaveConflict", () => ({
	useSaveConflict: () => ({ ask: m.ask }),
}));
vi.mock("@/features/save_conflict/saveConflict.util", () => ({
	getSaveError: (err: unknown) => (err === "deleted" ? "deleted" : null),
	threeWay: () => [],
}));
vi.mock("@/lib/useUnsavedGuard", () => ({ useUnsavedGuard: m.guard }));

const pinia = createPinia();
const PLANET = "KW-020c";

// null: a plan not created yet
function setup(id: string | null = "p-1", props = {}) {
	const uuid = id ?? undefined;
	const modified = ref(true);
	const existing = ref(uuid !== undefined);
	let snap = 0;
	const calculation = {
		existing,
		saveable: ref(true),
		modified,
		backendData: ref({ plan_name: "Plan" }),
		planName: ref("Plan"),
		planEmpires: ref([{ uuid: "e-1" }]),
		markSaved: vi.fn((): void => {
			modified.value = false;
		}),
		snapshot: vi.fn(() => JSON.stringify({ snap: ++snap })),
		savedSnapshot: () => "{}",
	};
	const planData = {
		uuid,
		planet_natural_id: PLANET,
		modified_at: "t0",
	} as IPlanDefinition;
	const plan = ref({ ...planData });
	const empire = {
		uuid: ref<string | undefined>("e-2"),
		list: ref<PlanEmpireElement[] | undefined>([
			{ uuid: "e-2", empire_name: "Beta" } as PlanEmpireElement,
		]),
	};
	const auto = ref(true);
	const viewProps = { planData, ...props } as IPlanViewProps;
	return { calculation, plan, empire, auto, viewProps, modified, existing };
}

async function mountSave(s: ReturnType<typeof setup>) {
	return mountComposable(
		() =>
			usePlanSave(
				s.calculation as unknown as IPlanCalculation,
				s.plan,
				s.empire,
				s.auto,
				s.viewProps
			),
		{ pinia }
	);
}

describe("usePlanSave", () => {
	beforeEach(() => {
		setActivePinia(pinia);
		vi.clearAllMocks();
		remoteChange.value = null;
		const user = useUserStore();
		user.$patch({ accessToken: "a", refreshToken: "r" });
	});

	it("saves an existing plan from its version, tracked", async () => {
		const s = setup();
		m.saveExistingPlan.mockResolvedValue({ modifiedAt: "t1" });
		const { result: saving } = await mountSave(s);
		expect(saving.canSave.value).toBe(true);

		await saving.save("shortcut");
		expect(m.flushPlanEdits).toHaveBeenCalled();
		expect(m.saveExistingPlan).toHaveBeenCalledWith(
			"p-1",
			{ plan_name: "Plan" },
			"t0"
		);
		expect(s.calculation.markSaved).toHaveBeenCalledWith('{"snap":1}');
		expect(m.trackEvent).toHaveBeenCalledWith("plan:save", {
			planet_natural_id: PLANET,
			trigger: "shortcut",
		});
		expect(saving.refIsSaving.value).toBe(false);

		// the next save sends the new version
		await saving.save();
		expect(m.saveExistingPlan.mock.calls[1][2]).toBe("t1");
	});

	it("says so when Save as fails, and stays open", async () => {
		const s = setup();
		m.createNewPlan.mockResolvedValue(undefined);
		const { result: saving } = await mountSave(s);
		saving.openSaveAsModal();

		await saving.saveAs();

		expect(saving.refShowSaveAsModal.value).toBe(true);
		expect(m.toast).toHaveBeenCalledWith("common.ui.save_failed", {
			type: "error",
		});
	});

	it("keeps the edits on a failed save and says so", async () => {
		const s = setup();
		m.saveExistingPlan.mockResolvedValue({ error: "failed" });
		const { result: saving } = await mountSave(s);

		await saving.save();
		expect(saving.refSaveFailed.value).toBe(true);
		expect(s.calculation.markSaved).not.toHaveBeenCalled();
		expect(m.toast).toHaveBeenCalledWith(
			"plan.save_status.failed_message",
			{
				type: "error",
			}
		);
	});

	it("asks on a conflict and overwrites without a version", async () => {
		const s = setup();
		m.saveExistingPlan
			.mockResolvedValueOnce({ error: "conflict" })
			.mockResolvedValueOnce({ modifiedAt: "t2" });
		m.ask.mockResolvedValue("overwrite");
		const { result: saving } = await mountSave(s);

		await saving.save();
		await nextTick();
		await flushPromises();
		expect(m.ask).toHaveBeenCalledWith(
			expect.objectContaining({
				deleted: false,
				options: ["save_as_new", "overwrite", "reload"],
			})
		);
		expect(m.trackEvent).toHaveBeenCalledWith("plan:save_conflict", {
			planet_natural_id: PLANET,
			is_deleted: false,
			choice: "overwrite",
		});
		expect(m.saveExistingPlan.mock.calls[1][2]).toBeUndefined();
	});

	it("keeps a deleted plan's edits as a new plan in its empire", async () => {
		const s = setup();
		m.saveExistingPlan.mockResolvedValue({ error: "deleted" });
		m.ask.mockResolvedValue("save_as_new");
		m.createNewPlan.mockResolvedValue({ uuid: "p-2", modifiedAt: "t1" });
		const { result: saving } = await mountSave(s);

		await saving.save();
		await nextTick();
		await flushPromises();
		expect(m.ask.mock.calls[0][0].options).toEqual(["save_as_new"]);
		// e-2 doesn't hold the plan, its first empire does
		expect(m.createNewPlan.mock.calls[0][0].empire_uuid).toBe("e-1");
		expect(m.push).toHaveBeenCalledWith(`/plan/${PLANET}/p-2`);
	});

	it("creates a new plan with its habs preference and moves to its URL", async () => {
		const s = setup(null);
		m.createNewPlan.mockImplementation(async () => {
			// an edit while creating is saved before the move
			s.modified.value = true;
			return { uuid: "p-9", modifiedAt: "t1" };
		});
		s.calculation.markSaved.mockImplementationOnce(() => {});
		m.saveExistingPlan.mockResolvedValue({ modifiedAt: "t2" });
		const { result: saving } = await mountSave(s);

		await saving.save();
		expect(s.plan.value.uuid).toBe("p-9");
		expect(useUserStore().getPlanPreference("p-9").autoOptimizeHabs).toBe(
			true
		);
		expect(m.trackEvent).toHaveBeenCalledWith("plan:create", {
			planet_natural_id: PLANET,
			is_first_plan: true,
		});
		expect(m.saveExistingPlan).toHaveBeenCalledWith(
			"p-9",
			expect.anything(),
			"t1"
		);
		expect(m.push).toHaveBeenCalledWith(`/plan/${PLANET}/p-9`);
	});

	it("saves as a copy in a new tab, a shared copy in place", async () => {
		const s = setup();
		m.createNewPlan.mockResolvedValue({ uuid: "p-3", modifiedAt: "t1" });
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		const { result: saving } = await mountSave(s);

		saving.openSaveAsModal();
		expect(saving.refSaveAsName.value).toBe("Plan (Copy)");
		expect(saving.refSaveAsEmpireUuid.value).toBe("e-2");
		expect(saving.saveAsEmpireOptions.value).toEqual([
			{ label: "Beta", value: "e-2" },
		]);

		await saving.saveAs();
		expect(saving.refShowSaveAsModal.value).toBe(false);
		expect(open).toHaveBeenCalledWith(`/plan/${PLANET}/p-3`, "_blank");
		expect(m.trackEvent).toHaveBeenCalledWith("plan:save_as", {
			planet_natural_id: PLANET,
		});
		open.mockRestore();

		const shared = setup("p-1", { shared: true });
		const { result: sharedSaving } = await mountSave(shared);
		sharedSaving.openSaveAsModal();
		await sharedSaving.saveAs();
		expect(m.push).toHaveBeenCalledWith(`/plan/${PLANET}/p-3`);
		expect(m.trackEvent).toHaveBeenCalledWith("plan:shared_clone", {
			planet_natural_id: PLANET,
			modified: true,
		});
	});

	it("reloads the saved plan only after confirming unsaved edits away", async () => {
		const s = setup();
		const saved = { uuid: "p-1", modified_at: "t5" } as IPlanDefinition;
		m.reloadExistingPlan.mockResolvedValue(saved);
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
		const { result: saving } = await mountSave(s);

		await saving.reloadPlan();
		expect(m.reloadExistingPlan).not.toHaveBeenCalled();

		confirm.mockReturnValue(true);
		await saving.reloadPlan();
		expect(s.plan.value).toEqual(saved);
		expect(s.calculation.markSaved).toHaveBeenCalledWith();
		expect(m.trackEvent).toHaveBeenCalledWith("plan:reload", {
			planet_natural_id: PLANET,
		});
		confirm.mockRestore();
	});

	it("follows another tab's save, with unsaved edits as a notice", async () => {
		const s = setup();
		const destroy = vi.fn();
		m.toast.mockReturnValue({ destroy });
		m.getPlan.mockResolvedValue({ uuid: "p-1", modified_at: "t7" });
		const { wrapper } = await mountSave(s);

		// another plan
		remoteChange.value = { keys: [], uuids: ["p-x"], seq: 1 };
		await flushPromises();
		expect(m.getPlan).not.toHaveBeenCalled();

		remoteChange.value = { keys: [], uuids: ["p-1"], seq: 2 };
		await flushPromises();
		expect(m.toast).toHaveBeenCalledWith(
			"save_conflict.notice.saved_elsewhere",
			expect.objectContaining({ duration: 15_000 })
		);
		expect(m.trackEvent).toHaveBeenCalledWith("app:remote_change", {
			object_type: "plan",
			has_unsaved_edits: true,
			is_deleted: false,
		});

		// without edits it reloads
		s.modified.value = false;
		remoteChange.value = { keys: [], uuids: ["p-1"], seq: 3 };
		await flushPromises();
		expect(destroy).toHaveBeenCalled();
		expect(s.plan.value.modified_at).toBe("t7");

		// deleted elsewhere
		m.getPlan.mockRejectedValue("deleted");
		remoteChange.value = { keys: [], uuids: ["p-1"], seq: 4 };
		await flushPromises();
		expect(m.toast).toHaveBeenLastCalledWith(
			"save_conflict.notice.deleted_elsewhere",
			{ type: "error", duration: 15_000 }
		);

		wrapper.unmount();
		expect(m.flushPlanEdits).toHaveBeenCalled();
		// the notice before, the deleted notice on unmount
		expect(destroy).toHaveBeenCalledTimes(3);
	});

	it("guards leaving with unsaved edits, not on a shared link", async () => {
		const s = setup();
		await mountSave(s);
		const [dirty, message, onLeave] = m.guard.mock.calls[0];
		expect(dirty()).toBe(true);
		expect(message()).toBe("plan.notifications.leave_unsaved");
		onLeave();
		expect(m.trackEvent).toHaveBeenCalledWith("plan:leave_unsaved", {
			planet_natural_id: PLANET,
		});

		const link = setup("p-1", { sharedPlanUuid: "s-1" });
		await mountSave(link);
		expect(m.guard.mock.calls[1][0]()).toBe(false);
	});
});
