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
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Naive UI
	import { type MessageReactive, NModal } from "naive-ui";

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
		PlanCreateData,
	} from "@/features/api/schemas/planningData.schemas";
	import type { IPlanDefinition } from "@/features/planning_data/usePlan.types";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import {
		optimizeHabs,
		calculateAvailableArea,
		type HabSolverGoal,
	} from "@/features/planning/calculations/habOptimization";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { getPlanet } = usePlanetData();
	import { useCXData } from "@/features/cx/useCXData";
	const { findEmpireCXUuid } = useCXData();
	import { usePlanCalculation } from "@/features/planning/usePlanCalculation";
	import { usePlan } from "@/features/planning_data/usePlan";
	import { usePlanPreferences } from "@/features/preferences/usePlanPreferences";
	const {
		createNewPlan,
		saveExistingPlan,
		reloadExistingPlan,
		cloneSharedPlan,
	} = usePlan();
	import { flushPlanEdits, trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { inertClone } from "@/util/data";

	// Components
	import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
	import PlanArea from "@/features/planning/components/PlanArea.vue";
	import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
	import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
	import PlanExperts from "@/features/planning/components/PlanExperts.vue";
	import PlanProduction from "@/features/planning/components/PlanProduction.vue";
	import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
	import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
	import PlanOverview from "@/features/planning/components/PlanOverview.vue";
	import PlanStatusBar from "@/features/planning/components/PlanStatusBar.vue";
	import PlanSaveButton from "@/features/planning/components/PlanSaveButton.vue";
	import PlanToolFallback from "@/features/planning/components/PlanToolFallback.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import PlanAnalyticsBox from "@/features/plan_analytics/components/PlanAnalyticsBox.vue";
	import SharedPlanBanner from "@/features/sharing/components/SharedPlanBanner.vue";
	const ShareButton = defineAsyncComponent(
		() => import("@/features/sharing/components/SharingButton.vue")
	);

	// UI
	import {
		PButton,
		PButtonGroup,
		PTooltip,
		PForm,
		PFormItem,
		PInput,
		PSelect,
		useToast,
	} from "@/ui";
	import type { PSelectOption } from "@/ui/ui.types";
	const toast = useToast();
	import {
		ShoppingBasketSharp,
		AttachMoneySharp,
		DataSaverOffSharp,
		DataObjectRound,
		ChangeCircleOutlined,
		ContentCopySharp,
		SettingsSharp,
		UndoSharp,
		RedoSharp,
	} from "@vicons/material";
	import { useUnsavedGuard } from "@/lib/useUnsavedGuard";

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
	});

	const refPlanData: Ref<IPlanDefinition> = ref(inertClone(props.planData));
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
		snapshot,
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
		handleAddBuildingRecipe,
		handleChangeBuildingRecipe,
		handleChangePlanName,
	} = calculation;

	const refMaterialIOShowBasked: Ref<boolean> = ref(false);
	const refMaterialIOSplitted: Ref<boolean> = ref(false);

	// Save As modal state
	const refShowSaveAsModal: Ref<boolean> = ref(false);
	const refSaveAsName: Ref<string> = ref("");
	const refSaveAsEmpireUuid: Ref<string | undefined> = ref(undefined);
	const refIsSavingAs: Ref<boolean> = ref(false);

	// Plan Preferences
	const { autoOptimizeHabs } = usePlanPreferences(() => props.planData.uuid);

	// When the plan hasn't been created, we'll use the local ref which is
	// stored into the plan preferences on plan creation in save()
	const refLocalAutoOptimizeHabs: Ref<boolean> = ref(true);
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

	type toolOptions =
		| "configuration"
		| "visitation-frequency"
		| "repair-analysis"
		| "popr"
		| "supply-cart"
		| "construction-cart"
		| null;
	const refShowTool: Ref<toolOptions> = ref(null);
	if (!refPlanData.value.uuid) {
		refShowTool.value = "configuration";
	}

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
						cxUuid: refCXUuid.value,
						constructionData: result.value.constructionMaterials,
						productionBuildingData:
							result.value.production.buildings,
						infrastructureData: result.value.infrastructure,
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
				const savedUuid = await saveExistingPlan(
					refPlanData.value.uuid!,
					backendData.value
				);
				if (!savedUuid) return saveFailed();

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
				const newUuid = await createNewPlan(backendData.value);
				if (!newUuid) return saveFailed();

				refPlanData.value.uuid = newUuid;
				// Persist the auto-optimize-habs preference
				userStore.setPlanPreference(newUuid, {
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
					if (!(await saveExistingPlan(planUuid, backendData.value)))
						return saveFailed();
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
			const newUuid = await createNewPlan(saveAsData);
			if (!newUuid) return;

			// Persist the auto-optimize-habs preference
			userStore.setPlanPreference(newUuid, {
				autoOptimizeHabs: refAutoOptimizeHabs.value,
			});

			trackEvent("plan:save_as", {
				planet_natural_id: planetData.planet_natural_id,
			});

			// Close modal and open new plan in a new tab
			refShowSaveAsModal.value = false;
			window.open(
				`/plan/${planetData.planet_natural_id}/${newUuid}`,
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

	const refIsReloading: Ref<boolean> = ref(false);

	async function reloadPlan(): Promise<void> {
		if (!existing.value || !refPlanData.value.uuid) {
			throw new Error(`Unable to reload plan without uuid.`);
		}

		refIsReloading.value = true;

		try {
			refPlanData.value = await reloadExistingPlan(
				refPlanData.value.uuid
			);
			planName.value = refPlanData.value.plan_name;
			refSaveFailed.value = false;
			markSaved();

			trackEvent("plan:reload", {
				planet_natural_id: planetData.planet_natural_id,
			});
		} finally {
			refIsReloading.value = false;
		}
	}

	// clone shared plan as logged in user
	const sharedWasCloned: Ref<boolean> = ref(false);

	async function cloneShared(): Promise<void> {
		if (!props.sharedPlanUuid) return;

		const newPlanUuid = await cloneSharedPlan(props.sharedPlanUuid);
		sharedWasCloned.value = newPlanUuid !== null;
		trackEvent("plan:shared_clone", {
			planet_natural_id: planetData.planet_natural_id,
			shared_uuid: props.sharedPlanUuid,
		});
		if (newPlanUuid) {
			router.push(`/plan/${planetData.planet_natural_id}/${newPlanUuid}`);
		}
	}

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: computed(() =>
			planName.value
				? `${planName.value} | PRUNplanner`
				: `${props.planData.planet_natural_id} | PRUNplanner`
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

		if (key === "s") {
			// never open the browser's save dialog on the plan page
			e.preventDefault();
			if (canSave.value) save("shortcut");
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
	});

	// Deleting or changing a recipe shows a toast to take it back. Any later
	// change to the history (edit, undo, redo, save) closes it, so its Undo
	// only ever undoes the edit it announced.
	let undoToast: MessageReactive | undefined;

	watch(
		revision,
		() => {
			undoToast?.destroy();
			undoToast = undefined;
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

	function changeBuildingRecipe(
		buildingIndex: number,
		recipeIndex: number,
		recipeId: string
	): void {
		const building = refPlanData.value.plan_data.buildings[buildingIndex];
		// picking the recipe it already has changes nothing, and the toast's
		// Undo would take back the edit before it
		if (building?.active_recipes[recipeIndex]?.recipeid === recipeId)
			return;

		handleChangeBuildingRecipe(buildingIndex, recipeIndex, recipeId);
		toastUndo(
			t("plan.history.recipe_changed", { building: building.name })
		);
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

<!--div class="border-b border-white/10 p-3 overflow-visible">-->
<template>
	<PlanAnalyticsBox
		:key="`INSIGHTS#${planetData.planet_natural_id}`"
		:planet-natural-id="planetData.planet_natural_id" />
	<SharedPlanBanner
		v-if="sharedPlanUuid"
		:cloned="sharedWasCloned"
		@clone="cloneShared" />
	<!-- keep focused controls clear of the sticky status bar -->
	<div class="@container [&_*]:scroll-mt-28">
		<div
			class="grid grid-cols-[minmax(0,1fr)] grid-rows-[repeat(5,auto)] md:grid-cols-[auto_1fr_auto] gap-x-3">
			<!-- Plan Name & Selector -->
			<div
				class="p-3 row-1 col-1 flex flex-row flex-wrap gap-x-3 pt-3 pb-3 md:pb-0 @6xl:pb-3 items-baseline">
				<h1 class="text-2xl font-bold text-white">
					{{ planName || t("plan.name.untitled") }}
				</h1>
				<span class="text-white/60">
					{{
						planetData.planet_name != planetData.planet_natural_id
							? planetData.planet_name + " - "
							: ""
					}}
					{{ planetData.planet_natural_id }}
				</span>
			</div>
			<!-- Status Bar (sticky) -->
			<div
				class="row-3 md:row-2 md:col-span-full @6xl:row-1 @6xl:col-span-1 w-full md:w-auto justify-self-start md:justify-self-center my-auto p-3 sticky top-0 z-1000 bg-(--app-bg) md:rounded-b-lg">
				<PlanStatusBar
					:area-data="result.area"
					:corphq="result.corphq"
					:cogc="result.cogc"
					:expert-data="result.experts"
					:overview-data="overviewData" />
			</div>
			<!-- Plan Actions -->
			<div
				class="p-3 row-2 md:row-1 md:col-3 py-3 flex flex-row flex-wrap items-start gap-x-3">
				<HelpDrawer file-name="plan" />

				<div v-if="!disabled" class="flex gap-x-1">
					<PTooltip placement="bottom">
						<template #trigger>
							<PButton
								:aria-label="t('plan.history.undo')"
								type="secondary"
								:disabled="!canUndo"
								@click="trackedUndo('button')">
								<template #icon>
									<UndoSharp />
								</template>
							</PButton>
						</template>
						{{ t("plan.history.undo") }}
					</PTooltip>
					<PTooltip placement="bottom">
						<template #trigger>
							<PButton
								:aria-label="t('plan.history.redo')"
								type="secondary"
								:disabled="!canRedo"
								@click="trackedRedo('button')">
								<template #icon>
									<RedoSharp />
								</template>
							</PButton>
						</template>
						{{ t("plan.history.redo") }}
					</PTooltip>
				</div>

				<PButtonGroup v-if="userStore.isLoggedIn && !disabled">
					<PlanSaveButton
						:existing="existing"
						:saveable="saveable"
						:saving="refIsSaving"
						:failed="refSaveFailed"
						:modified="modified"
						:saved-at="savedAt"
						@save="save()" />
					<PButton v-if="existing" @click="openSaveAsModal">
						<template #icon>
							<ContentCopySharp />
						</template>
						{{ $t("common.buttons.save_as") }}
					</PButton>
					<PButton
						v-if="existing"
						:loading="refIsReloading"
						@click="reloadPlan">
						<template #icon>
							<ChangeCircleOutlined />
						</template>
						{{ $t("common.buttons.reload") }}
					</PButton>

					<ShareButton
						v-if="refPlanData.uuid"
						:plan-uuid="refPlanData.uuid" />
				</PButtonGroup>
				<!-- empty div to maintain layout -->
				<div v-else class="@[1290px]:w-112.5" />
			</div>
			<!-- Tools Container -->
			<div class="row-4 md:col-span-3">
				<!-- Toolbar -->
				<div
					class="flex flex-wrap grow @3xl:justify-end border-y border-white/10 gap-3 py-3 child:my-auto px-3">
					<PButton
						:type="
							refShowTool === 'configuration'
								? 'primary'
								: 'secondary'
						"
						@click="toggleTool('configuration')">
						<template #icon>
							<SettingsSharp />
						</template>
						{{ $t("plan.components.configuration.label") }}
					</PButton>
					<PButton
						v-if="userStore.isLoggedIn"
						:type="refShowTool === 'popr' ? 'primary' : 'secondary'"
						@click="toggleTool('popr')">
						{{ $t("plan.tools.labels.popr") }}
					</PButton>
					<PButton
						:type="
							refShowTool === 'visitation-frequency'
								? 'primary'
								: 'secondary'
						"
						@click="toggleTool('visitation-frequency')">
						{{ $t("plan.tools.labels.visitation_frequency") }}
					</PButton>
					<PButton
						:type="
							refShowTool === 'construction-cart'
								? 'primary'
								: 'secondary'
						"
						@click="toggleTool('construction-cart')">
						{{ $t("plan.tools.labels.construction_cart") }}
					</PButton>
					<PButton
						:type="
							refShowTool === 'supply-cart'
								? 'primary'
								: 'secondary'
						"
						@click="toggleTool('supply-cart')">
						{{ $t("plan.tools.labels.supply_cart") }}
					</PButton>
					<PButton
						:type="
							refShowTool === 'repair-analysis'
								? 'primary'
								: 'secondary'
						"
						@click="toggleTool('repair-analysis')">
						{{ $t("plan.tools.labels.repair_analysis") }}
					</PButton>
				</div>
				<!-- Tool View -->
				<div
					class="transition-discrete transition-opacity duration-150"
					:class="
						!refShowTool
							? 'opacity-0 overflow-hidden h-0!'
							: 'px-6 py-3 opacity-100 border-b border-white/10'
					">
					<div
						v-if="refShowTool === 'configuration'"
						class="flex flex-wrap sm:justify-center-safe gap-6">
						<div class="flex flex-col min-w-75">
							<h2 class="text-white/80 font-bold text-lg pb-3">
								{{ $t("plan.components.configuration.label") }}
							</h2>

							<div
								class="flex flex-col gap-y-3 sm:border sm:border-white/10 sm:rounded sm:p-3">
								<PlanConfiguration
									:disabled="disabled"
									:plan-name="planName"
									:new-plan="!existing"
									:empire-options="refEmpireList"
									:active-empire="computedActiveEmpire"
									:plan-empires="planEmpires"
									@update:active-empire="
										(empireUuid: string) => {
											refEmpireUuid = empireUuid;
											refCXUuid =
												findEmpireCXUuid(empireUuid);
										}
									"
									@update:plan-name="handleChangePlanName" />
								<PlanArea
									:disabled="disabled"
									:area-data="result.area"
									:planet-natural-id="
										planetData.planet_natural_id
									"
									@update:permits="handleUpdatePermits" />
								<PlanBonuses
									:disabled="disabled"
									:corphq="result.corphq"
									:cogc="result.cogc"
									:planet-natural-id="
										planetData.planet_natural_id
									"
									@update:corphq="handleUpdateCorpHQ"
									@update:cogc="handleUpdateCOGC" />
							</div>
						</div>
						<div>
							<h2 class="text-white/80 font-bold text-lg pb-3">
								{{ $t("plan.components.infrastructure.label") }}
							</h2>
							<div
								class="sm:border sm:border-white/10 sm:rounded sm:p-3">
								<PlanInfrastructure
									:disabled="disabled"
									:infrastructure-data="result.infrastructure"
									:auto-optimize-habs="refAutoOptimizeHabs"
									:planet-natural-id="
										planetData.planet_natural_id
									"
									@update:infrastructure="
										handleUpdateInfrastructure
									"
									@update:auto-optimize-habs="
										(v: boolean, goal: HabSolverGoal) => {
											refAutoOptimizeHabs = v;
											trackEvent(
												'plan:hab_auto_toggle',
												{ is_active: v }
											);
											applyOptimizeHabs(goal, false);
										}
									"
									@optimize-habs="
										(goal: HabSolverGoal) =>
											applyOptimizeHabs(goal, true)
									" />
							</div>
						</div>
						<div>
							<h2 class="text-white/80 font-bold text-lg pb-3">
								{{ $t("plan.components.experts.label") }}
							</h2>
							<div
								class="sm:border sm:border-white/10 sm:rounded sm:p-3">
								<PlanExperts
									:disabled="disabled"
									:expert-data="result.experts"
									:planet-natural-id="
										planetData.planet_natural_id
									"
									@update:expert="handleUpdateExpert" />
							</div>
						</div>
					</div>
					<Suspense
						v-else-if="refShowTool && compViewToolMeta"
						:timeout="200">
						<template #default>
							<component
								:is="compViewToolComponent"
								v-bind="compViewToolMeta.props"
								v-on="compViewToolMeta.listeners" />
						</template>
						<template #fallback>
							<PlanToolFallback />
						</template>
					</Suspense>
				</div>
			</div>
			<!-- Main Plan View -->
			<div
				class="p-3 row-5 col-span-full grid grid-cols-[minmax(0,1fr)] @[1290px]:grid-cols-[auto_450px] pt-3 gap-3">
				<div>
					<div
						class="flex flex-row flex-wrap sm:justify-center-safe gap-6 child:max-w-full child:overflow-x-auto">
						<div>
							<h2 class="text-white/80 font-bold text-lg pb-3">
								{{ $t("plan.components.workforce.label") }}
							</h2>
							<PlanWorkforce
								:disabled="disabled"
								:workforce-data="result.workforce"
								:planet-natural-id="
									planetData.planet_natural_id
								"
								@update:lux="handleUpdateWorkforceLux" />
						</div>
						<div>
							<PlanOverview
								:visitation-data="visitationData"
								:overview-data="overviewData"
								:area-data="result.area">
								<template #heading="{ text }">
									<h2
										class="text-white/80 font-bold text-lg pb-3">
										{{ text }}
									</h2>
								</template>
							</PlanOverview>
						</div>
					</div>
					<div class="pt-6">
						<PlanProduction
							:disabled="disabled"
							:production-data="result.production"
							:planet-resources="planetData.resources"
							:cogc="result.cogc"
							:cx-uuid="refCXUuid"
							:planet-id="planetData.planet_natural_id"
							@update:building:amount="handleUpdateBuildingAmount"
							@delete:building="deleteBuilding"
							@create:building="handleCreateBuilding"
							@create:building:recipe="
								handleCreateBuildingAndRecipe
							"
							@update:building:recipe:amount="
								handleUpdateBuildingRecipeAmount
							"
							@delete:building:recipe="deleteBuildingRecipe"
							@add:building:recipe="handleAddBuildingRecipe"
							@update:building:recipe="changeBuildingRecipe" />
					</div>
				</div>
				<div>
					<div class="sticky top-12">
						<h2
							class="text-white/80 font-bold text-lg pb-3 flex justify-between child:my-auto">
							<div>
								{{ $t("plan.components.materialio.label") }}
							</div>
							<div class="flex gap-x-3">
								<PTooltip>
									<template #trigger>
										<PButton
											:aria-label="
												$t(
													'plan.components.materialio.buttons.toggle_weight_volume'
												)
											"
											size="sm"
											secondary
											@click="
												refMaterialIOShowBasked =
													!refMaterialIOShowBasked
											">
											<template #icon>
												<ShoppingBasketSharp
													v-if="
														!refMaterialIOShowBasked
													" />
												<AttachMoneySharp v-else />
											</template>
										</PButton>
									</template>
									{{
										$t(
											"plan.components.materialio.buttons.toggle_weight_volume"
										)
									}}
								</PTooltip>

								<PTooltip>
									<template #trigger>
										<PButton
											:aria-label="
												$t(
													'plan.components.materialio.buttons.toggle_production_workforce'
												)
											"
											size="sm"
											secondary
											@click="
												refMaterialIOSplitted =
													!refMaterialIOSplitted
											">
											<template #icon>
												<DataObjectRound
													v-if="
														!refMaterialIOSplitted
													" />
												<DataSaverOffSharp v-else />
											</template>
										</PButton>
									</template>
									{{
										$t(
											"plan.components.materialio.buttons.toggle_production_workforce"
										)
									}}
								</PTooltip>
							</div>
						</h2>
						<template v-if="!refMaterialIOSplitted">
							<PlanMaterialIO
								:material-i-o-data="result.materialio"
								max-height="calc(100dvh - 10rem)"
								:show-basked="refMaterialIOShowBasked" />
						</template>
						<template v-else>
							<h3 class="font-bold pb-3">
								{{
									$t(
										"plan.components.materialio.label_production"
									)
								}}
							</h3>
							<PlanMaterialIO
								:material-i-o-data="result.productionMaterialIO"
								max-height="calc(50dvh - 8rem)"
								:show-basked="refMaterialIOShowBasked" />
							<h3 class="font-bold py-3">
								{{
									$t(
										"plan.components.materialio.label_workforce"
									)
								}}
							</h3>
							<PlanMaterialIO
								:material-i-o-data="result.workforceMaterialIO"
								max-height="calc(50dvh - 8rem)"
								:show-basked="refMaterialIOShowBasked" />
						</template>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Save As Modal -->
	<n-modal
		v-model:show="refShowSaveAsModal"
		class="w-120! max-w-[90vw]!"
		preset="card"
		:title="t('plan.components.save_as.title')">
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
	</n-modal>
</template>
