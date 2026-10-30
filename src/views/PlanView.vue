<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		defineAsyncComponent,
		nextTick,
		onMounted,
		ref,
		type Ref,
		useTemplateRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { useUserStore } from "@/stores/userStore";
	import { usePlanningStore } from "@/stores/planningStore";
	const userStore = useUserStore();
	const planningStore = usePlanningStore();

	// Types & Interfaces
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
	import type { ICalcDebugPlan } from "@/features/planning/calcDebug.types";
	import type { IPlanViewProps } from "@/features/planning/planView.types";
	import type { HabSolverGoal } from "@/features/planning/calculations/habOptimization";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { getPlanet } = usePlanetData();
	import { useCXData } from "@/features/cx/useCXData";
	const { findEmpireCXUuid } = useCXData();
	import { useExchangeData } from "@/database/services/useExchangeData";
	const { getExchangeTickerLoaded } = useExchangeData();
	import { usePlanContext } from "@/features/planning/usePlanContext";
	const { createPrices } = usePlanContext();
	import { countLevels, marketCheck } from "@/features/cx/marketCheck.util";
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { usePlanSave } from "@/features/planning/usePlanSave";
	import { usePlanShortcuts } from "@/features/planning/usePlanShortcuts";
	import { usePlanEdits } from "@/features/planning/usePlanEdits";
	import { usePlanSharedCopy } from "@/features/planning/usePlanSharedCopy";
	import { usePlanLayout } from "@/features/planning/usePlanLayout";
	import { usePlanIO } from "@/features/planning/usePlanIO";
	import { cogcTextMapping } from "@/features/planning_data/usePlan";
	import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { calcDebug } from "@/lib/debugMode";
	import { useEmpireProfits } from "@/features/empire/useEmpireProfits";
	const { cachedProfitPerArea } = useEmpireProfits();

	// Util
	import { inertClone } from "@/util/data";
	import { planetLabel } from "@/util/planetName";
	import {
		breadcrumbEmpire,
		pickEmpire,
		planEmpireUuid,
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
		() => import("@/features/planning/components/debug/PlanCalcDebug.vue")
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
	} from "@/ui";
	import {
		ChevronLeftSharp,
		ChevronRightSharp,
		CloseSharp,
		EditSharp,
		MenuOpenSharp,
		UndoSharp,
		RedoSharp,
	} from "@vicons/material";

	const props = defineProps<IPlanViewProps>();

	const refPlanData: Ref<IPlanDefinition> = ref(inertClone(props.planData));
	const refEmpireList: Ref<PlanEmpireElement[] | undefined> = ref(
		props.empireList
	);
	const refEmpireUuid: Ref<string | undefined> = ref(undefined);
	// the empire's CX, also after its CXs changed (e.g. in another tab)
	const refCXUuid: ComputedRef<string | undefined> = computed(() =>
		findEmpireCXUuid(refEmpireUuid.value)
	);

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
		handleUpdateCorpHQ,
		handleUpdateCOGC,
		handleUpdatePermits,
		handleUpdateWorkforceLux,
		handleUpdateInfrastructure,
		handleUpdateExpert,
		handleUpdateBuildingAmount,
		handleCreateBuilding,
		handleCreateBuildingAndRecipe,
		handleUpdateBuildingRecipeAmount,
		handleAddBuildingRecipes,
		handleChangePlanName,
		traceCalculation,
	} = calculation;

	// what save sends, with the plan's id, empires and version
	const calcDebugPlan = computed((): ICalcDebugPlan => ({
		uuid: refPlanData.value.uuid,
		...backendData.value,
		empires: refPlanData.value.empires,
		modified_at: refPlanData.value.modified_at,
	}));
	const calcDebugMeta = computed(() => ({
		plan: planName.value || t("plan.name.untitled"),
		planet: planetData.planet_natural_id,
		cx: refCXUuid.value
			? (planningStore.cxs[refCXUuid.value]?.cx_name ?? refCXUuid.value)
			: "Universe",
		empire: computedActiveEmpire.value?.empire_name ?? "none",
	}));

	// Material I/O pane: flow, rows, value per day and the CSV
	const {
		refIOSource,
		refIOFilter,
		refIOValue,
		ioRows,
		ioTotals,
		ioSourceOptions,
		ioFilterOptions,
		ioValueOptions,
		downloadMaterialIO,
	} = usePlanIO(result, () => planName.value || planetData.planet_natural_id);

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
	 * Option B: planData has empires in list: the empire the navigation
	 *   shows when the plan is in it (as the breadcrumb), else its first
	 * Option C: empire list => use first element
	 * Fallback: undefined
	 */
	if (!props.empireList) {
		refEmpireUuid.value = undefined;
	} else if (planEmpires.value.length > 0) {
		refEmpireUuid.value = planEmpireUuid(
			props.planData.uuid,
			planEmpires.value,
			Object.values(planningStore.empires),
			userStore.preferences.defaultEmpireUuid
		);
	} else if (props.empireList && props.empireList.length > 0) {
		refEmpireUuid.value = props.empireList[0].uuid;
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

	const flagCount = computed(() => {
		const { red, amber } = countLevels([...marketChecks.value.values()]);
		return red + amber;
	});

	// Plan Saving & Reloading, Save As, conflicts and the leave guard
	const {
		refIsSaving,
		refSaveFailed,
		canSave,
		save,
		refShowSaveAsModal,
		refSaveAsName,
		refSaveAsEmpireUuid,
		refIsSavingAs,
		saveAsEmpireOptions,
		saveAs,
		openSaveAsModal,
		reloadPlan,
		applySavedPlan,
		conflict,
	} = usePlanSave(
		calculation,
		refPlanData,
		{ uuid: refEmpireUuid, list: refEmpireList },
		refAutoOptimizeHabs,
		props
	);

	// Keyboard, tracked undo / redo and calculation debug
	const { refShowCalcDebug, toggleCalcDebug, trackedUndo, trackedRedo } =
		usePlanShortcuts(calculation, props, {
			canSave,
			save,
			openSaveAsModal,
		});

	// Recipe and building edits with undo, starter setup, hab optimizing
	const {
		refRecipeStatus,
		deleteBuilding,
		deleteBuildingRecipe,
		changeBuildingRecipe,
		addPickedRecipe,
		undoPickedRecipe,
		applyStarterSetup,
		applyOptimizeHabs,
	} = usePlanEdits(
		calculation,
		refPlanData,
		refAutoOptimizeHabs,
		trackedUndo,
		planetData.planet_natural_id
	);

	// Shared plan: compared against the shared version, reset and copied
	const {
		sharedChanged,
		sharedCompare,
		sharedChanges,
		sharedPriceSource,
		resetShared,
		copySharedChanges,
	} = usePlanSharedCopy(
		calculation,
		{ uuid: refEmpireUuid, list: refEmpireList, cxUuid: refCXUuid },
		applySavedPlan,
		props
	);

	// Tool tabs, folding, overlays and the phone layout
	const {
		strip,
		stripIcon,
		stripTitle,
		stripDetail,
		refShowTool,
		openPlanCheck,
		toolTabs,
		selectTab,
		compViewToolComponent,
		baseFolded,
		ioFolded,
		refBaseCollapsed,
		foldBase,
		unfoldBase,
		refIOCollapsed,
		foldIO,
		unfoldIO,
		refBaseOverlay,
		refIOOverlay,
		toggleOverlay,
		closeOverlays,
		openTile,
		refIsPhone,
		refPhoneSection,
		showSection,
		phoneSections,
		onPhone,
	} = usePlanLayout(flagCount);

	// Share link: the sharing modal creates, copies and stops the link
	const refShowShare: Ref<boolean> = ref(false);

	const expertCount = computed(() =>
		Object.values(result.value.experts).reduce(
			(sum, e) => sum + e.amount,
			0
		)
	);
	const baseStrip = computed(() =>
		t(
			"plan.layout.base_strip",
			{
				cogc: t(cogcTextMapping[result.value.cogc]),
				n: expertCount.value,
			},
			expertCount.value
		)
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

	// one primary: Save on an own plan, the banner's on a shared copy
	const isOwnPlan: ComputedRef<boolean> = computed(
		() => userStore.isLoggedIn && !props.disabled && !props.shared
	);

	// props change with every recalculation, the component only on a switch
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
						own: isOwnPlan.value,
					},
					listeners: {},
				};
			default:
				return null;
		}
	});

	// breadcrumb: the current empire if it holds the plan, else the first
	const crumbEmpire = computed(() => {
		const empires = Object.values(planningStore.empires);
		return breadcrumbEmpire(
			refPlanData.value.uuid,
			empires,
			pickEmpire(empires, userStore.preferences.defaultEmpireUuid)
		);
	});

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: computed(
			() => planName.value || props.planData.planet_natural_id
		),
	});
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
		padding leaves room below the last rows -->
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

		<!-- Results (sticky); from 48rem its first and last tile carry the
			side padding, so their hover reaches the edges -->
		<div
			class="sticky top-0 z-1000 px-6 max-md:px-4 @min-[48rem]:px-0 bg-(--app-bg) border-y border-line">
			<PlanResultsBar
				:overview="overviewData"
				:area="result.area"
				:visitation="visitationData"
				:workforce="result.workforce"
				:experts="result.experts"
				:revenue="result.revenue"
				:cost="result.cost"
				:empire-profit-per-area="
					refEmpireUuid ? cachedProfitPerArea(refEmpireUuid) : undefined
				"
				:compare="sharedCompare"
				@open="openTile" />
			<!-- a phone: one section at a time -->
			<PlanToolTabs
				v-if="refIsPhone"
				class="-mx-4 px-2 border-t border-line [&>button]:flex-1 [&>button]:justify-center"
				:tabs="phoneSections"
				:active="refPhoneSection"
				:label="t('plan.layout.sections')"
				@toggle="showSection" />
		</div>

		<!-- Set up → build → result, side by side; from 100rem of page width
			Base stays open, from 81rem it starts as a strip; below 81rem
			Base, below 71rem Material I/O too open as overlays from the tab
			row, so Production keeps the width; a phone shows one section -->
		<div
			class="relative flex flex-col md:flex-row md:items-start gap-6 px-6 max-md:px-4 pt-4"
			@keydown.esc="closeOverlays">
			<!-- Base -->
			<button
				v-if="refBaseCollapsed || baseFolded"
				type="button"
				:class="[
					strip,
					refBaseCollapsed
						? 'hidden @min-[81rem]:flex'
						: 'hidden @min-[81rem]:@max-[100rem]:flex',
				]"
				:aria-label="`${t('plan.layout.show_base')}: ${baseStrip}`"
				data-base-strip
				@click="unfoldBase">
				<span :class="stripIcon">
					<PIcon :size="16"><ChevronRightSharp /></PIcon>
				</span>
				<span :class="stripTitle">{{ t("plan.base.label") }}</span>
				<span :class="stripDetail">{{ baseStrip }}</span>
			</button>
			<!-- data-folded: "hand" when the user folded it, "auto" when the
				layout does (Base at mid width, I/O under a wide tool) -->
			<aside
				:aria-label="t('plan.base.label')"
				class="shrink-0 w-full md:w-74 rounded border border-line md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto bg-(--app-bg)"
				:class="[
					refBaseCollapsed
						? '@min-[81rem]:hidden'
						: baseFolded
							? '@min-[81rem]:@max-[100rem]:hidden'
							: '',
					refBaseOverlay
						? 'md:@max-[81rem]:absolute md:@max-[81rem]:left-6 md:@max-[81rem]:top-4 md:@max-[81rem]:z-50 md:@max-[81rem]:shadow-xl md:@max-[81rem]:bg-surface'
						: 'md:@max-[81rem]:hidden',
					onPhone('base') ? '' : 'hidden',
				]"
				:data-folded="
					refBaseCollapsed ? 'hand' : baseFolded ? 'auto' : undefined
				"
				:data-section-hidden="!onPhone('base') || undefined"
				data-base-pane>
				<!-- a phone names Base in its section tabs already -->
				<div class="flex items-center gap-2 px-3 pt-3 pb-1 max-md:hidden">
					<h2 class="flex-1 font-bold text-white">
						{{ t("plan.base.label") }}
					</h2>
					<PButton
						v-if="refBaseOverlay"
						type="ghost"
						size="sm"
						class="hidden md:@max-[81rem]:flex"
						data-base-close
						@click="closeOverlays">
						<template #icon><CloseSharp /></template>
						{{ t("plan.layout.close") }}
					</PButton>
					<!-- side by side (from 81rem) Base folds on request, at any width -->
					<PButton
						type="ghost"
						size="sm"
						class="hidden @min-[81rem]:flex"
						data-base-fold
						:aria-label="t('plan.layout.fold_base')"
						:title="t('plan.layout.fold_base')"
						@click="foldBase">
						<template #icon><ChevronLeftSharp /></template>
					</PButton>
				</div>
				<PlanBase
					ref="base"
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
						(empireUuid: string) => (refEmpireUuid = empireUuid)
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
					class="flex items-start gap-2 border-b border-line">
					<PButton
						type="secondary"
						size="sm"
						class="hidden md:@max-[81rem]:flex shrink-0 mt-2"
						data-base-toggle
						:aria-expanded="refBaseOverlay ? 'true' : 'false'"
						@click="toggleOverlay('base')">
						<template #icon><MenuOpenSharp /></template>
						{{ t("plan.base.label") }}
					</PButton>
					<!-- a narrow row wraps instead of hiding tabs behind I/O;
						Base and I/O stay on its first line -->
					<PlanToolTabs
						class="flex-wrap"
						:tabs="toolTabs"
						:active="refShowTool ?? 'production'"
						:label="t('plan.actions.tools')"
						@toggle="selectTab" />
					<PButton
						type="secondary"
						size="sm"
						class="hidden md:@max-[71rem]:flex shrink-0 ml-auto mt-2"
						data-io-toggle
						:aria-expanded="refIOOverlay ? 'true' : 'false'"
						@click="toggleOverlay('io')">
						<!-- a narrow row says I/O, a screen reader still hears the name -->
						<span class="@max-[64rem]:sr-only">
							{{ t("plan.components.materialio.label") }}
						</span>
						<span class="hidden @max-[64rem]:inline" aria-hidden="true">
							{{ t("plan.layout.io_short") }}
						</span>
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
				v-if="refIOCollapsed || ioFolded"
				type="button"
				:class="strip"
				class="hidden @min-[71rem]:flex"
				:title="t('plan.layout.show_io')"
				data-io-strip
				@click="unfoldIO">
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
				class="shrink-0 w-full md:w-96 @min-[100rem]:w-112 rounded border border-line md:sticky md:top-20 bg-(--app-bg)"
				:class="[
					refIOCollapsed || ioFolded ? '@min-[71rem]:hidden' : '',
					refIOOverlay
						? 'md:@max-[71rem]:absolute md:@max-[71rem]:right-6 md:@max-[71rem]:top-4 md:@max-[71rem]:z-50 md:@max-[71rem]:w-96 md:@max-[71rem]:shadow-xl md:@max-[71rem]:bg-surface'
						: 'md:@max-[71rem]:hidden',
					onPhone('io') ? '' : 'hidden',
				]"
				:data-folded="
					refIOCollapsed ? 'hand' : ioFolded ? 'auto' : undefined
				"
				:data-section-hidden="!onPhone('io') || undefined"
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
						data-io-close
						@click="closeOverlays">
						<template #icon><CloseSharp /></template>
						{{ t("plan.layout.close") }}
					</PButton>
					<PButton
						type="ghost"
						size="sm"
						class="hidden @min-[71rem]:flex"
						data-io-fold
						:aria-label="t('plan.layout.fold_io')"
						:title="t('plan.layout.fold_io')"
						@click="foldIO">
						<template #icon><ChevronRightSharp /></template>
					</PButton>
				</div>
				<div
					class="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 pb-2 [&_button]:px-2 [&_button]:min-w-6">
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
