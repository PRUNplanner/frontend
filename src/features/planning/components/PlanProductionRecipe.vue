<script setup lang="ts">
	import {
		computed,
		ComputedRef,
		PropType,
		ref,
		Ref,
		WritableComputedRef,
	} from "vue";

	// Types & Interfaces
	import {
		IProductionBuildingRecipe,
		IRecipeBuildingOption,
	} from "@/features/planning/usePlanCalculation.types";

	// Util
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { humanizeTimeMs } from "@/util/date";
	import { formatNumber } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";

	// UI
	import { PButton, PInputNumber } from "@/ui";
	import { NModal } from "naive-ui";
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
				const tickerA = a.Outputs.map((o) => o.Ticker)
					.sort()
					.join("#");
				const tickerB = b.Outputs.map((o) => o.Ticker)
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

	const cogmEnabled = computed(
		() => localRecipeData.value.cogm && localRecipeData.value.cogm.visible
	);

	const cogmWithCX = computed(() => !!props.cxUuid);
</script>

<template>
	<n-modal
		:key="`COGM#RECIPE#${recipeData.recipe.BuildingTicker}#${localRecipeIndex}`"
		v-model:show="refShowCOGM"
		preset="card"
		title="Cost Of Goods Manufactured"
		:class="cogmWithCX ? 'max-w-250' : 'max-w-150'">
		<PlanCOGM
			v-if="localRecipeData.cogm && cxUuid"
			:cogm-data="localRecipeData.cogm"
			:cx-uuid="cxUuid"
			:planet-id="planetId" />
	</n-modal>
	<div class="flex flex-col">
		<div class="pb-1">
			<PInputNumber
				v-model:value="localRecipeAmount"
				:disabled="disabled"
				show-buttons
				:min="0"
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
		<div
			v-click-outside="
				() => {
					refShowRecipeOptions = false;
				}
			"
			class="border border-pp-border p-3 flex flex-row justify-between child:my-auto hover:cursor-pointer"
			@click="refShowRecipeOptions = true">
			<div class="flex flex-col gap-1">
				<MaterialTile
					v-for="material in localRecipeData.recipe.Outputs"
					:key="`${localRecipeData.recipe.BuildingTicker}#${material.Ticker}`"
					:ticker="material.Ticker"
					:amount="material.Amount * localRecipeData.amount" />
			</div>
			<div class="text-white/50 text-xs text-end">
				<span class="font-bold">
					{{ humanizeTimeMs(localRecipeData.time) }}
				</span>
				<br />
				<span
					>{{
						formatNumber(localRecipeData.dailyShare * 100)
					}}
					%</span
				>
			</div>
		</div>
		<div
			class="relative z-10"
			:class="refShowRecipeOptions ? 'visible' : 'hidden'"
			@click.stop
		>
			<div class="absolute border border-pp-border bg-black! mt-1">
				<XNDataTable
					:data="localRecipeOptions"
					row-class-name="child:whitespace-nowrap hover:cursor-pointer"
					:bordered="false"
					:row-props="
						(recipe) => ({
							onClick: () =>
								emit(
									'update:building:recipe',
									localRecipeIndex,
									recipe.RecipeId
								),
						})
					"
				>
					<XNDataTableColumn key="Input" title="Input">
						<template #render-cell="{ rowData }">
							<div class="flex flex-row gap-1">
								<span
									v-if="rowData.RecipeId === localRecipeData.recipe.RecipeId"
									class="w-2 h-2 bg-prunplanner animate-pulse rounded-full my-auto mr-1"
								/>
								<MaterialTile
									v-for="material in rowData.Inputs"
									:key="`${rowData.BuildingTicker}#INPUT#${material.Ticker}`"
									:ticker="material.Ticker"
									:amount="material.Amount"
								/>
							</div>
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn key="TimeMs" title="Time" sorter="default">
						<template #render-cell="{ rowData }">
							{{ humanizeTimeMs(rowData.TimeMs) }}
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn key="Output" title="Output">
						<template #render-cell="{ rowData }">
							<div class="flex flex-row gap-1">
								<MaterialTile
									v-for="material in rowData.Outputs"
									:key="`${rowData.BuildingTicker}#OUTPUT#${material.Ticker}`"
									:ticker="material.Ticker"
									:amount="material.Amount" />
							</div>
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn key="dailyRevenue" title="$ / Day" sorter="default">
						<template #render-cell="{ rowData }">
							<span
								:class="
									rowData.dailyRevenue >= 0
										? 'text-positive!'
										: 'text-negative!'
								">
								{{ formatNumber(rowData.dailyRevenue) }} $
							</span>
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn key="profitPerArea" title="$ / Area" sorter="default">
						<template #render-cell="{ rowData }">
							<span
								:class="
									rowData.profitPerArea >= 0
										? 'text-positive!'
										: 'text-negative!'
								">
								{{ formatNumber(rowData.profitPerArea) }} $
							</span>
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn key="roi" title="ROI" sorter="default">
						<template #render-cell="{ rowData }">
							<span
								:class="
									rowData.roi >= 0
										? 'text-positive!'
										: 'text-negative!'
								">
								{{ formatNumber(rowData.roi ) }} d
							</span>
						</template>
					</XNDataTableColumn>
				</XNDataTable>

				<div
					class="text-xs p-2! text-white/60!">
					<strong>Revenue / Day</strong> is calculated by
					taking the daily income generated from a recipe and
					subtracting both the daily workforce cost (all
					luxuries provided) and the daily building
					degradation cost (1/180th of the construction cost).
					The income from the recipe is based on the
					difference between the input material costs and the
					output material values. <strong>$ / Area</strong> is
					the daily revenue divided by the area for one
					production building and its proportionate share of
					the area for a CM and habs required for an optimal
					base of such buildings in Recipe ROI.
					<strong>ROI (Payback)</strong> is the time required
					for a continuously operating recipe to generate
					enough revenue to offset the building's construction
					cost. This considers daily degradation and workforce
					costs as well.
				</div>
			</div>
		</div>

		<div class="flex flex-row justify-between pt-1 child:my-auto">
			<PButton
				size="sm"
				:disabled="!cogmEnabled"
				@click="
					() => {
						refShowCOGM = true;
						trackEvent('plan_tool_cogm', {
							planetNaturalId: props.planetId,
							recipeId: localRecipeData.recipeId,
						});
					}
				">
				<template #icon><AnalyticsOutlined /> </template>
			</PButton>
			<PButton
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
	</div>
</template>
