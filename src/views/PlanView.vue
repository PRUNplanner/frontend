<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		defineAsyncComponent,
		nextTick,
		onMounted,
		onUnmounted,
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
	import type { PlanVersionListItem } from "@/features/api/schemas/planningData.schemas";
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
	import type { ICalcDebugPlan } from "@/features/planning/calcDebug.types";
	import type { IPlanViewProps } from "@/features/planning/planView.types";
	import type { HabSolverGoal } from "@/features/planning/calculations/habOptimization";
	import type { LayoutChoice } from "@/features/planning/layout/planLayout.schemas";
	import type { ElementId } from "@/features/planning/layout/planLayout.types";

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
	import { usePlanVersionPreview } from "@/features/planning/usePlanVersionPreview";
	import { usePlanVersions } from "@/features/planning/usePlanVersions";
	import { usePlanShortcuts } from "@/features/planning/usePlanShortcuts";
	import { usePlanEdits } from "@/features/planning/usePlanEdits";
	import { usePlanSharedCopy } from "@/features/planning/usePlanSharedCopy";
	import { usePlanIO } from "@/features/planning/usePlanIO";
	import { providePlanView } from "@/features/planning/usePlanView";
	import { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
	import { usePlanGrid } from "@/features/planning/layout/usePlanGrid";
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
	import PlanSaveControl from "@/features/planning/components/PlanSaveControl.vue";
	import PlanVersionPreviewBanner from "@/features/planning/components/PlanVersionPreviewBanner.vue";
	import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
	import PlanGrid from "@/features/planning/components/layout/PlanGrid.vue";
	import PlanLayoutMenu from "@/features/planning/components/layout/PlanLayoutMenu.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import PlanAnalyticsBox from "@/features/plan_analytics/components/PlanAnalyticsBox.vue";
	import SharedPlanBanner from "@/features/sharing/components/SharedPlanBanner.vue";
	import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";
	import { elementView } from "@/features/planning/layout/elementComponents";
	import { ELEMENTS } from "@/features/planning/layout/elements";
	const PlanLayoutEditor = defineAsyncComponent(
		() =>
			import("@/features/planning/components/layout/PlanLayoutEditor.vue")
	);
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
		PForm,
		PFormItem,
		PInput,
		PModal,
		PSelect,
		PTooltip,
	} from "@/ui";
	import { ChangeCircleOutlined, EditSharp } from "@vicons/material";

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
		overviewData,
		savedAt,
		canUndo,
		canRedo,
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
	const planIO = usePlanIO(
		result,
		() => planName.value || planetData.planet_natural_id
	);
	const { downloadMaterialIO } = planIO;

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

	// An older version previewed read-only, restored into the edits
	const preview = usePlanVersionPreview(
		calculation,
		() => refPlanData.value.uuid
	);
	const { refPreview, previewing, refRestoredFrom } = preview;
	// nothing can be edited: a read-only plan or a version preview
	const readOnly: ComputedRef<boolean> = computed(
		() => !!props.disabled || previewing.value
	);

	// Plan Saving & Reloading, Save As, conflicts and the leave guard
	const {
		refIsSaving,
		refSaveFailed,
		refFailedName,
		canSave,
		save,
		refShowSaveAsModal,
		refSaveAsName,
		refSaveAsEmpireUuid,
		refIsSavingAs,
		saveAsEmpireOptions,
		saveAs,
		openSaveAsModal,
		discardChanges,
		reloadPlan,
		applySavedPlan,
		activateVersion,
		conflict,
		draftPossible,
		draftSavedAt,
		draftResumed,
		draftFailed,
		retryDraft,
		flushDraft,
	} = usePlanSave(
		calculation,
		refPlanData,
		{ uuid: refEmpireUuid, list: refEmpireList },
		refAutoOptimizeHabs,
		props,
		preview
	);

	// the plan's saved versions, for the save control
	const {
		refVersions,
		load: loadVersions,
		rename: renameVersion,
		remove: removeVersion,
	} = usePlanVersions(
		() => refPlanData.value.uuid,
		() => draftPossible.value
	);
	onMounted(() => void loadVersions());

	/**
	 * Makes a version active from the list or the preview banner
	 *
	 * @param {PlanVersionListItem} version Version
	 * @param {"list" | "preview"} from Where
	 */
	async function makeVersionActive(
		version: PlanVersionListItem,
		from: "list" | "preview"
	): Promise<void> {
		// a stale list: it's gone
		if (!(await activateVersion(version, from))) void loadVersions(true);
	}

	function findVersion(versionUuid: string): PlanVersionListItem | undefined {
		return refVersions.value.find((v) => v.uuid === versionUuid);
	}

	// the save control's menu (name a version), also from the keyboard
	const refShowSaveMenu: Ref<boolean> = ref(false);

	// Keyboard, tracked undo / redo and calculation debug
	const { refShowCalcDebug, toggleCalcDebug, trackedUndo, trackedRedo } =
		usePlanShortcuts(calculation, props, {
			canSave,
			save,
			openSaveAsModal,
			openSaveMenu: () => (refShowSaveMenu.value = true),
			readOnly: () => readOnly.value,
			// while customising, Ctrl/Cmd+Z undoes the last layout change
			undoLayout: () =>
				refEditingLayout.value
					? (refEditor.value?.undo("keys"), true)
					: false,
		});

	// Recipe and building edits with undo, starter setup, hab optimizing
	const planEdits = usePlanEdits(
		calculation,
		refPlanData,
		refAutoOptimizeHabs,
		trackedUndo,
		planetData.planet_natural_id
	);
	const { applyOptimizeHabs } = planEdits;

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

	// The layout: a preset or Custom Layout, kept for this tab
	const layoutPref = usePlanLayoutPreference();
	const grid = usePlanGrid(layoutPref, () => userStore.isLoggedIn);
	// customise mode, and the elements it shows as on the page (the rest
	// show all they can hide)
	const refEditingLayout: Ref<boolean> = ref(false);
	const refAsOnPage: Ref<ElementId[]> = ref([]);
	const refEditor = useTemplateRef<{ undo: (how: "keys") => void }>("editor");

	function pickLayout(choice: LayoutChoice): void {
		layoutPref.pick(choice);
		trackEvent("plan:layout_preset", { preset: choice });
	}
	function startCustomise(): void {
		refEditingLayout.value = true;
		trackEvent("plan:layout_customise_open", {
			from: layoutPref.choice.value === "custom" ? "custom" : "preset",
		});
	}

	// a phone (below md, where the app shows its bottom bar) saves from a
	// bar above it
	const phoneQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(max-width: 767.98px)")
			: null;
	const refIsPhone: Ref<boolean> = ref(phoneQuery?.matches ?? false);
	const onPhoneMedia = (e: MediaQueryListEvent) =>
		(refIsPhone.value = e.matches);
	phoneQuery?.addEventListener("change", onPhoneMedia);
	onUnmounted(() => phoneQuery?.removeEventListener("change", onPhoneMedia));

	// Share link: the sharing modal creates, copies and stops the link
	const refShowShare: Ref<boolean> = ref(false);

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

	// the save control, in the header and on a phone in the save bar
	const saveControl = computed(() => ({
		readOnly: readOnly.value,
		own: isOwnPlan.value,
		existing: existing.value,
		saveable: saveable.value,
		saving: refIsSaving.value,
		failed: refSaveFailed.value,
		failedName: refFailedName.value,
		modified: modified.value,
		canUndo: canUndo.value,
		canRedo: canRedo.value,
		savedAt: savedAt.value,
		versions: refVersions.value,
		versioned: draftPossible.value,
		draftSavedAt: draftSavedAt.value,
		draftResumed: draftResumed.value,
		draftFailed: draftFailed.value,
		restoredFrom: refRestoredFrom.value,
		preview: refPreview.value,
		phone: refIsPhone.value,
	}));
	const saveControlEvents = {
		undo: () => trackedUndo("button"),
		redo: () => trackedRedo("button"),
		save: (name: string) => save("button", name),
		"save-as-copy": openSaveAsModal,
		discard: discardChanges,
		"retry-draft": retryDraft,
		preview: async (versionUuid: string) => {
			await flushDraft();
			// that write met another draft: the dialog's choice comes first
			if (conflict.show.value) return;
			return preview.open(versionUuid);
		},
		rename: renameVersion,
		activate: (versionUuid: string) => {
			const version = findVersion(versionUuid);
			if (version) return makeVersionActive(version, "list");
		},
		delete: async (versionUuid: string) => {
			const version = findVersion(versionUuid);
			// the previewed version is gone: back to the edits
			if (
				version &&
				(await removeVersion(version)) &&
				refPreview.value?.uuid === versionUuid
			)
				preview.back();
		},
	};

	// what the elements read, wherever the layout puts them
	providePlanView({
		calculation,
		planData: refPlanData,
		planet: planetData,
		readOnly,
		shared: !!props.shared,
		isOwnPlan,
		empire: {
			uuid: refEmpireUuid,
			list: refEmpireList,
			cxUuid: refCXUuid,
			profitPerArea: computed(() =>
				refEmpireUuid.value
					? cachedProfitPerArea(refEmpireUuid.value)
					: undefined
			),
		},
		priceSource: computed(() =>
			props.shared && !refEmpireList.value?.length
				? sharedPriceSource.value
				: undefined
		),
		sharedCopy: { sharedChanges, sharedCompare },
		edits: planEdits,
		io: planIO,
		marketChecks,
		flagCount,
		autoOptimizeHabs: refAutoOptimizeHabs,
		setAutoOptimizeHabs: (v: boolean, goal: HabSolverGoal) => {
			refAutoOptimizeHabs.value = v;
			trackEvent("plan:hab_auto_toggle", { is_active: v });
			applyOptimizeHabs(goal, false);
		},
		openInsights: () => refInsights.value?.open(),
		focusElement: grid.focusElement,
		layoutEditing: {
			active: refEditingLayout,
			showAll: (el: ElementId) =>
				refEditingLayout.value && !refAsOnPage.value.includes(el),
		},
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
	<!-- a phone keeps the last rows clear of the Save bar and the app's
		bottom bar as well -->
	<div class="pb-16 max-md:pb-36 [&_*]:scroll-mt-24">
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
							v-if="!readOnly"
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
				<!-- a phone saves from the bar above the app's bottom bar -->
				<PlanSaveControl
					v-if="!disabled"
					v-model:save-menu="refShowSaveMenu"
					v-bind="saveControl"
					:part="refIsPhone ? 'history' : 'all'"
					v-on="saveControlEvents" />
				<PTooltip v-if="isOwnPlan && existing" placement="bottom">
					<template #trigger>
						<PButton
							type="secondary"
							class="pointer-coarse:h-11 pointer-coarse:min-w-11"
							:aria-label="t('plan.actions.reload')"
							@click="reloadPlan">
							<template #icon><ChangeCircleOutlined /></template>
						</PButton>
					</template>
					{{ t("plan.actions.reload") }}
				</PTooltip>
				<template v-if="isOwnPlan && refPlanData.uuid">
					<PButton type="secondary" @click="refShowShare = true">
						{{ t("plan.actions.share_link") }}
					</PButton>
					<SharingModal
						v-model:show="refShowShare"
						:plan-uuid="refPlanData.uuid" />
				</template>
				<PlanLayoutMenu
					:choice="layoutPref.choice.value"
					:has-custom="!!layoutPref.custom.value"
					:can-customise="!refIsPhone && !refEditingLayout"
					@pick="pickLayout"
					@customise="startCustomise" />
				<PlanMoreMenu
					:debug="calcDebug"
					@csv="downloadMaterialIO"
					@debug="toggleCalcDebug('button')" />
				<HelpDrawer file-name="plan" />
			</div>
		</header>
		<!-- an older version, read-only until restored -->
		<PlanVersionPreviewBanner
			v-if="refPreview"
			class="mx-6 max-md:mx-4 mb-3"
			:version="refPreview"
			:compare="preview.compare"
			@restore="preview.restoreVersion"
			@activate="makeVersionActive(refPreview, 'preview')"
			@open-as-plan="preview.openAsPlan"
			@back="preview.back" />

		<!-- a shared plan's copy: what differs from the shared plan -->
		<SharedPlanDeltas
			v-if="sharedCompare"
			class="px-6 max-md:px-4 pb-2"
			:compare="sharedCompare" />

		<!-- every part of the plan as the player's layout places it -->
		<div class="px-6 max-md:px-4 pt-1">
			<PlanLayoutEditor
				v-if="refEditingLayout"
				ref="editor"
				v-model:as-on-page="refAsOnPage"
				:pref="layoutPref"
				:logged-in="userStore.isLoggedIn"
				@close="refEditingLayout = false" />
			<PlanGrid
				v-else
				:layout="grid.layout.value"
				:folded="layoutPref.folded.value"
				:tabs="grid.tabs"
				@fold="grid.fold"
				@tab="grid.showTab" />
		</div>
		<!-- a hidden element, opened from a results tile or a shortcut -->
		<PModal
			:show="grid.refDialog.value !== null"
			:width="720"
			:title="
				grid.refDialog.value
					? t(ELEMENTS[grid.refDialog.value].label)
					: ''
			"
			@update:show="(v: boolean) => !v && (grid.refDialog.value = null)">
			<div v-if="grid.refDialog.value" class="@container">
				<component
					:is="elementView(grid.refDialog.value).component"
					v-bind="elementView(grid.refDialog.value).props" />
			</div>
		</PModal>
		<!-- a phone: the save status and Save in a bar above the app's
			bottom bar, for a saved plan (its versions) or while there is
			something to save -->
		<div
			v-if="
				refIsPhone &&
				isOwnPlan &&
				(existing || modified || refIsSaving || refSaveFailed)
			"
			class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-1000 px-4 py-2 border-t border-line bg-surface [&>div]:w-full [&>div]:justify-between"
			data-phone-save>
			<PlanSaveControl
				v-model:save-menu="refShowSaveMenu"
				v-bind="saveControl"
				part="save"
				v-on="saveControlEvents" />
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
