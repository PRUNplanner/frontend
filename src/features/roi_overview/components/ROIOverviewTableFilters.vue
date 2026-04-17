<script setup lang="ts">
	import { computed, PropType } from "vue";

	// Types & Interfaces
	import { PSelectOption } from "@/ui/ui.types";

	// UI
	import PSelect from "@/ui/components/PSelect.vue";
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
		class="w-full p-3 flex flex-row gap-3 flex-wrap items-center justify-between border border-b-0 rounded-[3px] border-white/15">
		<div class="flex flex-row flex-wrap items-center gap-3">
			<div class="font-bold pr-3">Filter</div>
			<div class="flex flex-row gap-3 child:my-auto">
				<div>Building</div>
				<PSelectMultiple
					v-model:value="localFilterBuilding"
					:options="buildingOptions"
					searchable
					clearable
					class="w-40" />
			</div>
			<div class="flex flex-row gap-3 child:my-auto">
				<div>COGC</div>
				<PSelectMultiple
					v-model:value="localFilterCogc"
					:options="cogcOptions"
					searchable
					clearable
					class="w-50" />
			</div>
			<div class="flex flex-row gap-3 child:my-auto">
				<div>Output</div>
				<PSelectMultiple
					v-model:value="localFilterOutputMaterial"
					:options="outputMaterialOptions"
					searchable
					clearable
					class="w-75" />
			</div>
			<div class="flex flex-row gap-3 child:my-auto">
				<div>Input</div>
				<PSelectMultiple
					v-model:value="localFilterInputMaterial"
					:options="inputMaterialOptions"
					searchable
					clearable
					class="w-75" />
			</div>
		</div>
		<div class="flex flex-row flex-wrap gap-3 items-center">
			<div>Positive ROI</div>
			<PCheckbox v-model:checked="localFilterPositiveROI" />
		</div>
	</div>
</template>
