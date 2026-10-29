<script setup lang="ts">
	// Types & Interfaces
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import PCheckbox from "@/ui/components/PCheckbox.vue";
	import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";

	defineProps<{
		buildingOptions: PSelectOption[];
		cogcOptions: PSelectOption[];
		outputMaterialOptions: PSelectOption[];
		inputMaterialOptions: PSelectOption[];
	}>();

	const filterBuilding = defineModel<string[]>("filterBuilding", {
		required: true,
	});
	const filterCogc = defineModel<string[]>("filterCogc", { required: true });
	const filterOutputMaterial = defineModel<string[]>("filterOutputMaterial", {
		required: true,
	});
	const filterInputMaterial = defineModel<string[]>("filterInputMaterial", {
		required: true,
	});
	const filterPositiveROI = defineModel<boolean>("filterPositiveROI", {
		required: true,
	});
</script>

<template>
	<div
		class="w-full p-3 grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] items-end border border-b-0 rounded-[3px] border-white/15">
		<div class="flex flex-col gap-1 min-w-0">
			<span class="text-xs text-muted">
				{{ $t("recipe_roi.filters.building") }}
			</span>
			<PSelectMultiple
				v-model:value="filterBuilding"
				:aria-label="$t('recipe_roi.filters.building')"
				:options="buildingOptions"
				searchable
				clearable
				class="w-full" />
		</div>
		<div class="flex flex-col gap-1 min-w-0">
			<span class="text-xs text-muted">
				{{ $t("recipe_roi.filters.cogc") }}
			</span>
			<PSelectMultiple
				v-model:value="filterCogc"
				:aria-label="$t('recipe_roi.filters.cogc')"
				:options="cogcOptions"
				searchable
				clearable
				class="w-full" />
		</div>
		<div class="flex flex-col gap-1 min-w-0">
			<span class="text-xs text-muted">
				{{ $t("recipe_roi.filters.output") }}
			</span>
			<PSelectMultiple
				v-model:value="filterOutputMaterial"
				:aria-label="$t('recipe_roi.filters.output')"
				:options="outputMaterialOptions"
				searchable
				clearable
				class="w-full" />
		</div>
		<div class="flex flex-col gap-1 min-w-0">
			<span class="text-xs text-muted">
				{{ $t("recipe_roi.filters.input") }}
			</span>
			<PSelectMultiple
				v-model:value="filterInputMaterial"
				:aria-label="$t('recipe_roi.filters.input')"
				:options="inputMaterialOptions"
				searchable
				clearable
				class="w-full" />
		</div>
		<PCheckbox
			v-model:checked="filterPositiveROI"
			class="min-h-8 pointer-coarse:min-h-11 flex items-center">
			{{ $t("recipe_roi.filters.positive_roi") }}
		</PCheckbox>
	</div>
</template>
