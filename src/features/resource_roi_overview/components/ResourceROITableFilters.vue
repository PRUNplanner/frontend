<script setup lang="ts">
	import { computed, type PropType } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PCheckbox, PSelect } from "@/ui";

	const props = defineProps({
		searchedMaterial: {
			type: String,
			required: true,
		},
		filterPlanet: {
			type: null as unknown as PropType<string | null>,
			required: false,
			default: null,
		},
		filterBuilding: {
			type: null as unknown as PropType<string | null>,
			required: false,
			default: null,
		},
		filterPositiveROI: {
			type: Boolean,
			required: true,
		},
		planetOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
		buildingOptions: {
			type: Array as PropType<PSelectOption[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:filterPlanet", value: string | null): void;
		(e: "update:filterBuilding", value: string | null): void;
		(e: "update:filterPositiveROI", value: boolean): void;
	}>();

	const localFilterPlanet = computed({
		get: () => props.filterPlanet,
		set: (v: string | null) => emit("update:filterPlanet", v),
	});

	const localFilterBuilding = computed({
		get: () => props.filterBuilding,
		set: (v: string | null) => emit("update:filterBuilding", v),
	});

	const localFilterPositiveROI = computed({
		get: () => props.filterPositiveROI,
		set: (v: boolean) => emit("update:filterPositiveROI", v),
	});
</script>

<template>
	<div
		class="border border-b-0 rounded-[3px] border-white/15 p-3 flex flex-row gap-3 flex-wrap justify-between">
		<div class="flex flex-row flex-wrap gap-3 child:my-auto">
			<div class="font-bold pr-3">Filter</div>
			<div class="flex flex-row flex-wrap gap-3 child:my-auto">
				<div>Planet</div>
				<PSelect
					v-model:value="localFilterPlanet"
					:options="planetOptions"
					searchable
					clearable
					class="w-50" />
			</div>
			<div class="flex flex-row flex-wrap gap-3 child:my-auto">
				<div>Building</div>
				<PSelect
					v-model:value="localFilterBuilding"
					:options="buildingOptions"
					searchable
					clearable
					class="w-50" />
			</div>
			<div class="flex flex-row flex-wrap gap-3 child:my-auto">
				<div>Positive ROI</div>
				<PCheckbox v-model:checked="localFilterPositiveROI" />
			</div>
		</div>
		<div class="flex flex-row flex-wrap gap-3 pr-3">
			<div class="my-auto font-bold">Searched Material</div>
			<div>
				<MaterialTile
					:key="searchedMaterial"
					:ticker="searchedMaterial" />
			</div>
		</div>
	</div>
</template>
