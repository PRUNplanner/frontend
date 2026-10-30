import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick, ref } from "vue";

import { usePlanEdits } from "@/features/planning/usePlanEdits";
import { mountComposable } from "@/tests/mountComponent";

// Types & Interfaces
import type { IPlanCalculation } from "@/features/planning/planView.types";
import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
import type { IStarterSetup } from "@/features/plan_analytics/usePlanetInsights.types";

const { trackEvent, toast, optimizeHabs } = vi.hoisted(() => ({
	trackEvent: vi.fn(),
	toast: vi.fn(),
	optimizeHabs: vi.fn(),
}));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent,
}));
vi.mock("@/ui/useToast", () => ({ useToast: () => toast }));
vi.mock(
	"@/features/planning/calculations/habOptimization",
	async (original) => ({
		...(await original<
			typeof import("@/features/planning/calculations/habOptimization")
		>()),
		optimizeHabs,
	})
);

const workforce = (required: number) =>
	Object.fromEntries(
		["pioneer", "settler", "technician", "engineer", "scientist"].map(
			(w) => [w, { required }]
		)
	);

function setup() {
	const revision = ref(0);
	const result = ref({
		production: {
			buildings: [
				{
					recipeOptions: [
						{
							recipe_id: "r1",
							outputs: [
								{ material_amount: 12, material_ticker: "ALG" },
							],
						},
						{
							recipe_id: "r2",
							outputs: [
								{ material_amount: 4, material_ticker: "GRN" },
							],
						},
					],
				},
			],
		},
		workforce: workforce(10),
		infrastructureCosts: {},
		infrastructure: { HB1: 1, HB2: 0 },
		area: { areaTotal: 500, areaUsed: 100 },
	});
	const calculation = {
		result,
		revision,
		record:
			(fn: (...args: unknown[]) => Promise<void>) =>
			(...args: unknown[]) =>
				fn(...args),
		isRestoring: () => false,
		handleDeleteBuilding: vi.fn(),
		handleDeleteBuildingRecipe: vi.fn(),
		handleChangeBuildingRecipe: vi.fn(),
		handleAddBuildingRecipes: vi.fn(),
		handleApplyStarterSetup: vi.fn(async () => {}),
		handleUpdateInfrastructure: vi.fn(),
	};
	const plan = ref({
		plan_data: {
			buildings: [{ active_recipes: [{ recipeid: "r1", amount: 1 }] }],
		},
	} as unknown as IPlanDefinition);
	const auto = ref(false);
	const trackedUndo = vi.fn();
	return { calculation, result, revision, plan, auto, trackedUndo };
}

async function mountEdits(s: ReturnType<typeof setup>) {
	return mountComposable(() =>
		usePlanEdits(
			s.calculation as unknown as IPlanCalculation,
			s.plan,
			s.auto,
			s.trackedUndo,
			"KW-020c"
		)
	);
}

describe("usePlanEdits", () => {
	const destroy = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		toast.mockReturnValue({ destroy });
	});

	it("removes a building or recipe with an undo toast", async () => {
		const s = setup();
		const { result: edits } = await mountEdits(s);

		edits.deleteBuilding(0);
		expect(s.calculation.handleDeleteBuilding).toHaveBeenCalledWith(0);
		expect(toast).toHaveBeenCalledWith("plan.history.building_removed", {
			action: {
				label: "plan.history.undo",
				onClick: expect.any(Function),
			},
		});
		toast.mock.calls[0][1].action.onClick();
		expect(s.trackedUndo).toHaveBeenCalledWith("button");

		// a second toast replaces the first
		edits.deleteBuildingRecipe(0, 0);
		expect(destroy).toHaveBeenCalledTimes(1);
		expect(toast).toHaveBeenLastCalledWith(
			"plan.history.recipe_removed",
			expect.anything()
		);
	});

	it("closes the toast and status line on any later history change", async () => {
		const s = setup();
		const { result: edits, wrapper } = await mountEdits(s);
		edits.changeBuildingRecipe(0, 0, "r2");
		edits.deleteBuilding(0);
		expect(edits.refRecipeStatus.value).toBeDefined();

		s.revision.value++;
		expect(destroy).toHaveBeenCalledTimes(1);
		expect(edits.refRecipeStatus.value).toBeUndefined();

		edits.deleteBuilding(0);
		wrapper.unmount();
		expect(destroy).toHaveBeenCalledTimes(2);
	});

	it("labels a changed or added recipe by its first output", async () => {
		const s = setup();
		const { result: edits } = await mountEdits(s);

		// the recipe it already has changes nothing
		edits.changeBuildingRecipe(0, 0, "r1");
		expect(s.calculation.handleChangeBuildingRecipe).not.toHaveBeenCalled();

		edits.changeBuildingRecipe(0, 0, "r2");
		expect(s.calculation.handleChangeBuildingRecipe).toHaveBeenCalledWith(
			0,
			0,
			"r2"
		);
		expect(edits.refRecipeStatus.value).toEqual({
			building: 0,
			recipe: 0,
			text: "plan.picker.replaced",
		});

		edits.addPickedRecipe(0, "unknown");
		expect(s.calculation.handleAddBuildingRecipes).toHaveBeenCalledWith(0, [
			{ recipeid: "unknown", amount: 1 },
		]);
		expect(edits.refRecipeStatus.value?.recipe).toBe(0);

		edits.undoPickedRecipe();
		expect(trackEvent).toHaveBeenCalledWith("plan:recipe_picker_undo");
		expect(s.trackedUndo).toHaveBeenCalledWith("button");
	});

	it("optimizes habs on workforce changes only when turned on", async () => {
		const s = setup();
		optimizeHabs.mockReturnValue({
			status: "optimal",
			variables: new Map([
				["HB1", 1],
				["HB2", 3],
			]),
		});
		const { result: edits } = await mountEdits(s);

		s.result.value = { ...s.result.value, workforce: workforce(20) };
		await nextTick();
		expect(optimizeHabs).not.toHaveBeenCalled();

		s.auto.value = true;
		s.result.value = { ...s.result.value, workforce: workforce(30) };
		await nextTick();
		expect(trackEvent).toHaveBeenCalledWith("plan:hab_optimize", {
			goal: "auto",
		});
		// HB1 is unchanged
		expect(s.calculation.handleUpdateInfrastructure).toHaveBeenCalledTimes(
			1
		);
		expect(s.calculation.handleUpdateInfrastructure).toHaveBeenCalledWith(
			"HB2",
			3
		);

		// a button forces it, a failed solve changes nothing
		s.auto.value = false;
		optimizeHabs.mockReturnValue({ status: "infeasible", variables: [] });
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		toast.mockClear();
		edits.applyOptimizeHabs("cost", true);
		expect(optimizeHabs).toHaveBeenCalledTimes(2);
		expect(warn).toHaveBeenCalled();
		expect(toast).toHaveBeenCalledExactlyOnceWith(
			"plan.components.infrastructure.optimize_failed",
			{ type: "error" }
		);

		// the automatic run stays quiet
		toast.mockClear();
		s.auto.value = true;
		edits.applyOptimizeHabs("auto", false);
		expect(optimizeHabs).toHaveBeenCalledTimes(3);
		expect(toast).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("applies a starter setup with habs on, an undo toast and tracking", async () => {
		const s = setup();
		optimizeHabs.mockReturnValue({
			status: "optimal",
			variables: new Map(),
		});
		const { result: edits } = await mountEdits(s);
		const setupData = {
			buildings: [{}, {}],
			experts: [{ amount: 2 }, { amount: 1 }],
		} as unknown as IStarterSetup;

		await edits.applyStarterSetup(setupData, true);
		expect(s.auto.value).toBe(true);
		expect(s.calculation.handleApplyStarterSetup).toHaveBeenCalledWith(
			setupData
		);
		expect(toast).toHaveBeenCalledWith(
			"plan.tools.plan_starter.applied",
			expect.anything()
		);
		expect(trackEvent).toHaveBeenCalledWith("plan:starter_apply", {
			planet_natural_id: "KW-020c",
			building_count: 2,
			expert_count: 3,
			is_selection_changed: true,
		});
	});
});
