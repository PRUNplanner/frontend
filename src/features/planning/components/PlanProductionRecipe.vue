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
	import {
		AnalyticsOutlined,
		DeleteOutlineSharp,
		ExpandMoreSharp,
	} from "@vicons/material";

	/**
	 * One order of a building: amount, recipe (opens the picker), runtime,
	 * share of the building's time, COGM and delete
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
		class="grid grid-cols-[5rem_minmax(0,1fr)_4rem_1.75rem_1.75rem] pointer-coarse:grid-cols-[5rem_minmax(0,1fr)_4rem_2.75rem_2.75rem] gap-x-2 items-center min-h-9 py-0.5 tabular-nums"
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
		<button
			type="button"
			class="justify-self-start min-w-0 max-w-full flex flex-wrap items-center gap-1 min-h-7 pointer-coarse:min-h-11 px-1.5 rounded-control border text-left"
			:class="[
				pickerOpen
					? 'border-line-strong bg-hover'
					: 'border-transparent',
				disabled ? 'cursor-default' : 'cursor-pointer hover:border-line-strong',
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
				class="text-xs font-bold uppercase text-positive pr-1">
				{{ t("sharing.compare.new") }}
			</span>
			<MaterialTile
				v-for="material in localRecipeData.recipe.inputs"
				:key="`IN#${material.material_ticker}`"
				:ticker="material.material_ticker"
				:amount="material.material_amount * localRecipeData.amount"
				disable-drawer
				:enable-popover="false" />
			<span
				v-if="localRecipeData.recipe.inputs.length"
				aria-hidden="true"
				class="px-0.5 text-muted">
				→
			</span>
			<MaterialTile
				v-for="material in localRecipeData.recipe.outputs"
				:key="`OUT#${material.material_ticker}`"
				:ticker="material.material_ticker"
				:amount="material.material_amount * localRecipeData.amount"
				disable-drawer
				:enable-popover="false" />
			<PIcon v-if="!disabled" :size="14" class="text-muted">
				<ExpandMoreSharp />
			</PIcon>
		</button>
		<!-- runtime over share, one column: the tiles get the room -->
		<span
			class="flex flex-col items-end text-xs leading-4 text-muted-strong text-nowrap">
			<span>{{ humanizeTimeMs(localRecipeData.time) }}</span>
			<span class="flex items-center gap-1.5">
				<span
					class="h-1 w-4 shrink-0 overflow-hidden rounded-full bg-white/5"
					aria-hidden="true">
					<span
						class="block h-full bg-(--chart-ink)/55"
						:style="{ width: `${localRecipeData.dailyShare * 100}%` }" />
				</span>
				{{ formatPercent(localRecipeData.dailyShare * 100, 1) }}
			</span>
		</span>
		<PButton
			size="sm"
			type="ghost"
			class="justify-self-end size-6 pointer-coarse:size-11 border border-link/40 text-link! disabled:text-link/40!"
			:disabled="!cogmEnabled"
			:aria-label="
				t('plan.production.cogm_label', { recipe: outputs })
			"
			:title="t('plan.components.production_recipe.buttons.cogm')"
			@click="openCOGM">
			<template #icon><AnalyticsOutlined /></template>
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
