<script setup lang="ts">
	import { computed, type PropType } from "vue";

	// Types & Interfaces
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import PCheckbox from "@/ui/components/PCheckbox.vue";
	import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";

	const props = defineProps({
		filterBuilding: {
			type: null as unknown as PropType<string[]>,
			required: false,
			default: null,
		},
		filterCogc: {
			type: null as unknown as PropType<string[]>,
			required: false,
			default: null,
		},
		filterOutputMaterial: {
			type: null as unknown as PropType<string[]>,
			required: false,
			default: null,
		},
		filterInputMaterial: {
			type: null as unknown as PropType<string[]>,
			required: false,
			default: null,
		},
		filterPositiveROI: {
			type: Boolean,
			required: true,
		},
		buildingOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
		cogcOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
		outputMaterialOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
		inputMaterialOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:filterBuilding", value: string[]): void;
		(e: "update:filterCogc", value: string[]): void;
		(e: "update:filterOutputMaterial", value: string[]): void;
		(e: "update:filterInputMaterial", value: string[]): void;
		(e: "update:filterPositiveROI", value: boolean): void;
	}>();

	const localFilterBuilding = computed({
		get: () => props.filterBuilding,
		set: (v: string[]) => emit("update:filterBuilding", v),
	});
	const localFilterCogc = computed({
		get: () => props.filterCogc,
		set: (v: string[]) => emit("update:filterCogc", v),
	});
	const localFilterOutputMaterial = computed({
		get: () => props.filterOutputMaterial,
		set: (v: string[]) => emit("update:filterOutputMaterial", v),
	});
	const localFilterInputMaterial = computed({
		get: () => props.filterInputMaterial,
		set: (v: string[]) => emit("update:filterInputMaterial", v),
	});
	const localFilterPositiveROI = computed({
		get: () => props.filterPositiveROI,
		set: (v: boolean) => emit("update:filterPositiveROI", v),
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
				v-model:value="localFilterBuilding"
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
				v-model:value="localFilterCogc"
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
				v-model:value="localFilterOutputMaterial"
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
				v-model:value="localFilterInputMaterial"
				:aria-label="$t('recipe_roi.filters.input')"
				:options="inputMaterialOptions"
				searchable
				clearable
				class="w-full" />
		</div>
		<PCheckbox
			v-model:checked="localFilterPositiveROI"
			class="min-h-8 pointer-coarse:min-h-11 flex items-center">
			{{ $t("recipe_roi.filters.positive_roi") }}
		</PCheckbox>
	</div>
</template>
