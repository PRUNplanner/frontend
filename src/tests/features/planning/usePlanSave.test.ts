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
import type { usePlanVersionPreview } from "@/features/planning/usePlanVersionPreview";
import type { IPlanDraftOptions } from "@/features/planning/usePlanDraft.types";
import type { PlanDraft } from "@/features/api/schemas/planningData.schemas";

const m = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	flushPlanEdits: vi.fn(),
	toast: vi.fn(),
	push: vi.fn(),
	createNewPlan: vi.fn(),
	saveExistingPlan: vi.fn(),
	getPlan: vi.fn(),
	ask: vi.fn(),
	guard: vi.fn(),
	confirm: vi.fn(),
	draftOptions: undefined as unknown,
	draft: {} as Record<string, unknown>,
}));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: m.trackEvent,
	flushPlanEdits: m.flushPlanEdits,
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => m.toast }));
vi.mock("@/ui/useConfirm", () => ({ useConfirm: () => m.confirm }));
vi.mock("@/router", () => ({ default: { push: m.push } }));
vi.mock("@/features/planning_data/usePlan", () => ({
	usePlan: () => ({
		createNewPlan: m.createNewPlan,
		saveExistingPlan: m.saveExistingPlan,
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
// the draft has its own tests
vi.mock("@/features/planning/usePlanDraft", () => ({
	usePlanDraft: (options: unknown) => {
		m.draftOptions = options;
		return m.draft;
	},
}));

const pinia = createPinia();
const PLANET = "KW-020c";

function fakeDraft() {
	return {
		draftSavedAt: ref(null),
		draftResumed: ref(false),
		draftPending: ref(false),
		draftFailed: ref(false),
		// a draft refreshes the plan first; these tests' drafts do
		load: vi.fn(async (refresh: () => Promise<void>) => {
			await refresh();
			return null;
		}),
		// runs the save with the draft this tab saw
		withSave: vi.fn((fn: (seen: string | null) => unknown) => fn("d-1")),
		saved: vi.fn(),
		discard: vi.fn(async () => "ok"),
		drop: vi.fn(async () => {}),
		retry: vi.fn(),
		writeNow: vi.fn(),
	};
}

function fakePreview() {
	return {
		previewing: ref(false),
		stashModified: ref(false),
		refRestoredFrom: ref<{ uuid: string } | null>(null),
		clearRestore: vi.fn(),
		cancel: vi.fn(),
	};
}

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
		savedSnapshot: () => '{"saved":true}',
		applyState: vi.fn(),
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
	const preview = fakePreview();
	return {
		calculation,
		plan,
		empire,
		auto,
		viewProps,
		modified,
		existing,
		preview,
	};
}

async function mountSave(s: ReturnType<typeof setup>) {
	const mounted = await mountComposable(
		() =>
			usePlanSave(
				s.calculation as unknown as IPlanCalculation,
				s.plan,
				s.empire,
				s.auto,
				s.viewProps,
				s.preview as unknown as ReturnType<typeof usePlanVersionPreview>
			),
		{ pinia }
	);
	// the draft check on mount
	await flushPromises();
	return mounted;
}

describe("usePlanSave", () => {
	beforeEach(() => {
		setActivePinia(pinia);
		vi.clearAllMocks();
		remoteChange.value = null;
		m.draft = fakeDraft();
		m.getPlan.mockResolvedValue({ uuid: "p-1", modified_at: "t0" });
		const user = useUserStore();
		user.$patch({ accessToken: "a", refreshToken: "r" });
	});

	it("saves an existing plan from its version with the seen draft, tracked", async () => {
		const s = setup();
		m.saveExistingPlan.mockResolvedValue({ modifiedAt: "t1" });
		const { result: saving } = await mountSave(s);
		expect(saving.canSave.value).toBe(true);

		await saving.save("shortcut");
		expect(m.flushPlanEdits).toHaveBeenCalled();
		expect(m.saveExistingPlan).toHaveBeenCalledWith(
			"p-1",
			{ plan_name: "Plan" },
			"t0",
			{
				version_name: undefined,
				restored_from: undefined,
				draft_updated_at: "d-1",
			}
		);
		expect(m.draft.saved).toHaveBeenCalled();
		expect(s.calculation.markSaved).toHaveBeenCalledWith('{"snap":1}');
		expect(s.preview.clearRestore).toHaveBeenCalled();
		expect(m.trackEvent).toHaveBeenCalledWith("plan:save", {
			planet_natural_id: PLANET,
			trigger: "shortcut",
			named: false,
			restore: false,
		});
		expect(saving.refIsSaving.value).toBe(false);

		// the next save (after an edit) sends the new version
		s.modified.value = true;
		await saving.save();
		expect(m.saveExistingPlan.mock.calls[1][2]).toBe("t1");
	});

	it("saves a named version and a restore, tracked", async () => {
		const s = setup();
		s.preview.refRestoredFrom.value = { uuid: "v-9" };
		m.saveExistingPlan.mockResolvedValue({ modifiedAt: "t1" });
		const { result: saving } = await mountSave(s);

		await saving.save("button", "  Late stage ");
		expect(m.saveExistingPlan.mock.calls[0][3]).toEqual({
			version_name: "Late stage",
			restored_from: "v-9",
			draft_updated_at: "d-1",
		});
		expect(m.trackEvent).toHaveBeenCalledWith("plan:save", {
			planet_natural_id: PLANET,
			trigger: "button",
			named: true,
			restore: true,
		});
		expect(m.trackEvent).toHaveBeenCalledWith("plan:version_name", {
			from: "save",
		});
	});

	it("saves once more without a restored version that is gone", async () => {
		const s = setup();
		s.preview.refRestoredFrom.value = { uuid: "v-9" };
		m.saveExistingPlan
			.mockResolvedValueOnce({ error: "restored_from" })
			.mockResolvedValueOnce({ modifiedAt: "t1" });
		const { result: saving } = await mountSave(s);

		await saving.save();
		expect(m.saveExistingPlan).toHaveBeenCalledTimes(2);
		expect(
			m.saveExistingPlan.mock.calls[1][3].restored_from
		).toBeUndefined();
		expect(saving.refSaveFailed.value).toBe(false);
		expect(s.calculation.markSaved).toHaveBeenCalled();
	});

	it("can't save while previewing a version", async () => {
		const s = setup();
		s.preview.previewing.value = true;
		const { result: saving } = await mountSave(s);
		expect(saving.canSave.value).toBe(false);
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
		expect(m.draft.saved).not.toHaveBeenCalled();
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

	it("reloads on a conflict and drops the draft", async () => {
		const s = setup();
		m.saveExistingPlan.mockResolvedValue({ error: "conflict" });
		m.ask.mockResolvedValue("reload");
		m.getPlan.mockResolvedValue({ uuid: "p-1", modified_at: "t3" });
		const { result: saving } = await mountSave(s);

		await saving.save();
		await nextTick();
		await flushPromises();
		expect(m.draft.drop).toHaveBeenCalled();
		expect(s.preview.cancel).toHaveBeenCalled();
		expect(s.plan.value.modified_at).toBe("t3");
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
		expect(m.draft.drop).toHaveBeenCalled();
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
		// no draft before the plan exists
		expect(m.draft.load).not.toHaveBeenCalled();

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

	it("discards the changes after confirming, only once the draft is gone", async () => {
		const s = setup();
		m.confirm.mockResolvedValue(false);
		const { result: saving } = await mountSave(s);

		await saving.discardChanges();
		expect(m.draft.discard).not.toHaveBeenCalled();

		expect(m.confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				content: "plan.versions.discard_confirm",
			})
		);

		// another draft is stored: the dialog opened, the edits stay
		m.confirm.mockResolvedValue(true);
		(m.draft.discard as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			"conflict"
		);
		await saving.discardChanges();
		expect(s.calculation.applyState).not.toHaveBeenCalled();

		(m.draft.discard as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			"failed"
		);
		await saving.discardChanges();
		expect(m.toast).toHaveBeenCalledWith("plan.versions.discard_failed", {
			type: "error",
		});

		await saving.discardChanges();
		expect(s.calculation.applyState).toHaveBeenCalledWith('{"saved":true}');
		expect(s.calculation.markSaved).toHaveBeenCalledWith('{"saved":true}');
		expect(m.trackEvent).toHaveBeenCalledWith("plan:discard_changes");
	});

	it("brings back the draft on open, with a notice to discard it", async () => {
		const s = setup();
		const destroy = vi.fn();
		m.toast.mockReturnValue({ destroy });
		const updated = new Date(Date.now() - 5 * 60_000).toISOString();
		(m.draft.load as ReturnType<typeof vi.fn>).mockImplementation(
			async (refresh: () => Promise<void>) => {
				await refresh();
				return { updated_at: updated };
			}
		);
		const { wrapper } = await mountSave(s);

		expect(m.getPlan).toHaveBeenCalled();
		expect(m.trackEvent).toHaveBeenCalledWith("plan:draft_restored", {
			age_minutes: 5,
		});
		const [text, options] = m.toast.mock.calls[0];
		expect(text).toBe("plan.versions.draft_restored");
		expect(options.action.label).toBe("plan.versions.discard");

		// the notice's Discard asks nothing more
		await options.action.onClick();
		expect(m.confirm).not.toHaveBeenCalled();
		expect(m.draft.discard).toHaveBeenCalled();
		expect(m.trackEvent).toHaveBeenCalledWith("plan:draft_discard");

		wrapper.unmount();
		expect(destroy).toHaveBeenCalled();
	});

	it("shows a newer save before looking for the draft", async () => {
		const s = setup();
		s.modified.value = false;
		m.getPlan.mockResolvedValue({ uuid: "p-1", modified_at: "t4" });
		await mountSave(s);
		expect(s.plan.value.modified_at).toBe("t4");
		// the draft compares with the newer base
		const options = m.draftOptions as { base: () => string };
		expect(options.base()).toBe("t4");
		expect(m.draft.load).toHaveBeenCalled();
	});

	it("follows another tab's save, with unsaved edits as a notice", async () => {
		const s = setup();
		const destroy = vi.fn();
		m.toast.mockReturnValue({ destroy });
		const { wrapper } = await mountSave(s);
		m.getPlan.mockClear();
		m.getPlan.mockResolvedValue({ uuid: "p-1", modified_at: "t7" });

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

	it("guards leaving with edits the draft doesn't hold, not on a shared link", async () => {
		const s = setup();
		await mountSave(s);
		const [dirty, message, onLeave] = m.guard.mock.calls[0];
		// kept in the draft
		expect(dirty()).toBe(false);
		(m.draft.draftPending as { value: boolean }).value = true;
		expect(dirty()).toBe(true);
		(m.draft.draftPending as { value: boolean }).value = false;
		(m.draft.draftFailed as { value: boolean }).value = true;
		expect(dirty()).toBe(true);
		expect(message()).toBe("plan.notifications.leave_unsaved");
		onLeave();
		expect(m.trackEvent).toHaveBeenCalledWith("plan:leave_unsaved", {
			planet_natural_id: PLANET,
		});

		// no draft before the plan exists
		m.draft = fakeDraft();
		await mountSave(setup(null));
		expect(m.guard.mock.calls[1][0]()).toBe(true);

		const link = setup("p-1", { sharedPlanUuid: "s-1" });
		await mountSave(link);
		expect(m.guard.mock.calls[2][0]()).toBe(false);
	});

	it("doesn't save a version without changes, unless it is named", async () => {
		const s = setup();
		s.modified.value = false;
		m.saveExistingPlan.mockResolvedValue({ modifiedAt: "t1" });
		const { result: saving } = await mountSave(s);

		await saving.save("shortcut");
		expect(m.saveExistingPlan).not.toHaveBeenCalled();
		expect(saving.refIsSaving.value).toBe(false);

		await saving.save("button", "Checkpoint");
		expect(m.saveExistingPlan).toHaveBeenCalledTimes(1);
	});

	it("keeps the edits set aside by a preview from another tab's save and leaving", async () => {
		const s = setup();
		const destroy = vi.fn();
		m.toast.mockReturnValue({ destroy });
		await mountSave(s);
		// the preview shows the saved state: nothing looks modified
		s.modified.value = false;
		s.preview.previewing.value = true;
		m.getPlan.mockResolvedValue({ uuid: "p-1", modified_at: "t7" });

		remoteChange.value = { keys: [], uuids: ["p-1"], seq: 1 };
		await flushPromises();
		expect(s.preview.cancel).not.toHaveBeenCalled();
		expect(m.toast).toHaveBeenCalledWith(
			"save_conflict.notice.saved_elsewhere",
			expect.anything()
		);
		const dirty = m.guard.mock.calls[0][0];
		// no edits set aside: leaving loses nothing
		expect(dirty()).toBe(false);
		// edits set aside, kept in the draft
		s.preview.stashModified.value = true;
		expect(dirty()).toBe(false);
		// not in the draft yet
		(m.draft.draftPending as { value: boolean }).value = true;
		expect(dirty()).toBe(true);
	});

	it("hands the draft the plan, its base and how to show a draft", async () => {
		const s = setup();
		await mountSave(s);
		const o = m.draftOptions as IPlanDraftOptions;
		expect(o.planUuid()).toBe("p-1");
		expect(o.enabled()).toBe(true);
		expect(o.payload()).toEqual({ plan_name: "Plan" });
		expect(o.base()).toBe("t0");
		o.applyDraft({ plan_name: "Draft" } as PlanDraft);
		expect(s.calculation.applyState).toHaveBeenCalledWith(
			expect.stringContaining("Draft")
		);
		// no drafts while previewing
		s.preview.previewing.value = true;
		expect(o.enabled()).toBe(false);
	});

	it("keeps the last base for drafts after an overwrite cleared it", async () => {
		const s = setup();
		m.saveExistingPlan
			.mockResolvedValueOnce({ error: "conflict" })
			.mockResolvedValueOnce({ error: "failed" });
		m.ask.mockResolvedValue("overwrite");
		const { result: saving } = await mountSave(s);
		await saving.save();
		await nextTick();
		await flushPromises();
		expect(m.saveExistingPlan.mock.calls[1][2]).toBeUndefined();
		expect((m.draftOptions as IPlanDraftOptions).base()).toBe("t0");
	});

	it("has nothing to discard without changes", async () => {
		const s = setup();
		s.modified.value = false;
		const { result: saving } = await mountSave(s);
		await saving.discardChanges();
		expect(m.confirm).not.toHaveBeenCalled();
		expect(m.draft.discard).not.toHaveBeenCalled();
	});
});
