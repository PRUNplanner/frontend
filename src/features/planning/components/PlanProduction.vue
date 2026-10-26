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
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
	import PlanStarterSetup from "@/features/plan_analytics/components/PlanStarterSetup.vue";

	// Types & Interfaces
	import type {
		PlanetResource,
		PlanetResourceType,
	} from "@/features/api/schemas/gameData.schemas";
	import type {
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
	import PSelect from "@/ui/components/PSelect.vue";
	import PTooltip from "@/ui/components/PTooltip.vue";

	// Util
	import { formatNumber } from "@/util/numbers";
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
		// the plan's Material I/O, for the recipe picker
		materialIO: {
			type: Array as PropType<IMaterialIO[]>,
			required: true,
		},
		// a shared plan's copy: what changed against it
		changes: {
			type: Object as PropType<IPlanChanges>,
			required: false,
			default: undefined,
		},
	});

	const emit = defineEmits<{
		// from PlanProductionBuilding.vue
		(e: "update:building:amount", index: number, value: number): void;
		(e: "delete:building", index: number): void;
		(e: "create:building", ticker: string): void;
		(e: "create:building:recipe", ticker: string, recipeId: string): void;
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

	// one recipe picker at a time: the building, and the order it replaces
	// or null to add one
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
	const localSelectedBuilding: Ref<string | undefined> = ref(undefined);
	const localCOGC: ComputedRef<PlanCOGCProgram> = computed(() => props.cogc);
	const localMatchCOGC: Ref<boolean> = ref(false);

	const { getProductionBuildingOptions } = useBuildingData();
	const { isAvailable, totalPlans, popularBuildings, mostPlannedRecipe } =
		usePlanetInsights(() => props.planetId);

	// "Start empty" hides the starter card for this view
	const isStarterDismissed: Ref<boolean> = ref(false);
	const isEmpty: ComputedRef<boolean> = computed(
		() =>
			!props.disabled && localProductionData.value.buildings.length === 0
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
		trackEvent("plan:starter_dismiss", {
			planet_natural_id: props.planetId,
		});
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

	function emitCreateBuildingWithRecipe(
		resourceType: PlanetResourceType,
		resourceTicker: string
	): void {
		const buildingTicker =
			resourceType === "MINERAL"
				? "EXT"
				: resourceType === "GASEOUS"
					? "COL"
					: "RIG";

		emit(
			"create:building:recipe",
			buildingTicker,
			buildingTicker + "#" + resourceTicker
		);
	}
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg">
		{{ $t("plan.components.production.label") }}
	</h2>
	<!-- the building controls wrap below the planet resources when both
		don't fit on one line -->
	<div class="flex flex-wrap justify-between gap-3 py-3 child:my-auto">
		<div class="flex gap-3 child:my-auto">
			<div v-if="planetResources.length" class="text-sm">
				{{ $t("plan.components.production.planet_resources") }}
			</div>
			<div class="flex flex-wrap gap-1 child:my-auto">
				<PTooltip
					v-for="resource in planetResources"
					:key="`PLANET#RESOURCE#${resource.material_ticker}`">
					<template #trigger>
						<button
							type="button"
							class="cursor-pointer"
							@click="
								emitCreateBuildingWithRecipe(
									resource.resource_type,
									resource.material_ticker
								)
							">
							<MaterialTile
								:key="resource.material_ticker"
								:ticker="resource.material_ticker"
								:amount="
									parseFloat(
										formatNumber(resource.daily_extraction)
									)
								"
								disable-drawer
								:enable-popover="false" />
						</button>
					</template>
					{{ resource.resource_type }} ({{
						resource.resource_type === "MINERAL"
							? "EXT"
							: resource.resource_type === "GASEOUS"
								? "COL"
								: "RIG"
					}})
				</PTooltip>
			</div>
		</div>
		<div
			v-if="!disabled"
			class="w-full sm:w-auto sm:ml-auto flex child:my-auto gap-3">
			<div class="flex gap-3">
				<div class="text-sm text-nowrap">
					{{ $t("plan.components.production.form.match_cogc") }}
				</div>
				<PCheckbox
					v-model:checked="localMatchCOGC"
					:aria-label="
						$t('plan.components.production.form.match_cogc')
					" />
			</div>

			<PSelect
				v-model:value="localSelectedBuilding"
				:aria-label="
					$t('plan.components.production.form.select_placeholder')
				"
				searchable
				:placeholder="
					t('plan.components.production.form.select_placeholder')
				"
				class="w-full sm:w-75!"
				:options="buildingOptions"
				@update:value="(value) => selectBuilding(value as string)" />
		</div>
	</div>

	<!-- @container: building rows lay out by the panel width (it shares the row
		with Material I/O on wide screens) -->
	<div class="@container border border-white/10 rounded overflow-hidden">
		<!-- the building stats' titles once, over their columns; a narrow
			panel wraps the stats under the name and titles each one there -->
		<div
			class="flex items-center gap-x-6 px-3 py-3 border-l-2 border-transparent text-xs uppercase bg-white/5 font-bold">
			<div class="flex-1">
				{{ $t("plan.components.production.table.building_recipe") }}
			</div>
			<div
				class="hidden @5xl:flex justify-end gap-x-6 text-right text-muted"
				data-stat-titles>
				<span class="w-[5.5rem]">
					{{
						$t(
							"plan.components.production_building.table.efficiency"
						)
					}}
				</span>
				<span class="w-[6rem]">
					{{
						$t("plan.components.production_building.table.revenue")
					}}
				</span>
				<span class="w-[2.5rem]">
					{{ $t("plan.components.production_building.table.area") }}
				</span>
				<span class="w-[7rem]">
					{{
						$t(
							"plan.components.production_building.table.construction"
						)
					}}
				</span>
				<!-- the delete button's column -->
				<span v-if="!disabled" class="w-6" />
			</div>
		</div>
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
		<!-- no planet insights, so no starter: point at the building select -->
		<p
			v-else-if="isEmpty"
			class="p-6 text-center text-sm text-muted"
			data-empty-hint>
			{{
				t("plan.production.empty", {
					select: t(
						"plan.components.production.form.select_placeholder"
					),
				})
			}}
		</p>
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
				:picker="
					refPicker?.building === index ? refPicker.recipe : undefined
				"
				:material-i-o="materialIO"
				:buildings="localProductionData.buildings"
				@open:picker="
					(recipe: number | null) => openPicker(index, recipe)
				"
				@close:picker="closePicker"
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
				" />
		</template>
		<div
			v-for="name in changes?.removed"
			:key="`REMOVED#${name}`"
			class="px-3 py-1.5 bg-white/5 border-b border-white/5 border-l-2 border-l-negative text-muted">
			<span class="text-lg font-mono line-through">{{ name }}</span>
			<span class="ml-2 text-xs font-bold uppercase text-negative">
				{{ $t("sharing.compare.removed") }}
			</span>
		</div>
	</div>
</template>
