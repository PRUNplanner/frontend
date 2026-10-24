<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		ref,
		type Ref,
		watch,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useBuildingData } from "@/database/services/useBuildingData";
	import { trackEvent, trackPlanEdit } from "@/lib/analytics/useAnalytics";
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

	// Components
	import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
	import PlanStarterSetup from "@/features/plan_analytics/components/PlanStarterSetup.vue";

	// Types & Interfaces
	import type { PlanetResource } from "@/features/api/schemas/gameData.schemas";
	import type {
		IExpertRecord,
		IMaterialIO,
		IProductionResult,
	} from "@/features/planning/usePlanCalculation.types";
	import type {
		PlanCOGCProgram,
		PlanDataBuilding,
	} from "@/features/api/schemas/planningData.schemas";
	import type { PSelectOption } from "@/ui/ui.types";
	import type { IStarterSetup } from "@/features/plan_analytics/usePlanetInsights.types";
	import type { IPlanChanges } from "@/features/sharing/sharedPlan.types";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PCheckbox from "@/ui/components/PCheckbox.vue";
	import PIcon from "@/ui/components/PIcon.vue";
	import PSelect from "@/ui/components/PSelect.vue";
	import { UnfoldLessSharp, UnfoldMoreSharp } from "@vicons/material";

	// Util
	import { STARTER_MAX_BUILDINGS } from "@/features/plan_analytics/planInsights.util";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		productionData: {
			type: Object as PropType<IProductionResult>,
			required: true,
		},
		cogc: {
			type: String as PropType<PlanCOGCProgram>,
			required: true,
		},
		cxUuid: {
			type: String,
			required: false,
			default: undefined,
		},
		planetId: {
			type: String,
			required: true,
		},
		planetResources: {
			type: Object as PropType<PlanetResource[]>,
			required: true,
		},
		// a shared plan's copy: what changed against it
		changes: {
			type: Object as PropType<IPlanChanges>,
			required: false,
			default: undefined,
		},
		// the plan's Material I/O, for the recipe picker
		materialIO: {
			type: Array as PropType<IMaterialIO[]>,
			required: false,
			default: () => [],
		},
		experts: {
			type: Object as PropType<IExpertRecord>,
			required: false,
			default: undefined,
		},
		// after a picked recipe: where, and what changed
		status: {
			type: Object as PropType<{
				building: number;
				recipe: number;
				text: string;
			}>,
			required: false,
			default: undefined,
		},
	});

	const emit = defineEmits<{
		// from PlanProductionBuilding.vue
		(e: "update:building:amount", index: number, value: number): void;
		(e: "delete:building", index: number): void;
		(e: "create:building", ticker: string): void;
		(
			e: "update:building:recipe:amount",
			buildingIndex: number,
			recipeIndex: number,
			value: number
		): void;
		(
			e: "delete:building:recipe",
			buildingIndex: number,
			recipeIndex: number
		): void;
		(
			e: "pick:building:recipe",
			buildingIndex: number,
			recipeId: string
		): void;
		(e: "undo"): void;
		(
			e: "apply:starter",
			setup: IStarterSetup,
			isSelectionChanged: boolean
		): void;
		(
			e: "add:building:recipes",
			buildingIndex: number,
			recipes: PlanDataBuilding["active_recipes"]
		): void;
		(
			e: "update:building:recipe",
			buildingIndex: number,
			recipeIndex: number,
			recipeid: string
		): void;
	}>();

	// Local State
	const localProductionData: ComputedRef<IProductionResult> = computed(
		() => props.productionData
	);
	const localSelectedBuilding: Ref<string | undefined> = ref(undefined);
	const localCOGC: ComputedRef<PlanCOGCProgram> = computed(() => props.cogc);
	const localMatchCOGC: Ref<boolean> = ref(false);
	watch(localMatchCOGC, (isActive) =>
		trackEvent("plan:cogc_match_toggle", { is_active: isActive })
	);

	const { getProductionBuildingOptions } = useBuildingData();
	const { isAvailable, totalPlans, popularBuildings, mostPlannedRecipe } =
		usePlanetInsights(() => props.planetId);

	// "Start empty" hides the starter card for this view
	const isStarterDismissed: Ref<boolean> = ref(false);
	const isEmpty: ComputedRef<boolean> = computed(
		() => !props.disabled && localProductionData.value.buildings.length === 0
	);
	const showStarter: ComputedRef<boolean> = computed(
		() => isEmpty.value && isAvailable.value && !isStarterDismissed.value
	);

	// once per plan view, the first step of the starter funnel
	let isStarterTracked = false;
	watch(
		showStarter,
		(show) => {
			if (!show || isStarterTracked) return;
			isStarterTracked = true;
			trackEvent("plan:starter_show", {
				planet_natural_id: props.planetId,
				candidate_count: Math.min(
					popularBuildings.value.length,
					STARTER_MAX_BUILDINGS
				),
			});
		},
		{ immediate: true }
	);

	function dismissStarter(): void {
		isStarterDismissed.value = true;
		trackEvent("plan:starter_dismiss", { planet_natural_id: props.planetId });
	}

	const buildingOptions: ComputedRef<PSelectOption[]> = computed(() =>
		getProductionBuildingOptions(
			localProductionData.value.buildings.map((e) => e.name),
			localMatchCOGC.value ? localCOGC.value : undefined,
			isAvailable.value
				? {
						label: t("plan.components.production.form.popular_on", {
							planet: props.planetId,
							plans: totalPlans.value,
						}),
						buildings: popularBuildings.value,
					}
				: undefined
		)
	);

	const POPULAR_PREFIX = "POPULAR#";

	function selectBuilding(value: string): void {
		const isFromPopular = value.startsWith(POPULAR_PREFIX);
		const ticker = value.replace(POPULAR_PREFIX, "");
		emit("create:building", ticker);
		trackPlanEdit({
			field: "building_add",
			planet_natural_id: props.planetId,
			building_ticker: ticker,
			...(isAvailable.value ? { is_from_popular: isFromPopular } : {}),
		});
	}

	/** is_most_planned, only while the planet has insights to compare */
	function mostPlanned(
		ticker: string,
		recipeId: string | undefined
	): { is_most_planned?: boolean } {
		if (!isAvailable.value || recipeId === undefined) return {};
		return { is_most_planned: mostPlannedRecipe(ticker) === recipeId };
	}

	// one picker at a time: the building, and the order it replaces or
	// null to add one
	const refPicker: Ref<{ building: number; recipe: number | null } | null> =
		ref(null);

	function openPicker(building: number, recipe: number | null): void {
		refPicker.value = { building, recipe };
	}

	function closePicker(): void {
		refPicker.value = null;
	}

	// the picker is held by index: a building added, removed or brought
	// back by undo would move it to another building
	watch(
		() => localProductionData.value.buildings.map((b) => b.name).join(),
		closePicker
	);

	// folded buildings, by ticker: one list per view, not saved
	const refFolded: Ref<Set<string>> = ref(new Set());
	const allFolded: ComputedRef<boolean> = computed(
		() =>
			localProductionData.value.buildings.length > 0 &&
			localProductionData.value.buildings.every((b) =>
				refFolded.value.has(b.name)
			)
	);

	function toggleFold(name: string): void {
		const next = new Set(refFolded.value);
		if (!next.delete(name)) next.add(name);
		refFolded.value = next;
	}

	function toggleAll(): void {
		refFolded.value = allFolded.value
			? new Set()
			: new Set(localProductionData.value.buildings.map((b) => b.name));
	}

	const counts = computed(() => {
		const buildings = localProductionData.value.buildings;
		return {
			buildings: buildings.length,
			units: buildings.reduce((sum, b) => sum + b.amount, 0),
			recipes: buildings.reduce(
				(sum, b) => sum + b.activeRecipes.length,
				0
			),
		};
	});

	const expertsOf = (expertise: string | null): number =>
		Object.values(props.experts ?? {}).find(
			(e) => e.name.toUpperCase() === expertise
		)?.amount ?? 0;
</script>

<template>
	<div class="flex flex-wrap items-center gap-3 pointer-coarse:gap-y-3 py-2">
		<span class="text-sm text-muted tabular-nums">
			{{
				t("plan.production.counts", {
					buildings: counts.buildings,
					units: counts.units,
					recipes: counts.recipes,
				})
			}}
		</span>
		<span class="grow" />
		<PButton
			v-if="counts.buildings > 0"
			size="sm"
			type="ghost"
			@click="toggleAll">
			<template #icon>
				<PIcon>
					<UnfoldMoreSharp v-if="allFolded" />
					<UnfoldLessSharp v-else />
				</PIcon>
			</template>
			{{
				allFolded
					? t("plan.production.expand_all")
					: t("plan.production.collapse_all")
			}}
		</PButton>
		<label
			v-if="!disabled"
			class="flex items-center gap-2 text-sm text-nowrap cursor-pointer">
			<PCheckbox
				v-model:checked="localMatchCOGC"
				:aria-label="t('plan.components.production.form.match_cogc')" />
			{{ t("plan.components.production.form.match_cogc") }}
		</label>
		<PSelect
			v-if="!disabled"
			v-model:value="localSelectedBuilding"
			class="w-full sm:w-64 ml-auto"
			:aria-label="t('plan.components.production.form.select_placeholder')"
			searchable
			:placeholder="t('plan.components.production.form.select_placeholder')"
			:options="buildingOptions"
			@update:value="(value) => selectBuilding(value as string)" />
	</div>

	<!-- under 40rem (a phone, a tablet next to the sidebar) each building
		becomes a card instead of squeezing the columns -->
	<div class="@container/prod">
	<div
		class="grid grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_4.5rem_6.5rem_3rem_1.75rem] pointer-coarse:grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_4.5rem_6.5rem_3rem_2.75rem] gap-x-2 items-end pl-2.5 pb-1.5 border-b border-line text-xs text-muted @max-[40rem]/prod:hidden"
		data-column-heads>
		<span />
		<span>{{ t("plan.production.columns.building") }}</span>
		<span class="text-center">{{ t("plan.production.columns.count") }}</span>
		<span class="text-right">{{ t("plan.production.columns.efficiency") }}</span>
		<span class="text-right">{{ t("plan.production.columns.daily") }}</span>
		<span class="text-right">{{ t("plan.production.columns.area") }}</span>
		<span />
	</div>
	<div>
		<PlanStarterSetup
			v-if="showStarter"
			:planet-id="planetId"
			:planet-resources="planetResources"
			@apply="
				(setup: IStarterSetup, isSelectionChanged: boolean) =>
					emit('apply:starter', setup, isSelectionChanged)
			"
			@dismiss="dismissStarter" />
		<div
			v-else-if="isEmpty && isAvailable"
			class="p-3 flex flex-wrap justify-center items-center gap-2 text-xs text-muted-strong">
			<i18n-t keypath="plan.tools.plan_starter.empty" tag="span">
				<template #link>
					<PButton
						size="sm"
						type="ghost"
						class="text-link-primary"
						@click="isStarterDismissed = false">
						{{ $t("plan.tools.plan_starter.show") }}
					</PButton>
				</template>
			</i18n-t>
		</div>
		<template
			v-for="(building, index) in localProductionData.buildings"
			:key="`${building.name}`">
			<PlanProductionBuilding
				:disabled="props.disabled"
				:building-data="building"
				:building-index="index"
				:cx-uuid="cxUuid"
				:planet-id="planetId"
				:change="changes?.buildings[building.name]"
				:folded="refFolded.has(building.name)"
				:experts="expertsOf(building.expertise)"
				:picker="
					refPicker?.building === index ? refPicker.recipe : undefined
				"
				:status="
					status?.building === index
						? { recipe: status.recipe, text: status.text }
						: undefined
				"
				:material-i-o="materialIO"
				:buildings="localProductionData.buildings"
				@toggle:fold="toggleFold(building.name)"
				@open:picker="(recipe: number | null) => openPicker(index, recipe)"
				@close:picker="closePicker"
				@undo="emit('undo')"
				@pick:building:recipe="
					(buildingIndex: number, recipeId: string) => {
						closePicker();
						emit('pick:building:recipe', buildingIndex, recipeId);
						trackPlanEdit({
							field: 'recipe_add',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							...mostPlanned(building.name, recipeId),
						});
					}
				"
				@update:building:amount="
					(index: number, value: number) => {
						emit('update:building:amount', index, value);
						trackPlanEdit({
							field: 'building_amount',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							amount: value,
						});
					}
				"
				@delete:building="
					(index: number) => emit('delete:building', index)
				"
				@update:building:recipe:amount="
					(
						buildingIndex: number,
						recipeIndex: number,
						value: number
					) => {
						emit(
							'update:building:recipe:amount',
							buildingIndex,
							recipeIndex,
							value
						);
						trackPlanEdit({
							field: 'recipe_amount',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							amount: value,
						});
					}
				"
				@delete:building:recipe="
					(buildingIndex: number, recipeIndex: number) => {
						emit(
							'delete:building:recipe',
							buildingIndex,
							recipeIndex
						);
						trackPlanEdit({
							field: 'recipe_delete',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
						});
					}
				"
				@add:building:recipes="
					(
						buildingIndex: number,
						recipes: PlanDataBuilding['active_recipes']
					) => {
						emit('add:building:recipes', buildingIndex, recipes);
						trackPlanEdit({
							field: 'recipe_mix_add',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							amount: recipes.length,
						});
					}
				"
				@update:building:recipe="
					(
						buildingIndex: number,
						recipeIndex: number,
						recipeId: string
					) => {
						closePicker();
						emit(
							'update:building:recipe',
							buildingIndex,
							recipeIndex,
							recipeId
						);
						trackPlanEdit({
							field: 'recipe_change',
							planet_natural_id: props.planetId,
							building_ticker: building.name,
							recipe_id: recipeId,
							...mostPlanned(building.name, recipeId),
						});
					}
				"
				/>
		</template>
		<div
			v-for="name in changes?.removed"
			:key="`REMOVED#${name}`"
			class="px-3 py-2 border-b border-line border-l-2 border-l-negative text-muted">
			<span class="text-sm font-medium line-through">{{ name }}</span>
			<span class="ml-2 text-xs font-bold uppercase text-negative">
				{{ $t("sharing.compare.removed") }}
			</span>
		</div>
	</div>
	</div>
</template>
