<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { barChartHeight } from "@/ui/charts/charts.util";

	// Types & Interfaces
	import type { IChartBarItem } from "@/ui/charts/charts.types";

	// holds EmpireBarChart's space while its chart.js chunk loads, so an
	// open "More charts" panel doesn't shift
	const props = withDefaults(
		defineProps<{
			items: IChartBarItem[];
			top?: number;
		}>(),
		{ top: 10 }
	);

	const height = computed(() =>
		barChartHeight(props.items.length, props.top)
	);
</script>

<template>
	<div v-if="items.length" class="w-full" :style="{ height }" />
	<div v-else class="py-3 text-muted">
		{{ $t("common.charts.empty") }}
	</div>
</template>
