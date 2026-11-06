import { computed, ref } from "vue";
import { vi } from "vitest";

// Types & Interfaces
import type { IPlanViewContext } from "@/features/planning/usePlanView.types";
import type { IPlanCalculation } from "@/features/planning/planView.types";
import type {
	IOverviewData,
	IPlanResult,
	IVisitationData,
} from "@/features/planning/usePlanCalculation.types";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";

// Util
import { planEmptyResult } from "@/features/planning/usePlanCalculation.types";
import { providePlanView } from "@/features/planning/usePlanView";
import planetFixture from "@/tests/test_data/api_data_planet_etherwind.json";

export const OVERVIEW: IOverviewData = {
	dailyCost: 3765.5,
	dailyProfit: 1234.5,
	totalConstructionCost: 1500000,
	dailyDegradationCost: 12,
	profit: 1234.5,
	roi: 123.456,
};

export const VISITATION: IVisitationData = {
	storageFilled: 12.345,
	dailyWeightImport: 1,
	dailyWeightExport: 4.56,
	dailyVolumeImport: 1,
	dailyVolumeExport: 7.04,
	dailyWeight: 5.56,
	dailyVolume: 8.04,
};

export interface IContextOptions {
	result?: IPlanResult;
	overview?: Partial<IOverviewData>;
	readOnly?: boolean;
	showAll?: boolean;
	activeEmpire?: PlanEmpire;
	planEmpires?: PlanEmpire[];
	profitPerArea?: number;
	priceSource?: string;
	autoOptimizeHabs?: boolean;
}

/**
 * A plan view context for one element under test: the plan's figures as
 * refs, every handler a mock
 *
 * @param {IContextOptions} o What differs
 * @returns {IPlanViewContext} Context
 */
export function planViewContext(o: IContextOptions = {}): IPlanViewContext {
	const result = ref<IPlanResult>(
		o.result ?? structuredClone(planEmptyResult)
	);
	const calculation = {
		result,
		overviewData: ref({ ...OVERVIEW, ...o.overview }),
		visitationData: ref(VISITATION),
		computedActiveEmpire: ref(o.activeEmpire),
		planEmpires: ref(o.planEmpires ?? []),
		handleUpdateCorpHQ: vi.fn(),
		handleUpdateCOGC: vi.fn(),
		handleUpdatePermits: vi.fn(),
		handleUpdateWorkforceLux: vi.fn(),
		handleUpdateInfrastructure: vi.fn(),
		handleUpdateExpert: vi.fn(),
		handleCreateBuildingAndRecipe: vi.fn(),
		handleUpdateBuildingAmount: vi.fn(),
		handleCreateBuilding: vi.fn(),
		handleUpdateBuildingRecipeAmount: vi.fn(),
		handleAddBuildingRecipes: vi.fn(),
	} as unknown as IPlanCalculation;
	return {
		calculation,
		planData: ref({ uuid: "p-1" }) as IPlanViewContext["planData"],
		planet: planetFixture as Planet,
		readOnly: computed(() => !!o.readOnly),
		shared: false,
		isOwnPlan: computed(() => true),
		empire: {
			uuid: ref(o.activeEmpire?.uuid),
			list: ref(undefined),
			cxUuid: computed(() => undefined),
			profitPerArea: computed(() => o.profitPerArea),
		},
		priceSource: computed(() => o.priceSource),
		sharedCopy: {
			sharedChanges: computed(() => undefined),
			sharedCompare: computed(() => undefined),
		} as unknown as IPlanViewContext["sharedCopy"],
		edits: {
			refRecipeStatus: ref(undefined),
			applyOptimizeHabs: vi.fn(),
			deleteBuilding: vi.fn(),
			deleteBuildingRecipe: vi.fn(),
			changeBuildingRecipe: vi.fn(),
			addPickedRecipe: vi.fn(),
			undoPickedRecipe: vi.fn(),
			applyStarterSetup: vi.fn(),
		} as unknown as IPlanViewContext["edits"],
		io: {} as IPlanViewContext["io"],
		marketChecks: computed(() => new Map()),
		flagCount: computed(() => 0),
		autoOptimizeHabs: ref(o.autoOptimizeHabs ?? true),
		setAutoOptimizeHabs: vi.fn(),
		openInsights: vi.fn(),
		focusElement: vi.fn(),
		layoutEditing: {
			active: ref(!!o.showAll),
			showAll: () => !!o.showAll,
		},
	};
}

/** mountComponent's setup: provides the context to the element */
export const provideContext = (context: IPlanViewContext) => () =>
	void providePlanView(context);
