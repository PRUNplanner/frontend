<script setup lang="ts">
	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Types & Interfaces
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PCheckbox, PSelect } from "@/ui";

	defineProps<{
		searchedMaterial: string;
		planetOptions: PSelectOption[];
		buildingOptions: PSelectOption[];
	}>();

	const filterPlanet = defineModel<string | null>("filterPlanet", {
		default: null,
	});
	const filterBuilding = defineModel<string | null>("filterBuilding", {
		default: null,
	});
	const filterPositiveROI = defineModel<boolean>("filterPositiveROI", {
		required: true,
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
					v-model:value="filterPlanet"
					:aria-label="$t('resource_roi.table.planet')"
					:options="planetOptions"
					searchable
					clearable
					class="w-50" />
			</div>
			<div class="flex flex-row flex-wrap gap-3 child:my-auto">
				<div>Building</div>
				<PSelect
					v-model:value="filterBuilding"
					:aria-label="$t('resource_roi.table.building')"
					:options="buildingOptions"
					searchable
					clearable
					class="w-50" />
			</div>
			<div class="flex flex-row flex-wrap gap-3 child:my-auto">
				<div>Positive ROI</div>
				<PCheckbox
					v-model:checked="filterPositiveROI"
					:aria-label="$t('recipe_roi.filters.positive_roi')" />
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
