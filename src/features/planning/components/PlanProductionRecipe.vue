<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		type PropType,
		ref,
		type Ref,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { IProductionBuildingRecipe } from "@/features/planning/usePlanCalculation.types";

	// Util
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { humanizeTimeMs } from "@/util/date";
	import { formatPercent } from "@/util/numbers";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PIcon from "@/ui/components/PIcon.vue";
	import PInputNumber from "@/ui/components/PInputNumber.vue";
	import PModal from "@/ui/components/PModal.vue";
	import PValue from "@/ui/components/PValue.vue";
	import {
		AnalyticsOutlined,
		DeleteOutlineSharp,
		EastSharp,
		ExpandLessSharp,
		ExpandMoreSharp,
	} from "@vicons/material";

	/**
	 * One order of a building: amount, recipe (opens the picker), runtime,
	 * share of the building's time, its part of the ȼ/day, COGM and delete
	 *
	 * @author jplacht
	 */
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
		// buildings of this type in the plan
		buildingAmount: {
			type: Number,
			required: false,
			default: 1,
		},
		// the recipe's ȼ per building and day, from the building's options
		// (active recipes carry none of their own)
		optionDaily: {
			type: Number,
			required: false,
			default: 0,
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
		// the picker for this row is open below it
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

	const localRecipeData: ComputedRef<IProductionBuildingRecipe> = computed(
		() => props.recipeData
	);
	// this order's part of the building's ȼ/day: the recipe's ȼ per building
	// and day (fixed costs included), by its share of the time; the rows
	// add up to the building
	const dailyProfit: ComputedRef<number> = computed(
		() =>
			props.optionDaily *
			localRecipeData.value.dailyShare *
			props.buildingAmount
	);
	const refShowCOGM: Ref<boolean> = ref(false);

	const cogmEnabled = computed(() => !!localRecipeData.value.cogm);
	const cogmWithCX = computed(() => !!props.cxUuid);

	const outputs: ComputedRef<string> = computed(() =>
		localRecipeData.value.recipe.outputs
			.map((o) => o.material_ticker)
			.join(", ")
	);

	function openCOGM(): void {
		refShowCOGM.value = true;
		trackEvent("plan:cogm_open", {
			planet_natural_id: props.planetId,
			recipe_id: localRecipeData.value.recipeId,
		});
	}
</script>

<template>
	<PModal
		:key="`COGM#RECIPE#${recipeData.recipe.building_ticker}#${recipeIndex}`"
		v-model:show="refShowCOGM"
		:title="t('plan.components.production_recipe.cogm_title')"
		:width="cogmWithCX ? 1200 : 600">
		<PlanCOGM
			v-if="localRecipeData.cogm"
			:cogm-data="localRecipeData.cogm"
			:cx-uuid="cxUuid"
			:planet-id="planetId" />
	</PModal>

	<div
		class="grid grid-cols-[5rem_minmax(0,1fr)_4.5rem_6.5rem_4.5rem_1.75rem] pointer-coarse:grid-cols-[5rem_minmax(0,1fr)_4.5rem_6.5rem_4.5rem_2.75rem] @max-[40rem]/prod:grid-cols-[5rem_minmax(0,1fr)_auto_auto_auto]! gap-x-2 @max-[40rem]/prod:gap-y-1 items-center min-h-9 py-1 @max-[40rem]/prod:py-1.5 border-t border-line/60 first:border-t-0 hover:bg-hover/40 tabular-nums"
		data-recipe-row>
		<PInputNumber
			:value="localRecipeData.amount"
			:aria-label="
				t('plan.components.production_recipe.amount_label', {
					recipe: outputs,
				})
			"
			:disabled="disabled"
			:show-buttons="!disabled"
			size="sm"
			:min="0"
			class="w-full"
			@update:value="
				(value) => {
					if (value !== null && value !== undefined)
						emit('update:building:recipe:amount', recipeIndex, value);
				}
			" />
		<!-- the whole column opens the picker: inputs → outputs on the left,
			spaced so the tiles don't touch, the opener at the right edge of
			the column, so it lines up from row to row -->
		<button
			type="button"
			class="group @max-[40rem]/prod:col-span-4 min-w-0 w-full flex items-center gap-3 min-h-9 pointer-coarse:min-h-11 px-1.5 py-1 rounded-control text-left"
			:class="[
				pickerOpen ? 'bg-hover ring-1 ring-line-strong' : '',
				disabled ? 'cursor-default' : 'cursor-pointer hover:bg-hover',
			]"
			:disabled="disabled"
			:aria-expanded="pickerOpen ? 'true' : 'false'"
			:aria-label="
				t('plan.production.change_recipe', { recipe: outputs })
			"
			data-recipe-button
			@click="emit('open:picker', recipeIndex)">
			<span
				v-if="isNew"
				class="text-xs font-bold uppercase text-positive">
				{{ t("sharing.compare.new") }}
			</span>
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
				<span
					v-if="localRecipeData.recipe.inputs.length"
					class="flex flex-wrap items-center gap-1.5"
					data-recipe-inputs>
					<MaterialTile
						v-for="material in localRecipeData.recipe.inputs"
						:key="`IN#${material.material_ticker}`"
						:ticker="material.material_ticker"
						:amount="material.material_amount * localRecipeData.amount"
						disable-drawer
						:enable-popover="false" />
				</span>
				<span
					class="flex flex-wrap items-center gap-1.5"
					data-recipe-outputs>
					<!-- the arrow wraps with the outputs, never alone -->
					<PIcon
						v-if="localRecipeData.recipe.inputs.length"
						:size="16"
						aria-hidden="true"
						class="text-muted">
						<EastSharp />
					</PIcon>
					<MaterialTile
						v-for="material in localRecipeData.recipe.outputs"
						:key="`OUT#${material.material_ticker}`"
						:ticker="material.material_ticker"
						:amount="material.material_amount * localRecipeData.amount"
						disable-drawer
						:enable-popover="false" />
				</span>
			</span>
			<span
				v-if="!disabled"
				class="ml-auto shrink-0 flex items-center gap-0.5 h-6 pl-2 pr-1 rounded-control border border-line text-xs text-muted-strong group-hover:border-line-strong group-hover:text-ink-strong"
				:class="pickerOpen ? 'border-line-strong text-ink-strong' : ''">
				{{ t("plan.production.recipe") }}
				<PIcon :size="16">
					<ExpandLessSharp v-if="pickerOpen" />
					<ExpandMoreSharp v-else />
				</PIcon>
			</span>
		</button>
		<!-- runtime over share, one column: the tiles get the room; a phone
			puts them side by side on a second line with COGM and delete -->
		<span
			class="flex flex-col items-end @max-[40rem]/prod:flex-row @max-[40rem]/prod:items-center @max-[40rem]/prod:gap-2 @max-[40rem]/prod:col-span-2 @max-[40rem]/prod:justify-self-start text-xs leading-4 text-muted-strong text-nowrap">
			<span>{{ humanizeTimeMs(localRecipeData.time) }}</span>
			<span class="text-ink">
				{{ formatPercent(localRecipeData.dailyShare * 100, 1) }}
			</span>
		</span>
		<!-- under the building's ȼ/day column -->
		<span
			class="text-right text-xs"
			:title="t('plan.production.recipe_daily')"
			data-recipe-daily>
			<!-- an order that never runs (0 % of the time) earns nothing itself -->
			<PValue v-if="localRecipeData.dailyShare > 0" :value="dailyProfit" />
			<span v-else class="text-muted">—</span>
		</span>
		<PButton
			size="sm"
			type="ghost"
			class="justify-self-end pointer-coarse:h-11 border border-link/40 pointer-coarse:border-transparent text-link! disabled:text-link/40!"
			:disabled="!cogmEnabled"
			:aria-label="
				t('plan.production.cogm_label', { recipe: outputs })
			"
			@click="openCOGM">
			<template #icon><AnalyticsOutlined /></template>
			{{ t("plan.components.production_recipe.buttons.cogm") }}
		</PButton>
		<button
			v-if="!disabled"
			type="button"
			class="touch-target flex items-center justify-center size-6 pointer-coarse:size-11 rounded-control text-muted hover:text-negative hover:bg-negative/10 cursor-pointer"
			:aria-label="t('plan.production.delete_recipe', { recipe: outputs })"
			@click="emit('delete:building:recipe', recipeIndex)">
			<PIcon :size="16"><DeleteOutlineSharp /></PIcon>
		</button>
	</div>
</template>
