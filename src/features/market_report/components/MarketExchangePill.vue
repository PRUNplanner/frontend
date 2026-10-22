<script setup lang="ts">
	// Composables
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// an exchange code tinted in its exchange colour
	const { code } = defineProps<{ code: string }>();
	const theme = useChartTheme();
</script>

<template>
	<span
		class="inline-flex items-center h-5.5 px-1.75 rounded-control text-xs font-medium"
		:style="{
			color: theme.exchange(code),
			background: `color-mix(in srgb, ${theme.exchange(code)} 16%, transparent)`,
		}">
		{{ code }}
	</span>
</template>
