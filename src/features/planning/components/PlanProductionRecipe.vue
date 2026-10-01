<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		ref,
		type Ref,
		type WritableComputedRef,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type {
		IProductionBuildingRecipe,
		IRecipeBuildingOption,
	} from "@/features/planning/usePlanCalculation.types";

	// Composables
	import { usePlanetInsights } from "@/features/plan_analytics/usePlanetInsights";

	// Util
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { humanizeTimeMs } from "@/util/date";
	import { formatPayback, formatPercent } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PInputNumber from "@/ui/components/PInputNumber.vue";
	import PTooltip from "@/ui/components/PTooltip.vue";
	import PValue from "@/ui/components/PValue.vue";
	import { NModal, NPopover } from "naive-ui";
	import { ClearSharp, AnalyticsOutlined } from "@vicons/material";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		recipeData: {
			type: Object as PropType<IProductionBuildingRecipe>,
			required: true,
		},
		recipeIndex: {
			type: Number,
			required: true,
		},
		recipeOptions: {
			type: Array as PropType<IRecipeBuildingOption[]>,
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
	});

	const emit = defineEmits<{
		(
			e: "update:building:recipe:amount",
			index: number,
			value: number
		): void;
		(e: "delete:building:recipe", index: number): void;
		(e: "update:building:recipe", index: number, recipeid: string): void;
	}>();

	// Local State
	const localRecipeOptions: ComputedRef<IRecipeBuildingOption[]> = computed(
		() => {
			// sort by output ticker ascending, map-join multiple tickers
			return [...props.recipeOptions].sort((a, b) => {
				const tickerA = a.outputs
					.map((o) => o.material_ticker)
					.sort()
					.join("#");
				const tickerB = b.outputs
					.map((o) => o.material_ticker)
					.sort()
					.join("#");
				return tickerA.localeCompare(tickerB);
			});
		}
	);
	const localRecipeIndex: ComputedRef<number> = computed(() =>
		props.recipeIndex.valueOf()
	);

	const localRecipeData: ComputedRef<IProductionBuildingRecipe> = computed(
		() => props.recipeData
	);
	const localRecipeAmount: WritableComputedRef<number> = computed({
		get: () => props.recipeData.amount,
		set: () => {},
	});
	const refShowRecipeOptions: Ref<boolean> = ref(false);
	const refShowCOGM: Ref<boolean> = ref(false);

	// below xl the recipe tile sits in the right half of the row, so the popover
	// hangs left from its right edge to stay inside narrow windows (#294)
	const recipePlacement = () =>
		window.matchMedia?.("(min-width: 1280px)").matches === false
			? "bottom-end"
			: "bottom-start";

	const cogmEnabled = computed(
		() => localRecipeData.value.cogm && localRecipeData.value.cogm.visible
	);

	const cogmWithCX = computed(() => !!props.cxUuid);

	const { isAvailable: hasInsights, recipePopularity } = usePlanetInsights(
		() => props.planetId
	);
	const buildingTicker: ComputedRef<string> = computed(
		() => props.recipeData.recipe.building_ticker
	);
	const plansHere = (recipeId: string): number | undefined =>
		recipePopularity(buildingTicker.value, recipeId);
	// most planned first, when any recipe of this building has data
	const sortByPlansHere: ComputedRef<boolean> = computed(() =>
		props.recipeOptions.some((r) => plansHere(r.recipe_id) !== undefined)
	);

	function plansHereSorter(
		row1: Record<string, unknown>,
		row2: Record<string, unknown>
	): number {
		return (
			(plansHere(row1.recipe_id as string) ?? 0) -
			(plansHere(row2.recipe_id as string) ?? 0)
		);
	}

	function roiSorter(
		row1: Record<string, unknown>,
		row2: Record<string, unknown>
	): number {
		return (row1.dailyRevenue as number) - (row2.dailyRevenue as number);
	}
</script>

<template>
	<n-modal
		:key="`COGM#RECIPE#${recipeData.recipe.building_ticker}#${localRecipeIndex}`"
		v-model:show="refShowCOGM"
		preset="card"
		:title="t('plan.components.production_recipe.cogm_title')"
		:class="cogmWithCX ? 'max-w-250' : 'max-w-150'">
		<PlanCOGM
			v-if="localRecipeData.cogm"
			:cogm-data="localRecipeData.cogm"
			:cx-uuid="cxUuid"
			:planet-id="planetId" />
	</n-modal>

	<div class="col-span-6 xl:col-span-1">
		<PInputNumber
			v-model:value="localRecipeAmount"
			:aria-label="
				$t('plan.components.production_recipe.amount_label', {
					recipe: localRecipeData.recipeId,
				})
			"
			:disabled="disabled"
			:show-buttons="!disabled"
			size="sm"
			:min="0"
			class="w-full max-w-24"
			@update:value="
				(value) => {
					if (value !== null && value !== undefined) {
						emit(
							'update:building:recipe:amount',
							recipeIndex,
							value
						);
					}
				}
			" />
	</div>

	<n-popover
		trigger="click"
		:placement="recipePlacement()"
		scrollable
		style="padding: 0; max-height: min(500px, 45vh); max-width: calc(100vw - 48px)"
		:show="refShowRecipeOptions"
		:disabled="disabled"
		@update-show="(val) => (refShowRecipeOptions = val)">
		<template #trigger>
			<div
				class="col-span-6 xl:col-span-2 flex items-center gap-1 group justify-between"
				:class="{ 'hover:cursor-pointer': !disabled }">
				<div class="flex flex-row flex-wrap gap-1">
					<MaterialTile
						v-for="material in localRecipeData.recipe.outputs"
						:key="`${localRecipeData.recipe.building_ticker}#${material.material_ticker}`"
						:ticker="material.material_ticker"
						:amount="
							material.material_amount * localRecipeData.amount
						"
						:enable-popover="false" />
				</div>
				<div v-if="!disabled" class="pr-3">
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						class="w-5 h-5 text-white/80 transition-colors duration-200 group-hover:text-prunplanner"
						aria-hidden="true">
						<path d="M12 16L6 8H18L12 16Z" />
					</svg>
				</div>
			</div>
		</template>

		<div class="border border-pp-border max-w-[700px]" @click.stop>
			<XNDataTable
				:data="localRecipeOptions"
				row-class-name="child:whitespace-nowrap hover:cursor-pointer"
				:bordered="false"
				striped
				:row-props="
					(recipe) => ({
						onClick: () =>
							emit(
								'update:building:recipe',
								localRecipeIndex,
								recipe.recipe_id
							),
					})
				">
				<XNDataTableColumn
					v-if="hasInsights"
					key="plansHere"
					:title="
						t('plan.components.production_recipe.table.plans_here')
					"
					:sorter="plansHereSorter"
					:default-sort-order="sortByPlansHere ? 'descend' : false">
					<template #render-cell="{ rowData }">
						<span
							v-if="plansHere(rowData.recipe_id) !== undefined"
							class="flex items-center gap-2 text-nowrap">
							<span
								class="h-1.5 w-12 overflow-hidden rounded-full bg-white/5">
								<span
									class="block bg-prunplanner h-full"
									:style="{
										width: `${plansHere(rowData.recipe_id)}%`,
									}" />
							</span>
							{{ formatPercent(plansHere(rowData.recipe_id) ?? 0, 0) }}
						</span>
						<span v-else class="text-white/40 text-nowrap">
							{{
								$t(
									"plan.components.production_recipe.table.below_threshold"
								)
							}}
						</span>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="input"
					:title="t('plan.components.production_recipe.table.input')">
					<template #render-cell="{ rowData }">
						<div class="flex flex-row flex-wrap gap-1">
							<span
								v-if="
									rowData.recipe_id ===
									localRecipeData.recipeId
								"
								class="w-2 h-2 bg-prunplanner animate-pulse rounded-full my-auto mr-1" />
							<MaterialTile
								v-for="material in rowData.inputs"
								:key="`${rowData.building_ticker}#INPUT#${material.material_ticker}`"
								:ticker="material.material_ticker"
								:amount="material.material_amount"
								:enable-popover="false" />
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="TimeMs"
					:title="t('plan.components.production_recipe.table.time')"
					sorter="default">
					<template #render-cell="{ rowData }">
						{{ humanizeTimeMs(rowData.time_ms) }}
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="output"
					:title="
						t('plan.components.production_recipe.table.output')
					">
					<template #render-cell="{ rowData }">
						<div class="flex flex-row gap-1">
							<MaterialTile
								v-for="material in rowData.outputs"
								:key="`${rowData.building_ticker}#OUTPUT#${material.material_ticker}`"
								:ticker="material.material_ticker"
								:amount="material.material_amount"
								:enable-popover="false" />
						</div>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="dailyRevenue"
					:title="
						t(
							'plan.components.production_recipe.table.daily_revenue'
						)
					"
					sorter="default">
					<template #render-cell="{ rowData }">
						<span class="text-nowrap">
							<PValue :value="rowData.dailyRevenue" />
							<span class="pl-1 font-light text-muted">ȼ</span>
						</span>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="profitPerArea"
					:title="
						t('plan.components.production_recipe.table.profit_area')
					"
					sorter="default">
					<template #render-cell="{ rowData }">
						<span class="text-nowrap">
							<PValue :value="rowData.profitPerArea" />
							<span class="pl-1 font-light text-muted">ȼ</span>
						</span>
					</template>
				</XNDataTableColumn>
				<XNDataTableColumn
					key="roi"
					:title="t('plan.components.production_recipe.table.roi')"
					:sorter="roiSorter">
					<template #render-cell="{ rowData }">
						<span
							:class="
								rowData.roi >= 0
									? 'text-positive!'
									: 'text-negative!'
							">
							{{ formatPayback(rowData.roi) }}
						</span>
					</template>
				</XNDataTableColumn>
			</XNDataTable>

			<div class="text-xs p-2! text-white/60!">
				<strong>{{
					$t("plan.components.production_recipe.info.p1_strong")
				}}</strong>
				{{ $t("plan.components.production_recipe.info.p1") }}
				<strong>{{
					$t("plan.components.production_recipe.info.p2_strong")
				}}</strong>
				{{ $t("plan.components.production_recipe.info.p2") }}
				<strong>{{
					$t("plan.components.production_recipe.info.p3_strong")
				}}</strong>
				{{ $t("plan.components.production_recipe.info.p3") }}
				<template v-if="hasInsights">
					<strong>{{
						$t("plan.components.production_recipe.info.p4_strong")
					}}</strong>
					{{
						$t("plan.components.production_recipe.info.p4", {
							planet: planetId,
							building: buildingTicker,
						})
					}}
				</template>
			</div>
		</div>
	</n-popover>

	<div class="col-span-6 xl:col-span-3 text-xs text-white/80">
		{{ humanizeTimeMs(localRecipeData.time) }}
	</div>
	<div class="col-span-6 xl:col-span-2 flex flex-row gap-x-3 items-center">
		<template v-if="localRecipeData.dailyShare != 1">
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
				<div
					class="bg-prunplanner h-full transition-all duration-500 ease-out"
					:style="`width: ${localRecipeData.dailyShare * 100}%`" />
			</div>
			<div class="text-xs text-white/80 text-nowrap">
				{{ formatPercent(localRecipeData.dailyShare * 100) }}
			</div>
		</template>
	</div>
	<div class="col-span-6 xl:col-span-3 flex xl:justify-end">
		<PTooltip :disabled="cogmEnabled">
			<template #trigger>
				<PButton
					size="sm"
					:disabled="!cogmEnabled"
					@click="
						() => {
							refShowCOGM = true;
							trackEvent('plan:cogm_open', {
								planet_natural_id: props.planetId,
								recipe_id: localRecipeData.recipeId,
							});
						}
					">
					<template #icon><AnalyticsOutlined /> </template>
					{{ $t("plan.components.production_recipe.buttons.cogm") }}
				</PButton>
			</template>
			{{ $t("plan.components.production_recipe.cogm_error") }}
		</PTooltip>
	</div>
	<div class="col-span-6 xl:col-span-1 flex xl:justify-end">
		<PButton
			v-if="!disabled"
			:aria-label="$t('common.buttons.delete')"
			size="sm"
			type="error"
			@click="
				() => {
					emit('delete:building:recipe', localRecipeIndex);
				}
			">
			<template #icon><ClearSharp /></template>
		</PButton>
	</div>
</template>
