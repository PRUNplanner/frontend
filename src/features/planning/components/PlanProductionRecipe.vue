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

	// Util
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { hasOutputTwin } from "@/features/planning/recipeOutputs.util";
	import { humanizeTimeMs } from "@/util/date";
	import { formatPercent } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PInputNumber from "@/ui/components/PInputNumber.vue";
	import PModal from "@/ui/components/PModal.vue";
	import { ClearSharp, AnalyticsOutlined } from "@vicons/material";

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
		// a recipe the shared plan didn't have
		isNew: {
			type: Boolean,
			required: false,
			default: false,
		},
		// the inline recipe picker under this row is open
		pickerOpen: {
			type: Boolean,
			required: false,
			default: false,
		},
	});

	const emit = defineEmits<{
		(
			e: "update:building:recipe:amount",
			index: number,
			value: number
		): void;
		(e: "delete:building:recipe", index: number): void;
		(e: "open:picker", index: number): void;
	}>();

	// Local State
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
	const refShowCOGM: Ref<boolean> = ref(false);

	const cogmEnabled = computed(() => !!localRecipeData.value.cogm);

	const cogmWithCX = computed(() => !!props.cxUuid);

	// recipes that only differ in their inputs show them in the row
	const showInputs: ComputedRef<boolean> = computed(() =>
		hasOutputTwin(props.recipeData.recipe, props.recipeOptions)
	);

	const outputs: ComputedRef<string> = computed(() =>
		localRecipeData.value.recipe.outputs
			.map((o) => o.material_ticker)
			.join(", ")
	);
</script>

<template>
	<PModal
		:key="`COGM#RECIPE#${recipeData.recipe.building_ticker}#${localRecipeIndex}`"
		v-model:show="refShowCOGM"
		:title="t('plan.components.production_recipe.cogm_title')"
		:width="cogmWithCX ? 1200 : 600">
		<PlanCOGM
			v-if="localRecipeData.cogm"
			:cogm-data="localRecipeData.cogm"
			:cx-uuid="cxUuid"
			:planet-id="planetId" />
	</PModal>

	<!-- below xl: line 2, first; at xl: first column -->
	<div class="col-1 row-2 xl:row-1 w-24">
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
			class="w-full"
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

	<button
		type="button"
		class="col-span-full row-1 xl:col-2 xl:pl-3 min-w-0 flex items-center gap-1 group justify-between text-left enabled:cursor-pointer"
		:disabled="disabled"
		:aria-expanded="disabled ? undefined : pickerOpen ? 'true' : 'false'"
		:aria-label="t('plan.production.change_recipe', { recipe: outputs })"
		data-recipe-button
		@click="emit('open:picker', recipeIndex)">
		<span class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
			<span
				v-if="isNew"
				class="text-xs font-bold uppercase text-positive pr-1">
				{{ $t("sharing.compare.new") }}
			</span>
			<span v-if="showInputs" class="flex flex-wrap gap-1">
				<MaterialTile
					v-for="material in localRecipeData.recipe.inputs"
					:key="`${localRecipeData.recipe.building_ticker}#ROW#INPUT#${material.material_ticker}`"
					:ticker="material.material_ticker"
					:amount="
						material.material_amount *
						localRecipeData.amount
					"
					disable-drawer
					:enable-popover="false" />
			</span>
			<!-- the arrow stays with the outputs when they wrap below -->
			<span class="flex items-center gap-2">
				<span
					v-if="showInputs"
					aria-hidden="true"
					class="text-muted">
					→
				</span>
				<span class="flex flex-wrap gap-1">
					<MaterialTile
						v-for="material in localRecipeData.recipe.outputs"
						:key="`${localRecipeData.recipe.building_ticker}#${material.material_ticker}`"
						:ticker="material.material_ticker"
						:amount="
							material.material_amount *
							localRecipeData.amount
						"
						disable-drawer
						:enable-popover="false" />
				</span>
			</span>
		</span>
		<span v-if="!disabled" class="pr-3">
			<svg
				viewBox="0 0 24 24"
				fill="currentColor"
				class="w-5 h-5 text-white/80 transition-colors duration-200 group-hover:text-prunplanner"
				aria-hidden="true">
				<path d="M12 16L6 8H18L12 16Z" />
			</svg>
		</span>
	</button>

	<div class="col-2 row-2 xl:col-3 xl:row-1 text-xs text-white/80">
		{{ humanizeTimeMs(localRecipeData.time) }}
	</div>
	<div
		class="col-3 row-2 xl:col-4 xl:row-1 xl:pr-3 min-w-0 flex flex-row gap-x-3 items-center">
		<template v-if="localRecipeData.dailyShare != 1">
			<!-- phones: percentage only, the bar would be a sliver -->
			<div
				class="hidden sm:block h-1.5 w-full overflow-hidden rounded-full bg-white/5">
				<div
					class="bg-prunplanner h-full transition-all duration-500 ease-out"
					:style="`width: ${localRecipeData.dailyShare * 100}%`" />
			</div>
			<div class="text-xs text-white/80 text-nowrap">
				{{ formatPercent(localRecipeData.dailyShare * 100) }}
			</div>
		</template>
	</div>
	<div
		class="col-4 row-2 xl:col-5 xl:row-1 flex justify-end items-center gap-3">
		<PButton
			size="sm"
			:aria-label="
				$t('plan.components.production_recipe.buttons.cogm')
			"
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
			<span class="hidden sm:inline">
				{{
					$t("plan.components.production_recipe.buttons.cogm")
				}}
			</span>
		</PButton>
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
