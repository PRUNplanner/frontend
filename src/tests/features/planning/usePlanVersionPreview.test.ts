import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises } from "@vue/test-utils";

import { usePlanVersionPreview } from "@/features/planning/usePlanVersionPreview";
import { usePlanHistory } from "@/features/planning/usePlanHistory";
import { mountComposable } from "@/tests/mountComponent";

// Types & Interfaces
import type { IPlanCalculation } from "@/features/planning/planView.types";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type { PlanVersion } from "@/features/api/schemas/planningData.schemas";

const m = vi.hoisted(() => ({
	query: vi.fn(),
	trackEvent: vi.fn(),
	reportError: vi.fn(),
	toast: vi.fn(),
}));
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, args: unknown) => ({
		execute: () => m.query(name, args),
	}),
}));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: m.trackEvent,
	reportError: m.reportError,
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => m.toast }));

const pinia = createPinia();

function planOf(amount: number): IPlanDefinition {
	return {
		uuid: "p-1",
		plan_name: "Plan",
		planet_natural_id: "KW-020c",
		plan_permits_used: 1,
		plan_cogc: "---",
		plan_corphq: false,
		plan_data: {
			experts: [],
			workforce: [],
			infrastructure: [],
			buildings: [{ name: "EXT", amount, active_recipes: [] }],
		},
	} as IPlanDefinition;
}

const version = {
	...planOf(3),
	uuid: "v-1",
	kind: "save",
	name: "Early stage",
	created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
	source_version: null,
	is_active: false,
	data_bytes: 10,
} as unknown as PlanVersion;

async function setup() {
	const plan = ref(planOf(1));
	const planName = ref<string | undefined>("Plan");
	const { result } = await mountComposable(
		() => {
			const history = usePlanHistory(plan, planName);
			const preview = usePlanVersionPreview(
				history as unknown as IPlanCalculation,
				() => "p-1"
			);
			return { history, preview };
		},
		{ pinia }
	);
	// an unsaved edit before the preview
	result.history.record(
		() => (plan.value.plan_data.buildings[0].amount = 2)
	)();
	await flushPromises();
	return { plan, ...result };
}

const amount = (plan: { value: IPlanDefinition }) =>
	plan.value.plan_data.buildings[0].amount;

describe("usePlanVersionPreview", () => {
	beforeEach(() => {
		setActivePinia(pinia);
		vi.clearAllMocks();
		m.query.mockImplementation(async (name: string) =>
			name === "GetPlanVersion" ? version : undefined
		);
	});

	it("shows a version and brings the edits back unchanged", async () => {
		const { plan, history, preview } = await setup();
		await preview.open("v-1");

		expect(m.query).toHaveBeenCalledWith("GetPlanVersion", {
			planUuid: "p-1",
			versionUuid: "v-1",
		});
		expect(preview.previewing.value).toBe(true);
		expect(amount(plan)).toBe(3);
		// the unsaved edit is set aside
		expect(preview.stashModified.value).toBe(true);
		expect(m.trackEvent).toHaveBeenCalledWith("plan:version_preview", {
			named: true,
			age_days: 3,
		});

		preview.back();
		await flushPromises();
		expect(preview.previewing.value).toBe(false);
		expect(preview.stashModified.value).toBe(false);
		expect(amount(plan)).toBe(2);
		// the preview added no undo step
		history.undo();
		expect(amount(plan)).toBe(1);
		expect(history.canUndo.value).toBe(false);
	});

	it("compares the version with the edits", async () => {
		const { preview } = await setup();
		expect(preview.compare()).toEqual([]);
		await preview.open("v-1");

		const lines = preview.compare();
		expect(lines).toEqual([
			expect.objectContaining({
				area: "building:EXT",
				params: expect.objectContaining({ from: 2, to: 3 }),
			}),
		]);
		expect(m.trackEvent).toHaveBeenCalledWith("plan:version_compare");
	});

	it("restores as one undo step; undoing it unmarks the restore", async () => {
		const { plan, history, preview } = await setup();
		await preview.open("v-1");
		preview.restoreVersion();
		await flushPromises();

		expect(preview.previewing.value).toBe(false);
		expect(amount(plan)).toBe(3);
		expect(preview.refRestoredFrom.value?.uuid).toBe("v-1");
		expect(m.trackEvent).toHaveBeenCalledWith("plan:version_restore", {
			named: true,
			age_days: 3,
		});

		history.undo();
		await flushPromises();
		expect(amount(plan)).toBe(2);
		expect(preview.refRestoredFrom.value).toBeNull();

		history.redo();
		await flushPromises();
		expect(preview.refRestoredFrom.value?.uuid).toBe("v-1");

		preview.clearRestore();
		expect(preview.refRestoredFrom.value).toBeNull();
	});

	it("says so when the version can't be loaded", async () => {
		const { plan, preview } = await setup();
		m.query.mockRejectedValue(new Error("offline"));
		await preview.open("v-1");
		expect(preview.previewing.value).toBe(false);
		expect(amount(plan)).toBe(2);
		expect(m.toast).toHaveBeenCalledWith("common.ui.load_failed", {
			type: "error",
		});
	});

	it("opens the version as a new plan in a new tab", async () => {
		const { preview } = await setup();
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		await preview.openAsPlan();
		expect(open).not.toHaveBeenCalled();

		m.query.mockImplementation(async (name: string) =>
			name === "GetPlanVersion"
				? version
				: { uuid: "p-2", planet_natural_id: "KW-020c" }
		);
		await preview.open("v-1");
		await preview.openAsPlan();
		expect(m.query).toHaveBeenCalledWith("ClonePlanVersion", {
			planUuid: "p-1",
			versionUuid: "v-1",
		});
		expect(open).toHaveBeenCalledWith("/plan/KW-020c/p-2", "_blank");
		expect(m.trackEvent).toHaveBeenCalledWith("plan:version_open_as_plan");

		m.query.mockRejectedValue(new Error("offline"));
		await preview.openAsPlan();
		expect(m.toast).toHaveBeenCalledWith("common.ui.save_failed", {
			type: "error",
		});
		open.mockRestore();
	});

	it("sets nothing aside when previewing from the saved state", async () => {
		const { history, preview } = await setup();
		history.markSaved();
		await preview.open("v-1");
		expect(preview.stashModified.value).toBe(false);
	});

	it("drops the preview when the plan is replaced", async () => {
		const { preview } = await setup();
		await preview.open("v-1");
		preview.cancel();
		expect(preview.previewing.value).toBe(false);
		expect(preview.refRestoredFrom.value).toBeNull();
	});

	it("does nothing without a plan or a preview", async () => {
		const plan = ref(planOf(1));
		const planName = ref<string | undefined>("Plan");
		const { result } = await mountComposable(
			() =>
				usePlanVersionPreview(
					usePlanHistory(
						plan,
						planName
					) as unknown as IPlanCalculation,
					() => undefined
				),
			{ pinia }
		);
		await result.open("v-1");
		result.restoreVersion();
		await result.openAsPlan();
		expect(m.query).not.toHaveBeenCalled();
		expect(result.refRestoredFrom.value).toBeNull();
	});
});
