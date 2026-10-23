<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		defineAsyncComponent,
		nextTick,
		onMounted,
		onUnmounted,
		type PropType,
		ref,
		type Ref,
		useTemplateRef,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// UI
	import type { PToastHandle } from "@/ui/ui.types";

	// Router
	import router from "@/router";

	// Stores
	import { useUserStore } from "@/stores/userStore";
	import { usePlanningStore } from "@/stores/planningStore";
	const userStore = useUserStore();
	const planningStore = usePlanningStore();

	// Types & Interfaces
	import type {
		InfrastructureType,
		Plan,
		PlanCreateData,
	} from "@/features/api/schemas/planningData.schemas";
	import type { IPlanDiffable } from "@/features/planning_data/planDiff";
	import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
	import type { ICalcDebugPlan } from "@/features/planning/calcDebug.types";
	import type { IStarterSetup } from "@/features/plan_analytics/usePlanetInsights.types";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import type {
		IPlanChanges,
		IPlanCompare,
	} from "@/features/sharing/sharedPlan.types";
	import {
		optimizeHabs,
		calculateAvailableArea,
		type HabSolverGoal,
	} from "@/features/planning/calculations/habOptimization";

	import { planetLabel } from "@/util/planetName";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { getPlanet, planetName } = usePlanetData();
	import { useCXData } from "@/features/cx/useCXData";
	const { findEmpireCXUuid } = useCXData();
	import { useExchangeData } from "@/database/services/useExchangeData";
	const { getExchangeTickerLoaded } = useExchangeData();
	import { usePlanContext } from "@/features/planning/usePlanContext";
	const { createPrices } = usePlanContext();
	import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
	const { view: planCheckView } = usePlanCheckView();
	import { countLevels, marketCheck } from "@/features/cx/marketCheck.util";
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { cogcTextMapping, usePlan } from "@/features/planning_data/usePlan";
	import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";
	const {
		createNewPlan,
		saveExistingPlan,
		reloadExistingPlan,
	} = usePlan();
	import { flushPlanEdits, trackEvent } from "@/lib/analytics/useAnalytics";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { remoteChange } from "@/lib/crossTab";
	import { useSaveConflict } from "@/features/save_conflict/useSaveConflict";
	import {
		getSaveError,
		threeWay,
	} from "@/features/save_conflict/saveConflict.util";
	import { diffPlan } from "@/features/planning_data/planDiff";
	import {
		buildChangeSummary,
		buildingChanges,
		planFigures,
	} from "@/features/sharing/sharedPlan.util";
	import config from "@/lib/config";
	import { useEmpireProfits } from "@/features/empire/useEmpireProfits";
	const { cachedProfitPerArea } = useEmpireProfits();

	// Util
	import { inertClone } from "@/util/data";
	import {
		foldedPanes,
		materialIOCsv,
		materialIOTotals,
		type PlanTool,
	} from "@/features/planning/planView.util";
	import {
		breadcrumbEmpire,
		pickEmpire,
	} from "@/layout/components/navigation/navigation.util";

	// Components
	import PlanBase from "@/features/planning/components/PlanBase.vue";
	import PlanProduction from "@/features/planning/components/PlanProduction.vue";
	import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
	import PlanResultsBar from "@/features/planning/components/PlanResultsBar.vue";
	import PlanSaveButton from "@/features/planning/components/PlanSaveButton.vue";
	import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
	import PlanToolTabs from "@/features/planning/components/PlanToolTabs.vue";
	import PlanToolFallback from "@/features/planning/components/PlanToolFallback.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import PlanAnalyticsBox from "@/features/plan_analytics/components/PlanAnalyticsBox.vue";
	import SharedPlanBanner from "@/features/sharing/components/SharedPlanBanner.vue";
	const SaveConflictDialog = defineAsyncComponent(
		() =>
			import("@/features/save_conflict/components/SaveConflictDialog.vue")
	);
	const SharingModal = defineAsyncComponent(
		() => import("@/features/sharing/components/SharingModal.vue")
	);
	// only loaded with calculation debug on
	const PlanCalcDebug = defineAsyncComponent(
		() =>
			import("@/features/planning/components/debug/PlanCalcDebug.vue")
	);

	// UI
	import {
		PButton,
		PButtonGroup,
		PIcon,
		PTooltip,
		PForm,
		PFormItem,
		PInput,
		PModal,
		PSegmented,
		PSelect,
		PValue,
		useToast,
	} from "@/ui";
	import type { PSelectOption } from "@/ui/ui.types";
	const toast = useToast();
	import {
		ChevronLeftSharp,
		ChevronRightSharp,
		CloseSharp,
		EditSharp,
		MenuOpenSharp,
		UndoSharp,
		RedoSharp,
	} from "@vicons/material";
	import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
	import { calcDebug } from "@/lib/debugMode";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: false,
			default: false,
		},
		planData: {
			type: Object as PropType<IPlanDefinition>,
			required: true,
		},
		empireList: {
			type: Array as PropType<PlanEmpireElement[]>,
			required: false,
			default: undefined,
		},
		sharedPlanUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		// a shared plan, edited as the viewer's working copy
		shared: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const refPlanData: Ref<IPlanDefinition> = ref(inertClone(props.planData));
	// save version the edits started from, sent so a save over another
	// tab's newer one fails as a conflict
	const refBaseModifiedAt: Ref<string | undefined> = ref(
		props.planData.modified_at
	);
	const refEmpireList: Ref<PlanEmpireElement[] | undefined> = ref(
		props.empireList
	);
	const refEmpireUuid: Ref<string | undefined> = ref(undefined);
	const refCXUuid: Ref<string | undefined> = ref(undefined);

	const planetData: Planet = await getPlanet(
		props.planData.planet_natural_id
	);

	const calculation = usePlanCalculation(
		refPlanData,
		refEmpireUuid,
		refEmpireList,
		refCXUuid
	);

	const {
		existing,
		saveable,
		modified,
		result,
		planName,
		backendData,
		computedActiveEmpire,
		planEmpires,
		visitationData,
		overviewData,
		savedAt,
		canUndo,
		canRedo,
		undo,
		redo,
		markSaved,
		isRestoring,
		record,
		snapshot,
		savedSnapshot,
		revision,
		handleUpdateCorpHQ,
		handleUpdateCOGC,
		handleUpdatePermits,
		handleUpdateWorkforceLux,
		handleUpdateInfrastructure,
		handleUpdateExpert,
		handleUpdateBuildingAmount,
		handleDeleteBuilding,
		handleCreateBuilding,
		handleCreateBuildingAndRecipe,
		handleUpdateBuildingRecipeAmount,
		handleDeleteBuildingRecipe,
		handleAddBuildingRecipes,
		handleApplyStarterSetup,
		handleChangeBuildingRecipe,
		handleChangePlanName,
		traceCalculation,
	} = calculation;

	/*
	 * Calculation debug (English only by decision): the panel is mounted
	 * only while open, so nothing is traced when it's closed
	 */
	const refShowCalcDebug: Ref<boolean> = ref(false);
	function toggleCalcDebug(source: "button" | "shortcut"): void {
		refShowCalcDebug.value = !refShowCalcDebug.value;
		if (refShowCalcDebug.value) trackEvent("debug:calc_open", { source });
	}
	// what save sends, with the plan's id, empires and version
	const calcDebugPlan = computed(
		(): ICalcDebugPlan => ({
			uuid: refPlanData.value.uuid,
			...backendData.value,
			empires: refPlanData.value.empires,
			modified_at: refPlanData.value.modified_at,
		})
	);
	const calcDebugMeta = computed(() => ({
		plan: planName.value || t("plan.name.untitled"),
		planet: planetData.planet_natural_id,
		cx: refCXUuid.value
			? (planningStore.cxs[refCXUuid.value]?.cx_name ?? refCXUuid.value)
			: "Universe",
		empire: computedActiveEmpire.value?.empire_name ?? "none",
	}));

	/*
	 * Shared plan: the working copy is compared against the shared version,
	 * calculated with the same empire and prices
	 */
	const sharedBaseline: IPlanDefinition = inertClone(props.planData);
	const baselineCalculation = props.shared
		? usePlanCalculation(
				ref(inertClone(sharedBaseline)),
				refEmpireUuid,
				refEmpireList,
				refCXUuid
			)
		: undefined;

	const sharedChanged: ComputedRef<boolean> = computed(
		() => props.shared && modified.value
	);

	const sharedCompare: ComputedRef<IPlanCompare | undefined> = computed(
		() =>
			sharedChanged.value && baselineCalculation
				? {
						before: planFigures(
							baselineCalculation.result.value,
							baselineCalculation.overviewData.value
						),
						after: planFigures(result.value, overviewData.value),
					}
				: undefined
	);

	const sharedChanges: ComputedRef<IPlanChanges | undefined> = computed(
		() =>
			sharedChanged.value
				? buildingChanges(
						JSON.parse(savedSnapshot()),
						JSON.parse(snapshot())
					)
				: undefined
	);

	/*
	 * Material I/O pane: which flow, which rows and which value per day
	 */
	const refIOSource: Ref<"all" | "production" | "workforce"> = ref("all");
	const refIOFilter: Ref<"all" | "exports" | "imports"> = ref("all");
	const refIOValue: Ref<"price" | "weight" | "volume" | "share"> = ref("price");

	const ioRows = computed(() =>
		refIOSource.value === "production"
			? result.value.productionMaterialIO
			: refIOSource.value === "workforce"
				? result.value.workforceMaterialIO
				: result.value.materialio
	);
	const ioTotals = computed(() => materialIOTotals(ioRows.value));

	const ioSourceOptions = computed<PSelectOption[]>(() => [
		{ value: "all", label: t("plan.io.source.all") },
		{ value: "production", label: t("plan.io.source.production") },
		{ value: "workforce", label: t("plan.io.source.workforce") },
	]);
	const ioFilterOptions = computed(() => [
		{ value: "all" as const, label: t("plan.io.filter.all") },
		{ value: "exports" as const, label: t("plan.io.filter.exports") },
		{ value: "imports" as const, label: t("plan.io.filter.imports") },
	]);
	const ioValueOptions = [
		{ value: "price" as const, label: "ȼ" },
		{ value: "weight" as const, label: "t" },
		{ value: "volume" as const, label: "m³" },
		{ value: "share" as const, label: "%" },
	];

	function downloadMaterialIO(): void {
		const blob = new Blob([materialIOCsv(ioRows.value)], {
			type: "text/csv",
		});
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${planName.value || planetData.planet_natural_id}-material-io.csv`;
		link.click();
		URL.revokeObjectURL(link.href);
	}

	// Save As modal state
	const refShowSaveAsModal: Ref<boolean> = ref(false);
	const refSaveAsName: Ref<string> = ref("");
	const refSaveAsEmpireUuid: Ref<string | undefined> = ref(undefined);
	const refIsSavingAs: Ref<boolean> = ref(false);

	// Plan Preferences
	const { autoOptimizeHabs } = usePlanPreferences(() => props.planData.uuid);

	// When the plan hasn't been created, we'll use the local ref which is
	// stored into the plan preferences on plan creation in save(). A shared
	// plan keeps the sharer's habs until the viewer turns it on.
	const refLocalAutoOptimizeHabs: Ref<boolean> = ref(!props.shared);
	const refAutoOptimizeHabs =
		props.planData.uuid === undefined
			? refLocalAutoOptimizeHabs
			: autoOptimizeHabs;

	/**
	 * Handle initial empire uuid assignment
	 *
	 * Option A: no empire list => undefined
	 * Option B: planData has empires in list, use first uuid
	 * Option C: empire list => use first element
	 * Fallback: undefined
	 */
	if (!props.empireList) {
		refEmpireUuid.value = undefined;
	} else if (planEmpires.value.length > 0) {
		refEmpireUuid.value = planEmpires.value[0].uuid;
		// update cx uuid
		refCXUuid.value = findEmpireCXUuid(refEmpireUuid.value);
	} else if (props.empireList && props.empireList.length > 0) {
		refEmpireUuid.value = props.empireList[0].uuid;
		refCXUuid.value = findEmpireCXUuid(refEmpireUuid.value);
	}

	/**
	 * Tool Setup
	 */

	type toolOptions = PlanTool | null;
	const refShowTool: Ref<toolOptions> = ref(null);

	function toggleTool(key: toolOptions): void {
		const isVisisble = refShowTool.value === key;
		refShowTool.value = null;
		if (isVisisble) return;

		trackEvent("plan:tool_toggle", { tool_name: key });
		nextTick(() => {
			key != refShowTool.value
				? (refShowTool.value = key)
				: (refShowTool.value = null);
		});
	}

	// market flags of the plan's net material flow, priced like the plan
	const marketChecks = computed(
		() =>
			new Map(
				marketCheck(
					result.value.materialio,
					createPrices(planetData.planet_natural_id, refCXUuid.value),
					getExchangeTickerLoaded
				).map((c) => [c.ticker, c])
			)
	);

	// from the Material I/O: Plan check on its Market check, in place
	function openPlanCheck(): void {
		planCheckView.value = "market";
		refPhoneSection.value = "tools";
		if (refShowTool.value !== "plan-check") toggleTool("plan-check");
	}

	const flagCount = computed(() => {
		const { red, amber } = countLevels([...marketChecks.value.values()]);
		return red + amber;
	});

	// Production is the default view, a tool replaces it in place
	type TabKey = PlanTool | "production";
	const toolTabs = computed(() =>
		(
			[
				["production", "plan.tools.labels.production"],
				["construction-cart", "plan.tools.labels.construction_cart"],
				["supply-cart", "plan.tools.labels.supply_cart"],
				[
					"visitation-frequency",
					"plan.tools.labels.visitation_frequency",
				],
				["repair-analysis", "plan.tools.labels.repair_analysis"],
				["profit-breakdown", "plan.tools.labels.profit_breakdown"],
				["plan-check", "plan.tools.labels.plan_check"],
				...(userStore.isLoggedIn
					? [["popr", "plan.tools.labels.popr"]]
					: []),
			] as [TabKey, string][]
		).map(([key, label]) => ({
			key,
			label: t(label),
			dot:
				key === "plan-check" && flagCount.value > 0
					? t("plan.layout.flags", { n: flagCount.value }, flagCount.value)
					: undefined,
		}))
	);

	function selectTab(key: TabKey): void {
		if (key === "production") {
			if (refShowTool.value !== null) toggleTool(refShowTool.value);
		} else toggleTool(key);
	}

	/*
	 * Folding: a tool folds Base, wide tools Material I/O too, into a
	 * strip; a strip pins its pane open, over tool switches, until the
	 * user folds it again
	 */
	const refBasePinned: Ref<boolean> = ref(false);
	const refIOPinned: Ref<boolean> = ref(false);
	// a strip: the pane's title read top-down, a detail below it
	const strip =
		"sticky top-20 shrink-0 w-10 flex-col items-center gap-3 py-2 rounded border border-line bg-surface text-muted-strong hover:border-line-strong hover:text-white cursor-pointer transition-colors";
	const stripIcon =
		"flex items-center justify-center size-6 rounded-control bg-hover";
	const stripTitle =
		"[writing-mode:vertical-rl] text-sm font-medium text-ink-strong";
	const stripDetail = "[writing-mode:vertical-rl] text-xs text-muted";
	const folded = computed(() => foldedPanes(refShowTool.value));
	const baseFolded = computed(
		() => folded.value.base && !refBasePinned.value
	);
	const ioFolded = computed(() => folded.value.io && !refIOPinned.value);

	function pinPane(panel: "base" | "io", pinned: boolean): void {
		if (panel === "base") refBasePinned.value = pinned;
		else refIOPinned.value = pinned;
		trackEvent("plan:panel_fold", { panel, folded: !pinned });
	}

	// below 1296 px of page width (a 1360 px window with the rail, 1544 px
	// with the full sidebar) Base opens as an overlay from the tab row
	const refBaseOverlay: Ref<boolean> = ref(false);

	// below 71rem of page width (a tablet) Material I/O does too
	const refIOOverlay: Ref<boolean> = ref(false);

	// Esc closes them, the focus goes back to their button
	function closeOverlays(): void {
		const open = refBaseOverlay.value
			? "[data-base-toggle]"
			: refIOOverlay.value
				? "[data-io-toggle]"
				: undefined;
		refBaseOverlay.value = false;
		refIOOverlay.value = false;
		if (open) document.querySelector<HTMLElement>(open)?.focus();
	}

	/*
	 * A phone (below md, where the app shows its bottom bar): one section
	 * at a time, picked in a tab row under the results
	 */
	const phoneQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(max-width: 767.98px)")
			: null;
	const refIsPhone: Ref<boolean> = ref(phoneQuery?.matches ?? false);
	const onPhoneMedia = (e: MediaQueryListEvent) =>
		(refIsPhone.value = e.matches);
	phoneQuery?.addEventListener("change", onPhoneMedia);
	onUnmounted(() => phoneQuery?.removeEventListener("change", onPhoneMedia));

	type PhoneSection = "production" | "base" | "io" | "tools";
	const refPhoneSection: Ref<PhoneSection> = ref("production");
	const phoneSections = computed(() => [
		{
			key: "production" as const,
			label: t("plan.tools.labels.production"),
		},
		{ key: "base" as const, label: t("plan.base.label") },
		{
			key: "io" as const,
			label: t("plan.components.materialio.label"),
			dot:
				flagCount.value > 0
					? t("plan.layout.flags", { n: flagCount.value }, flagCount.value)
					: undefined,
		},
		{ key: "tools" as const, label: t("plan.layout.tools") },
	]);
	// on a phone only the picked section shows, elsewhere every pane
	const onPhone = (section: PhoneSection): boolean =>
		!refIsPhone.value || refPhoneSection.value === section;

	// the panes' width (the page next to the app navigation): In and Out
	// of Material I/O fit only from 1600 px on, where its pane is 384 px;
	// a phone drops them too
	// (@[100rem]); the CSS breakpoint @[81rem] (1296 px, 1360 px with the
	// rail) folds Base
	const refLayout = useTemplateRef<HTMLElement>("layout");
	const refIOCompact: Ref<boolean> = ref(false);
	let layoutObserver: ResizeObserver | undefined;
	onMounted(() => {
		if (!refLayout.value) return;
		layoutObserver = new ResizeObserver(([entry]) => {
			const width: number = entry.contentRect.width;
			refIOCompact.value = width < 1600;
		});
		layoutObserver.observe(refLayout.value);
	});
	onUnmounted(() => layoutObserver?.disconnect());

	const expertCount = computed(() =>
		Object.values(result.value.experts).reduce((sum, e) => sum + e.amount, 0)
	);
	const baseStrip = computed(() =>
		t("plan.layout.base_strip", {
			cogc: t(cogcTextMapping[result.value.cogc]),
			n: expertCount.value,
		}, expertCount.value)
	);

	// the planet link in Base opens the insights box
	const refInsights = useTemplateRef<{ open: () => void }>("insights");

	/*
	 * Plan name, renamed in place; a new plan starts with naming it
	 */
	const refEditingName: Ref<boolean> = ref(false);
	const refNameDraft: Ref<string> = ref("");
	const refNameInput = useTemplateRef<{ focus: () => void }>("nameInput");

	function startRename(): void {
		refNameDraft.value = planName.value ?? "";
		refEditingName.value = true;
		void nextTick(() => refNameInput.value?.focus());
	}

	function commitRename(): void {
		if (!refEditingName.value) return;
		refEditingName.value = false;
		if (refNameDraft.value !== (planName.value ?? ""))
			handleChangePlanName(refNameDraft.value);
	}

	if (!refPlanData.value.uuid && !props.shared && !props.disabled)
		onMounted(startRename);

	/*
	 * NOTE: This is somewhat hacky to prevent a loaded tool component to re-render on prop change.
	 * As most of the props depend on calculation data they're anyway changing with every change
	 * to the plan. v-memo does not work as it would prevent all tool components from only being
	 * rendered once and not receiving a prop update afterwards.
	 * Splitting the component from its actual data, does work and allows any logic or re-execution
	 * solely being handled in the loaded child component that holds the tool. However, two computed
	 * properties are needed instead of one.
	 */

	const compViewToolComponent = computed(() => {
		switch (refShowTool.value) {
			case "visitation-frequency":
				return defineAsyncComponent(
					() =>
						import("@/features/planning/components/tools/PlanVisitationFrequency.vue")
				);
			case "repair-analysis":
				return defineAsyncComponent(
					() =>
						import("@/features/planning/components/tools/PlanRepairAnalysis.vue")
				);

			case "popr":
				return defineAsyncComponent(
					() =>
						import("@/features/planning/components/tools/PlanPOPR.vue")
				);
			case "supply-cart":
				return defineAsyncComponent(
					() =>
						import("@/features/planning/components/tools/PlanSupplyCart.vue")
				);
			case "construction-cart":
				return defineAsyncComponent(
					() =>
						import("@/features/planning/components/tools/PlanConstructionCart.vue")
				);
			case "profit-breakdown":
				return defineAsyncComponent(
					() =>
						import("@/features/planning/components/tools/PlanProfitBreakdown.vue")
				);
			case "plan-check":
				return defineAsyncComponent(
					() =>
						import("@/features/planning/components/tools/PlanCheck.vue")
				);
			default:
				return null;
		}
	});

	const compViewToolMeta = computed(() => {
		switch (refShowTool.value) {
			case "visitation-frequency":
				return {
					props: {
						storage: result.value.storage,
						materialIO: result.value.materialio,
						disabled: props.disabled,
						planUuid: refPlanData.value.uuid,
					},
					listeners: {},
				};
			case "repair-analysis":
				return {
					props: {
						data: result.value.production.buildings.map((b) => {
							return {
								name: b.name,
								amount: b.amount,
								dailyRevenue: b.dailyRevenue,
								workforceDailyCost: b.workforceDailyCost,
								constructionCost: b.constructionCost,
								constructionMaterials: b.constructionMaterials,
							};
						}),
						cxUuid: refCXUuid.value,
						planetNaturalId: planetData.planet_natural_id,
						shared: props.shared,
					},
					listeners: {},
				};
			case "popr":
				return {
					props: {
						planetNaturalId: planetData.planet_natural_id,
						workforceData: result.value.workforce,
					},
					listeners: {},
				};
			case "supply-cart":
				return {
					props: {
						planetNaturalId: planetData.planet_natural_id,
						materialIO: result.value.materialio,
						workforceMaterialIO: result.value.workforceMaterialIO,
						productionMaterialIO: result.value.productionMaterialIO,
					},
					listeners: {},
				};
			case "construction-cart":
				return {
					props: {
						planetNaturalId: planetData.planet_natural_id,
						planUuid: refPlanData.value.uuid,
						disabled: props.disabled,
						cxUuid: refCXUuid.value,
						constructionData: result.value.constructionMaterials,
						productionBuildingData:
							result.value.production.buildings,
						infrastructureData: result.value.infrastructure,
					},
					listeners: {},
				};
			case "profit-breakdown":
				return {
					props: {
						materialIO: result.value.materialio,
						workforceMaterialIO: result.value.workforceMaterialIO,
						buildings: result.value.production.buildings,
						overview: overviewData.value,
					},
					listeners: {},
				};
			case "plan-check":
				return {
					props: {
						plan: refPlanData.value,
						planUuid: refPlanData.value.uuid,
						empire: computedActiveEmpire.value,
						cxUuid: refCXUuid.value,
						planet: planetData,
					},
					listeners: {},
				};
			default:
				return null;
		}
	});

	/*
	 * Plan Saving & Reloading
	 */

	const refIsSaving: Ref<boolean> = ref(false);
	const refSaveFailed: Ref<boolean> = ref(false);

	function saveFailed(): void {
		// keep modified state, the status offers a retry
		refSaveFailed.value = true;
		toast(t("plan.save_status.failed_message"), { type: "error" });
	}

	async function save(
		trigger: "button" | "shortcut" = "button"
	): Promise<void> {
		// pending plan:edit events belong before the save
		flushPlanEdits();
		refIsSaving.value = true;
		refSaveFailed.value = false;
		// edits made while saving stay unsaved
		const sent: string = snapshot();

		try {
			// plan exists, trigger a save
			if (existing.value) {
				const saved = await saveExistingPlan(
					refPlanData.value.uuid!,
					backendData.value,
					refBaseModifiedAt.value
				);
				if ("error" in saved) {
					const kind = saved.error;
					if (kind === "failed") return saveFailed();
					// after the save settled, the dialog waits on the user
					void nextTick(() => resolveConflict(kind));
					return;
				}

				refBaseModifiedAt.value = saved.modifiedAt;
				markSaved(sent);
				trackEvent("plan:save", {
					planet_natural_id: planetData.planet_natural_id,
					trigger,
				});
			} else {
				// ponytail: from the persisted plan store, so an account
				// whose plans this browser never loaded counts as first
				const isFirstPlan: boolean =
					Object.keys(planningStore.plans).length === 0;
				const created = await createNewPlan(backendData.value);
				if (!created) return saveFailed();

				refPlanData.value.uuid = created.uuid;
				refBaseModifiedAt.value = created.modifiedAt;
				// Persist the auto-optimize-habs preference
				userStore.setPlanPreference(created.uuid, {
					autoOptimizeHabs: refAutoOptimizeHabs.value,
				});

				markSaved(sent);
				trackEvent("plan:create", {
					planet_natural_id: planetData.planet_natural_id,
					is_first_plan: isFirstPlan,
				});
			}

			// A new plan moves to its uuid URL, which remounts this page.
			// Save edits made while creating first, or they'd be lost.
			if (props.planData.uuid === undefined) {
				const planUuid: string = refPlanData.value.uuid!;
				while (modified.value) {
					const again: string = snapshot();
					const saved = await saveExistingPlan(
						planUuid,
						backendData.value,
						refBaseModifiedAt.value
					);
					if ("error" in saved) return saveFailed();
					refBaseModifiedAt.value = saved.modifiedAt;
					markSaved(again);
				}
				router.push(
					`/plan/${planetData.planet_natural_id}/${planUuid}`
				);
			}
		} finally {
			refIsSaving.value = false;
		}
	}

	async function saveAs(): Promise<void> {
		if (!refSaveAsName.value.trim()) return;

		refIsSavingAs.value = true;

		// Create new plan data with the new name and selected empire
		const saveAsData: PlanCreateData = {
			...backendData.value,
			plan_name: refSaveAsName.value.trim(),
			empire_uuid: refSaveAsEmpireUuid.value,
		};

		try {
			const created = await createNewPlan(saveAsData);
			if (!created) return;

			// Persist the auto-optimize-habs preference
			userStore.setPlanPreference(created.uuid, {
				autoOptimizeHabs: refAutoOptimizeHabs.value,
			});

			refShowSaveAsModal.value = false;

			// a shared plan's copy opens in place
			if (props.shared) {
				trackEvent("plan:shared_clone", {
					planet_natural_id: planetData.planet_natural_id,
					shared_uuid: props.sharedPlanUuid!,
					modified: modified.value,
				});
				router.push(
					`/plan/${planetData.planet_natural_id}/${created.uuid}`
				);
				return;
			}

			trackEvent("plan:save_as", {
				planet_natural_id: planetData.planet_natural_id,
			});

			// open new plan in a new tab
			window.open(
				`/plan/${planetData.planet_natural_id}/${created.uuid}`,
				"_blank"
			);
		} finally {
			refIsSavingAs.value = false;
		}
	}

	function openSaveAsModal(): void {
		// Pre-fill with current plan name + " (Copy)"
		refSaveAsName.value = planName.value ? `${planName.value} (Copy)` : "";
		// Pre-fill with current empire
		refSaveAsEmpireUuid.value = refEmpireUuid.value;
		refShowSaveAsModal.value = true;
	}

	// Share link: the sharing modal creates, copies and stops the link
	const refShowShare: Ref<boolean> = ref(false);

	async function reloadPlan(): Promise<void> {
		if (!existing.value || !refPlanData.value.uuid) {
			throw new Error(`Unable to reload plan without uuid.`);
		}
		// reloading throws away unsaved edits
		if (modified.value && !confirm(t("plan.actions.reload_confirm")))
			return;

		applySavedPlan(await reloadExistingPlan(refPlanData.value.uuid));

		trackEvent("plan:reload", {
			planet_natural_id: planetData.planet_natural_id,
		});
	}

	/**
	 * Shows the saved plan, dropping unsaved edits and the history
	 *
	 * @param {IPlanDefinition} plan Saved plan
	 */
	function applySavedPlan(plan: IPlanDefinition): void {
		refPlanData.value = inertClone(plan);
		planName.value = refPlanData.value.plan_name;
		refBaseModifiedAt.value = plan.modified_at;
		refSaveFailed.value = false;
		markSaved();
	}

	/**
	 * Loads the plan as saved in the backend
	 *
	 * @returns {Promise<Plan>} Saved plan
	 */
	function fetchSavedPlan(): Promise<Plan> {
		return useQuery("GetPlan", {
			planUuid: refPlanData.value.uuid!,
		}).execute({ forceRefetch: true });
	}

	/*
	 * Save conflicts: saved or deleted in another tab since this tab loaded
	 * the plan. The dialog lists both sides' changes and lets the user keep
	 * theirs as a new plan, overwrite or reload.
	 */
	const conflict = useSaveConflict();

	async function resolveConflict(
		kind: "conflict" | "deleted"
	): Promise<void> {
		const loaded: IPlanDiffable = JSON.parse(savedSnapshot());
		const mine: IPlanDiffable = JSON.parse(snapshot());

		const choice = await conflict.ask({
			deleted: kind === "deleted",
			options:
				kind === "deleted"
					? ["save_as_new"]
					: ["save_as_new", "overwrite", "reload"],
			loadChanges:
				kind === "deleted"
					? undefined
					: async () =>
							threeWay(
								loaded,
								await fetchSavedPlan(),
								mine,
								diffPlan
							),
		});
		trackEvent("plan:save_conflict", {
			planet_natural_id: planetData.planet_natural_id,
			is_deleted: kind === "deleted",
			choice: choice ?? "close",
		});

		if (choice === "save_as_new") await saveAsNewPlan();
		else if (choice === "overwrite") {
			refBaseModifiedAt.value = undefined;
			await save();
		} else if (choice === "reload") await reloadSavedPlan();
	}

	/**
	 * Drops the edits for the saved plan, a failed load keeps them
	 */
	async function reloadSavedPlan(): Promise<void> {
		try {
			applySavedPlan(await fetchSavedPlan());
		} catch (err) {
			console.error("Reloading the saved plan", err);
		}
	}

	/**
	 * Saves this tab's edits as "<name> (copy)" in the original's empire
	 * and opens it, the original keeps the other tab's version
	 */
	async function saveAsNewPlan(): Promise<void> {
		refIsSaving.value = true;
		try {
			const created = await createNewPlan({
				...backendData.value,
				plan_name: t("save_conflict.copy_name", {
					name: planName.value ?? "",
				}),
				empire_uuid: planEmpires.value[0]?.uuid ?? refEmpireUuid.value,
			});
			if (!created) return saveFailed();

			userStore.setPlanPreference(created.uuid, {
				autoOptimizeHabs: refAutoOptimizeHabs.value,
			});
			// leaving is no loss now
			markSaved();
			router.push(
				`/plan/${planetData.planet_natural_id}/${created.uuid}`
			);
		} finally {
			refIsSaving.value = false;
		}
	}

	/*
	 * Saved or deleted in another tab: without unsaved edits the plan
	 * reloads, with them a notice offers to
	 */
	let remoteToast: PToastHandle | undefined;

	watch(remoteChange, async (change) => {
		const planUuid: string | undefined = refPlanData.value.uuid;
		if (!change || !planUuid || change.uuid !== planUuid) return;

		remoteToast?.destroy();
		try {
			// the other tab's change invalidated it, this refetches
			const plan: Plan = await useQuery("GetPlan", {
				planUuid,
			}).execute();
			if (plan.modified_at === refBaseModifiedAt.value) return;

			trackEvent("app:remote_change", {
				object_type: "plan",
				has_unsaved_edits: modified.value,
				is_deleted: false,
			});
			if (!modified.value) applySavedPlan(plan);
			else
				remoteToast = toast(t("save_conflict.notice.saved_elsewhere"), {
					duration: 15_000,
					action: {
						label: t("save_conflict.notice.reload"),
						onClick: reloadSavedPlan,
					},
				});
		} catch (err) {
			if (getSaveError(err) !== "deleted") return;
			trackEvent("app:remote_change", {
				object_type: "plan",
				has_unsaved_edits: modified.value,
				is_deleted: true,
			});
			remoteToast = toast(t("save_conflict.notice.deleted_elsewhere"), {
				type: "error",
				duration: 15_000,
			});
		}
	});

	/*
	 * Shared plan actions: prices, reset and the change summary
	 */
	const sharedPriceSource: ComputedRef<string> = computed(() => {
		const cxName: string | undefined = refCXUuid.value
			? planningStore.cxs[refCXUuid.value]?.cx_name
			: undefined;
		return cxName
			? t("sharing.banner.price_cx", { name: cxName })
			: t("sharing.banner.price_universe");
	});

	// a logged in viewer prices the copy with their empire's CX, also
	// after logging in on the page (the default empire first)
	if (props.shared) {
		let picked: boolean = false;
		watch(
			[() => props.empireList, () => planningStore.cxs],
			([list]) => {
				if (!list?.length) return;
				refEmpireList.value = list;
				if (
					!picked ||
					!list.some((e) => e.uuid === refEmpireUuid.value)
				) {
					const preferred: string | undefined =
						userStore.preferences.defaultEmpireUuid;
					refEmpireUuid.value = (
						list.find((e) => e.uuid === preferred) ?? list[0]
					).uuid;
					picked = true;
				}
				refCXUuid.value = findEmpireCXUuid(refEmpireUuid.value);
			},
			{ immediate: true, deep: true }
		);
	}

	// breadcrumb: the current empire if it holds the plan, else the first
	const crumbEmpire = computed(() => {
		const empires = Object.values(planningStore.empires);
		return breadcrumbEmpire(
			refPlanData.value.uuid,
			empires,
			pickEmpire(empires, userStore.preferences.defaultEmpireUuid)
		);
	});

	function resetShared(): void {
		applySavedPlan(sharedBaseline);
		trackEvent("plan:shared_reset", {
			planet_natural_id: planetData.planet_natural_id,
		});
	}

	async function copySharedChanges(): Promise<void> {
		const changes = diffPlan(
			JSON.parse(savedSnapshot()),
			JSON.parse(snapshot())
		);
		const text: string = buildChangeSummary(
			{
				name: planName.value || t("plan.name.untitled"),
				planet: planetData.planet_natural_id,
				changes,
				before: sharedCompare.value!.before,
				after: sharedCompare.value!.after,
				priceSource: sharedPriceSource.value,
				url: `${config.SHARE_BASE_URL}/${props.sharedPlanUuid}`,
			},
			t,
			(id) => planetName(id, id)
		);

		try {
			await navigator.clipboard.writeText(text);
			toast(t("sharing.banner.copied"));
			trackEvent("plan:shared_copy_changes", {
				planet_natural_id: planetData.planet_natural_id,
				change_count: changes.length,
			});
		} catch {
			toast(t("sharing.banner.copy_failed"), { type: "error" });
		}
	}

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: computed(
			() => planName.value || props.planData.planet_natural_id
		),
	});

	// Route and Browser Guard: leaving with unsaved changes
	useUnsavedGuard(
		() => modified.value && !props.sharedPlanUuid,
		() => t("plan.notifications.leave_unsaved"),
		() =>
			trackEvent("plan:leave_unsaved", {
				planet_natural_id: planetData.planet_natural_id,
			})
	);

	// one primary: Save on an own plan, the banner's on a shared copy
	const isOwnPlan: ComputedRef<boolean> = computed(
		() => userStore.isLoggedIn && !props.disabled && !props.shared
	);

	// Keyboard: Ctrl/Cmd+S saves, Ctrl/Cmd+Z undoes, +Shift redoes
	const canSave: ComputedRef<boolean> = computed(
		() =>
			userStore.isLoggedIn &&
			!props.disabled &&
			saveable.value &&
			!refIsSaving.value
	);

	function isTextField(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
		);
	}

	function trackedUndo(trigger: "button" | "shortcut"): void {
		if (canUndo.value) trackEvent("plan:undo", { trigger });
		undo();
	}

	function trackedRedo(trigger: "button" | "shortcut"): void {
		if (canRedo.value) trackEvent("plan:redo", { trigger });
		redo();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (!(e.ctrlKey || e.metaKey)) return;
		const key: string = e.key.toLowerCase();

		if (e.code === "Backquote" && calcDebug.value && !isTextField(e.target)) {
			e.preventDefault();
			toggleCalcDebug("shortcut");
		} else if (key === "s") {
			// never open the browser's save dialog on the plan page
			e.preventDefault();
			if (props.shared) {
				if (userStore.isLoggedIn) openSaveAsModal();
			} else if (canSave.value) save("shortcut");
		} else if (key === "z" && !props.disabled && !isTextField(e.target)) {
			e.preventDefault();
			if (e.shiftKey) trackedRedo("shortcut");
			else trackedUndo("shortcut");
		}
	}

	onMounted(() => window.addEventListener("keydown", onKeydown));
	onUnmounted(() => {
		flushPlanEdits();
		window.removeEventListener("keydown", onKeydown);
		// toasts belong to the app, don't let one outlive its plan
		undoToast?.destroy();
		remoteToast?.destroy();
	});

	// Deleting or changing a recipe shows a toast to take it back. Any later
	// change to the history (edit, undo, redo, save) closes it, so its Undo
	// only ever undoes the edit it announced.
	let undoToast: PToastHandle | undefined;

	// a picked recipe: a status line under its row, with Undo
	const refRecipeStatus: Ref<
		{ building: number; recipe: number; text: string } | undefined
	> = ref(undefined);

	watch(
		revision,
		() => {
			undoToast?.destroy();
			undoToast = undefined;
			refRecipeStatus.value = undefined;
		},
		// before the next toast opens in the same call
		{ flush: "sync" }
	);

	function toastUndo(text: string): void {
		undoToast?.destroy();
		undoToast = toast(text, {
			action: {
				label: t("plan.history.undo"),
				onClick: () => trackedUndo("button"),
			},
		});
	}

	function deleteBuilding(index: number): void {
		handleDeleteBuilding(index);
		toastUndo(t("plan.history.building_removed"));
	}

	function deleteBuildingRecipe(
		buildingIndex: number,
		recipeIndex: number
	): void {
		handleDeleteBuildingRecipe(buildingIndex, recipeIndex);
		toastUndo(t("plan.history.recipe_removed"));
	}

	// "12 ALG": a recipe by its first output, per run
	function recipeLabel(buildingIndex: number, recipeId: string): string {
		const output = result.value.production.buildings[
			buildingIndex
		]?.recipeOptions.find((r) => r.recipe_id === recipeId)?.outputs[0];
		return output
			? `${output.material_amount} ${output.material_ticker}`
			: recipeId;
	}

	function changeBuildingRecipe(
		buildingIndex: number,
		recipeIndex: number,
		recipeId: string
	): void {
		const building = refPlanData.value.plan_data.buildings[buildingIndex];
		// picking the recipe it already has changes nothing, and Undo would
		// take back the edit before it
		const before: string | undefined =
			building?.active_recipes[recipeIndex]?.recipeid;
		if (before === recipeId) return;

		handleChangeBuildingRecipe(buildingIndex, recipeIndex, recipeId);
		refRecipeStatus.value = {
			building: buildingIndex,
			recipe: recipeIndex,
			text: t("plan.picker.replaced", {
				before: before ? recipeLabel(buildingIndex, before) : "",
				after: recipeLabel(buildingIndex, recipeId),
			}),
		};
	}

	function addPickedRecipe(buildingIndex: number, recipeId: string): void {
		handleAddBuildingRecipes(buildingIndex, [
			{ recipeid: recipeId, amount: 1 },
		]);
		refRecipeStatus.value = {
			building: buildingIndex,
			recipe:
				refPlanData.value.plan_data.buildings[buildingIndex]
					.active_recipes.length - 1,
			text: t("plan.picker.added", {
				recipe: recipeLabel(buildingIndex, recipeId),
			}),
		};
	}

	function undoPickedRecipe(): void {
		trackEvent("plan:recipe_picker_undo");
		trackedUndo("button");
	}

	// One undo step: the setup and the habs for its workforce. Auto-optimise
	// is a preference, not plan data, so undo leaves it on.
	const addStarterSetup = record(async (setup: IStarterSetup) => {
		refAutoOptimizeHabs.value = true;
		await handleApplyStarterSetup(setup);
		applyOptimizeHabs("auto", false);
	});

	async function applyStarterSetup(
		setup: IStarterSetup,
		isSelectionChanged: boolean
	): Promise<void> {
		await addStarterSetup(setup);
		toastUndo(
			t(
				"plan.tools.plan_starter.applied",
				{ n: setup.buildings.length },
				setup.buildings.length
			)
		);
		trackEvent("plan:starter_apply", {
			planet_natural_id: planetData.planet_natural_id,
			building_count: setup.buildings.length,
			expert_count: setup.experts.reduce((sum, e) => sum + e.amount, 0),
			is_selection_changed: isSelectionChanged,
		});
	}

	// Auto Optimize Habitation on Workforce Change
	const availableHabArea: ComputedRef<number> = computed(() => {
		return calculateAvailableArea(
			result.value.area.areaTotal,
			result.value.area.areaUsed,
			result.value.infrastructure
		);
	});

	// Save As empire options
	const saveAsEmpireOptions: ComputedRef<PSelectOption[]> = computed(() => {
		if (!refEmpireList.value) return [];
		return refEmpireList.value.map((e) => ({
			label: e.empire_name,
			value: e.uuid,
		}));
	});

	function applyOptimizeHabs(goal: HabSolverGoal, force: boolean) {
		// skip, if autooptimization is deactivated and not forced,
		// forcing only happens from the button clicks in configuration

		if (!refAutoOptimizeHabs.value && !force) return;

		trackEvent("plan:hab_optimize", { goal });

		const solution = optimizeHabs(
			goal,
			result.value.infrastructureCosts,
			result.value.workforce,
			availableHabArea.value
		);

		if (solution.status === "optimal") {
			for (const [hab, count] of solution.variables) {
				const habType = hab as InfrastructureType;
				// Don't update the plan if nothing changed
				if (result.value.infrastructure[habType] === count) continue;
				handleUpdateInfrastructure(habType, count);
			}
		} else {
			console.error(`Unable to optimize habs: ${solution.status}`);
		}
	}

	watch(
		[
			() => result.value.workforce.pioneer.required,
			() => result.value.workforce.settler.required,
			() => result.value.workforce.technician.required,
			() => result.value.workforce.engineer.required,
			() => result.value.workforce.scientist.required,
			() => result.value.infrastructureCosts,
		],
		() => {
			// undo/redo restore a snapshot as it was
			if (isRestoring()) return;
			applyOptimizeHabs("auto", false);
		}
	);
</script>

<template>
	<PlanAnalyticsBox
		ref="insights"
		:key="`INSIGHTS#${planetData.planet_natural_id}`"
		:planet-natural-id="planetData.planet_natural_id" />
	<SharedPlanBanner
		v-if="shared"
		:changed="sharedChanged"
		:price-source="sharedPriceSource"
		@reset="resetShared"
		@copy="copySharedChanges"
		@save="openSaveAsModal" />
	<!-- keep focused controls clear of the sticky results bar; the bottom
		padding scrolls the last rows clear of the insights button -->
	<!-- @container: the panes lay out by the width next to the app
		navigation, so an expanded sidebar makes Base an overlay -->
	<!-- a phone keeps the last rows clear of the Save bar and the app's
		bottom bar as well -->
	<div
		ref="layout"
		class="@container pb-16 max-md:pb-36 [&_*]:scroll-mt-24">
		<!-- Header: name, history, save state and the plan's actions -->
		<header
			class="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 max-md:px-4 py-3">
			<div class="flex-1 min-w-0 basis-60">
				<nav
					:aria-label="t('plan.breadcrumb')"
					class="flex items-center gap-1.5 text-xs text-muted-strong">
					<template v-if="crumbEmpire">
						<RouterLink
							to="/empire"
							class="inline-flex items-center min-h-6 pointer-coarse:min-h-11 min-w-0 truncate hover:text-ink hover:underline">
							{{ crumbEmpire.empire_name }}
						</RouterLink>
						<span aria-hidden="true">›</span>
					</template>
					<span class="truncate">
						{{
							planetLabel(
								planetData.planet_natural_id,
								planetData.planet_name
							)
						}}
					</span>
				</nav>
				<div class="flex items-center gap-1.5 min-w-0">
					<div
						v-if="refEditingName"
						class="max-w-96 w-full"
						@focusout="commitRename"
						@keydown.enter="commitRename"
						@keydown.esc="refEditingName = false">
						<PInput
							ref="nameInput"
							v-model:value="refNameDraft"
							class="w-full"
							:aria-label="t('plan.header.name')"
							:placeholder="
								existing
									? t('plan.save_status.name_to_save')
									: t('plan.save_status.name_to_create')
							" />
					</div>
					<template v-else>
						<h1 class="text-2xl font-bold text-white truncate">
							{{ planName || t("plan.name.untitled") }}
						</h1>
						<PButton
							v-if="!disabled"
							type="ghost"
							size="sm"
							:aria-label="t('plan.header.rename')"
							@click="startRename">
							<template #icon><EditSharp /></template>
						</PButton>
					</template>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<PButtonGroup v-if="!disabled">
					<PTooltip placement="bottom">
						<template #trigger>
							<PButton
								:aria-label="t('plan.history.undo')"
								type="ghost"
								:disabled="!canUndo"
								@click="trackedUndo('button')">
								<template #icon><UndoSharp /></template>
							</PButton>
						</template>
						{{ t("plan.history.undo_key") }}
					</PTooltip>
					<PTooltip placement="bottom">
						<template #trigger>
							<PButton
								:aria-label="t('plan.history.redo')"
								type="ghost"
								:disabled="!canRedo"
								@click="trackedRedo('button')">
								<template #icon><RedoSharp /></template>
							</PButton>
						</template>
						{{ t("plan.history.redo_key") }}
					</PTooltip>
				</PButtonGroup>
				<!-- a phone saves from the bar above the app's bottom bar -->
				<PlanSaveButton
					v-if="isOwnPlan && !refIsPhone"
					:existing="existing"
					:saveable="saveable"
					:saving="refIsSaving"
					:failed="refSaveFailed"
					:modified="modified"
					:saved-at="savedAt"
					@save="save()" />
				<template v-if="isOwnPlan && refPlanData.uuid">
					<PButton type="secondary" @click="refShowShare = true">
						{{ t("plan.actions.share_link") }}
					</PButton>
					<SharingModal
						v-model:show="refShowShare"
						:plan-uuid="refPlanData.uuid" />
				</template>
				<PlanMoreMenu
					:existing="existing"
					:own="isOwnPlan"
					:debug="calcDebug"
					@save-as="openSaveAsModal"
					@reload="reloadPlan"
					@csv="downloadMaterialIO"
					@debug="toggleCalcDebug('button')" />
				<HelpDrawer file-name="plan" />
			</div>
		</header>

		<!-- Results (sticky) -->
		<div
			class="sticky top-0 z-1000 px-6 max-md:px-4 bg-(--app-bg) border-y border-line">
			<PlanResultsBar
				:overview="overviewData"
				:area="result.area"
				:visitation="visitationData"
				:revenue="result.revenue"
				:cost="result.cost"
				:empire-profit-per-area="
					refEmpireUuid ? cachedProfitPerArea(refEmpireUuid) : undefined
				"
				:compare="sharedCompare" />
			<!-- a phone: one section at a time -->
			<PlanToolTabs
				v-if="refIsPhone"
				class="-mx-4 px-2 border-t border-line [&>button]:flex-1 [&>button]:justify-center"
				:tabs="phoneSections"
				:active="refPhoneSection"
				:label="t('plan.layout.sections')"
				@toggle="(key: PhoneSection) => (refPhoneSection = key)" />
		</div>

		<!-- Set up → build → result, side by side; below 81rem of page width
			Base, below 71rem Material I/O too open as overlays from the tab
			row, so Production keeps the width; a phone shows one section -->
		<div
			class="relative flex flex-col md:flex-row md:items-start gap-6 px-6 max-md:px-4 pt-4"
			@keydown.esc="closeOverlays">
			<!-- Base -->
			<button
				v-if="baseFolded"
				type="button"
				:class="strip"
				class="hidden @min-[81rem]:flex"
				:aria-label="`${t('plan.layout.show_base')}: ${baseStrip}`"
				data-base-strip
				@click="pinPane('base', true)">
				<span :class="stripIcon">
					<PIcon :size="16"><ChevronRightSharp /></PIcon>
				</span>
				<span :class="stripTitle">{{ t("plan.base.label") }}</span>
				<span :class="stripDetail">{{ baseStrip }}</span>
			</button>
			<aside
				:aria-label="t('plan.base.label')"
				class="shrink-0 w-full md:w-74 rounded border border-line md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto bg-(--app-bg) [scrollbar-width:thin]"
				:class="[
					baseFolded ? '@min-[81rem]:hidden' : '',
					refBaseOverlay
						? 'md:@max-[81rem]:absolute md:@max-[81rem]:left-6 md:@max-[81rem]:top-4 md:@max-[81rem]:z-50 md:@max-[81rem]:shadow-xl md:@max-[81rem]:bg-surface'
						: 'md:@max-[81rem]:hidden',
					onPhone('base') ? '' : 'hidden',
				]"
				data-base-pane>
				<div class="flex items-center gap-2 px-3 pt-3 pb-1">
					<h2 class="flex-1 font-bold text-white">
						{{ t("plan.base.label") }}
					</h2>
					<PButton
						v-if="refBaseOverlay"
						type="ghost"
						size="sm"
						class="hidden md:@max-[81rem]:flex"
						@click="closeOverlays">
						<template #icon><CloseSharp /></template>
						{{ t("plan.layout.close") }}
					</PButton>
					<PButton
						v-if="folded.base && refBasePinned"
						type="ghost"
						size="sm"
						class="hidden @min-[81rem]:flex"
						@click="pinPane('base', false)">
						{{ t("plan.layout.fold") }}
					</PButton>
				</div>
				<PlanBase
					:disabled="disabled"
					:result="result"
					:planet="planetData"
					:auto-optimize-habs="refAutoOptimizeHabs"
					:empire-options="refEmpireList"
					:active-empire="computedActiveEmpire"
					:plan-empires="planEmpires"
					:cx-uuid="refCXUuid"
					:price-source="
						shared && !refEmpireList?.length
							? sharedPriceSource
							: undefined
					"
					@update:active-empire="
						(empireUuid: string) => {
							refEmpireUuid = empireUuid;
							refCXUuid = findEmpireCXUuid(empireUuid);
						}
					"
					@update:permits="handleUpdatePermits"
					@update:corphq="handleUpdateCorpHQ"
					@update:cogc="handleUpdateCOGC"
					@update:lux="handleUpdateWorkforceLux"
					@update:infrastructure="handleUpdateInfrastructure"
					@update:auto-optimize-habs="
						(v: boolean, goal: HabSolverGoal) => {
							refAutoOptimizeHabs = v;
							trackEvent('plan:hab_auto_toggle', {
								is_active: v,
							});
							applyOptimizeHabs(goal, false);
						}
					"
					@optimize-habs="
						(goal: HabSolverGoal) => applyOptimizeHabs(goal, true)
					"
					@update:expert="handleUpdateExpert"
					@create:building:recipe="handleCreateBuildingAndRecipe"
					@open:insights="refInsights?.open()" />
			</aside>

			<!-- Production, or a tool in its place -->
			<main
				v-show="onPhone('production') || onPhone('tools')"
				class="flex-1 min-w-0 w-full">
				<div
					v-if="!refIsPhone"
					class="flex items-center gap-2 border-b border-line">
					<PButton
						type="secondary"
						size="sm"
						class="hidden md:@max-[81rem]:flex shrink-0"
						data-base-toggle
						:aria-expanded="refBaseOverlay ? 'true' : 'false'"
						@click="refBaseOverlay = !refBaseOverlay">
						<template #icon><MenuOpenSharp /></template>
						{{ t("plan.base.label") }}
					</PButton>
					<PlanToolTabs
						:tabs="toolTabs"
						:active="refShowTool ?? 'production'"
						:label="t('plan.actions.tools')"
						@toggle="selectTab" />
					<PButton
						type="secondary"
						size="sm"
						class="hidden md:@max-[71rem]:flex shrink-0 ml-auto"
						data-io-toggle
						:aria-expanded="refIOOverlay ? 'true' : 'false'"
						@click="refIOOverlay = !refIOOverlay">
						{{ t("plan.components.materialio.label") }}
						<span
							v-if="flagCount > 0"
							role="img"
							:aria-label="
								t('plan.layout.flags', { n: flagCount }, flagCount)
							"
							class="size-1.5 ml-1.5 rounded-full bg-warning" />
					</PButton>
				</div>
				<!-- a phone's Tools section: the tools as a list -->
				<nav
					v-if="refIsPhone && refPhoneSection === 'tools' && !refShowTool"
					:aria-label="t('plan.actions.tools')"
					class="rounded border border-line divide-y divide-line"
					data-phone-tools>
					<button
						v-for="tool in toolTabs.filter((x) => x.key !== 'production')"
						:key="tool.key"
						type="button"
						class="flex items-center gap-3 w-full min-h-14 px-3.5 text-left cursor-pointer hover:bg-hover"
						@click="selectTab(tool.key)">
						<span class="flex-1 min-w-0">
							<span class="flex items-center gap-1.5 font-medium text-ink-strong">
								{{ tool.label }}
								<span
									v-if="tool.dot"
									role="img"
									:aria-label="tool.dot"
									class="size-1.5 rounded-full bg-warning" />
							</span>
							<span class="block text-xs text-muted">
								{{ t(`plan.tools.descriptions.${tool.key}`) }}
							</span>
						</span>
						<PIcon :size="16" class="text-muted">
							<ChevronRightSharp />
						</PIcon>
					</button>
				</nav>
				<!-- kept mounted under a tool: its folds, filters and the
					starter card's state survive -->
				<div
					v-show="refIsPhone ? refPhoneSection === 'production' : !refShowTool"
					data-production>
				<PlanProduction
					:disabled="disabled"
					:production-data="result.production"
					:planet-resources="planetData.resources"
					:cogc="result.cogc"
					:cx-uuid="refCXUuid"
					:planet-id="planetData.planet_natural_id"
					:changes="sharedChanges"
					:material-i-o="result.materialio"
					:experts="result.experts"
					:status="refRecipeStatus"
					@update:building:amount="handleUpdateBuildingAmount"
					@delete:building="deleteBuilding"
					@create:building="handleCreateBuilding"
					@update:building:recipe:amount="
						handleUpdateBuildingRecipeAmount
					"
					@delete:building:recipe="deleteBuildingRecipe"
					@add:building:recipes="handleAddBuildingRecipes"
					@apply:starter="applyStarterSetup"
					@update:building:recipe="changeBuildingRecipe"
					@pick:building:recipe="addPickedRecipe"
					@undo="undoPickedRecipe" />
				</div>
				<div
					v-if="refShowTool && onPhone('tools')"
					class="py-3"
					data-tool>
					<PButton
						v-if="refIsPhone"
						type="ghost"
						size="sm"
						class="mb-2"
						@click="selectTab('production')">
						<template #icon><ChevronLeftSharp /></template>
						{{ t("plan.layout.all_tools") }}
					</PButton>
					<Suspense :timeout="200">
						<template #default>
							<component
								:is="compViewToolComponent"
								v-bind="compViewToolMeta?.props"
								v-on="compViewToolMeta?.listeners ?? {}" />
						</template>
						<template #fallback>
							<PlanToolFallback />
						</template>
					</Suspense>
				</div>
			</main>

			<!-- Material I/O -->
			<button
				v-if="ioFolded"
				type="button"
				:class="strip"
				class="hidden @min-[71rem]:flex"
				:title="t('plan.layout.show_io')"
				data-io-strip
				@click="pinPane('io', true)">
				<span :class="stripIcon">
					<PIcon :size="16"><ChevronLeftSharp /></PIcon>
				</span>
				<span :class="stripTitle">
					{{ t("plan.components.materialio.label") }}
				</span>
				<span
					v-if="flagCount > 0"
					class="[writing-mode:vertical-rl] px-0.5 py-1.5 rounded-full bg-warning/15 text-xs font-medium text-warning">
					{{ t("plan.layout.flags", { n: flagCount }, flagCount) }}
				</span>
			</button>
			<aside
				:aria-label="t('plan.components.materialio.label')"
				class="shrink-0 w-full md:w-75 @min-[81rem]:w-85 @min-[100rem]:w-96 rounded border border-line md:sticky md:top-20 bg-(--app-bg)"
				:class="[
					ioFolded ? '@min-[71rem]:hidden' : '',
					refIOOverlay
						? 'md:@max-[71rem]:absolute md:@max-[71rem]:right-6 md:@max-[71rem]:top-4 md:@max-[71rem]:z-50 md:@max-[71rem]:w-85 md:@max-[71rem]:shadow-xl md:@max-[71rem]:bg-surface'
						: 'md:@max-[71rem]:hidden',
					onPhone('io') ? '' : 'hidden',
				]"
				data-io-pane>
				<div class="flex items-center gap-2 px-3 pt-3 pb-2">
					<h2 class="flex-1 font-bold text-white">
						{{ t("plan.components.materialio.label") }}
					</h2>
					<PSelect
						v-model:value="refIOSource"
						size="sm"
						class="w-36"
						:aria-label="t('plan.io.source.label')"
						:options="ioSourceOptions" />
					<PButton
						v-if="refIOOverlay"
						type="ghost"
						size="sm"
						class="hidden md:@max-[71rem]:flex"
						@click="closeOverlays">
						<template #icon><CloseSharp /></template>
						{{ t("plan.layout.close") }}
					</PButton>
					<PButton
						v-if="folded.io && refIOPinned"
						type="ghost"
						size="sm"
						@click="pinPane('io', false)">
						{{ t("plan.layout.fold") }}
					</PButton>
				</div>
				<div
					class="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 pb-2 [&_button]:px-2">
					<PSegmented
						v-model:value="refIOFilter"
						size="sm"
						:options="ioFilterOptions"
						:label="t('plan.io.filter.label')" />
					<PSegmented
						v-model:value="refIOValue"
						size="sm"
						:options="ioValueOptions"
						:label="t('plan.io.value.label')" />
				</div>
				<PlanMaterialIO
					:material-i-o-data="ioRows"
					:compact="refIOCompact"
					max-height="calc(100dvh - 20rem)"
					:value="refIOValue"
					:filter="refIOFilter"
					:checks="refIOSource === 'all' ? marketChecks : undefined"
					:market="marketChecks"
					@open:plan-check="openPlanCheck" />
				<dl
					class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-3 py-2 border-t border-line text-sm tabular-nums">
					<dt class="text-muted-strong">{{ t("plan.io.exports") }}</dt>
					<dd class="text-right">
						<PValue :value="ioTotals.exports" />
					</dd>
					<dt class="text-muted-strong">{{ t("plan.io.imports") }}</dt>
					<dd class="text-right">
						<PValue :value="ioTotals.imports" />
					</dd>
					<template v-if="refIOSource === 'all'">
						<dt class="text-muted-strong">
							{{ t("plan.io.degradation") }}
						</dt>
						<dd class="text-right">
							<PValue :value="-overviewData.dailyDegradationCost" />
						</dd>
						<dt class="font-medium text-ink-strong">
							{{ t("plan.io.profit") }}
						</dt>
						<dd class="text-right font-medium">
							<PValue :value="overviewData.profit" />
						</dd>
					</template>
				</dl>
			</aside>
		</div>
		<!-- a phone: save from a bar above the app's bottom bar, shown while
			there is something to save -->
		<div
			v-if="refIsPhone && isOwnPlan && (modified || refIsSaving || refSaveFailed)"
			class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-1000 px-4 py-2 border-t border-line bg-surface [&>div]:w-full [&>div]:justify-between"
			data-phone-save>
			<PlanSaveButton
				:existing="existing"
				:saveable="saveable"
				:saving="refIsSaving"
				:failed="refSaveFailed"
				:modified="modified"
				:saved-at="savedAt"
				@save="save()" />
		</div>
		<PlanCalcDebug
			v-if="calcDebug && refShowCalcDebug"
			v-model:show="refShowCalcDebug"
			:trace-calculation="traceCalculation"
			:result="result"
			:overview="overviewData"
			:meta="calcDebugMeta"
			:plan="calcDebugPlan"
			:modified="modified" />
	</div>

	<!-- Save As Modal -->
	<SaveConflictDialog v-if="conflict.show.value" :conflict="conflict" />
	<PModal
		v-model:show="refShowSaveAsModal"
		:width="480"
		:title="
			shared
				? t('sharing.banner.save')
				: t('plan.components.save_as.title')
		">
		<PForm>
			<PFormItem :label="t('plan.components.save_as.form.plan_name')">
				<PInput
					v-model:value="refSaveAsName"
					class="w-full"
					:placeholder="
						t('plan.components.save_as.form.plan_name_placeholder')
					" />
			</PFormItem>
			<PFormItem
				v-if="saveAsEmpireOptions.length > 0"
				:label="t('plan.components.save_as.form.empire')">
				<PSelect
					v-model:value="refSaveAsEmpireUuid"
					class="w-full"
					:options="saveAsEmpireOptions" />
			</PFormItem>
		</PForm>
		<template #action>
			<div class="flex justify-end gap-3">
				<PButton type="secondary" @click="refShowSaveAsModal = false">
					{{ $t("common.buttons.cancel") }}
				</PButton>
				<PButton
					:loading="refIsSavingAs"
					:disabled="!refSaveAsName.trim()"
					type="primary"
					@click="saveAs">
					{{ $t("common.buttons.create") }}
				</PButton>
			</div>
		</template>
	</PModal>
</template>
