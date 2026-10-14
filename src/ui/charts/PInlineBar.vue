<script setup lang="ts">
	import { computed } from "vue";

	// a small bar beside a number in a table cell; decorative, the number
	// next to it carries the value
	const {
		value,
		max,
		tone = "neutral",
	} = defineProps<{
		value: number;
		max: number;
		tone?: "neutral" | "positive";
	}>();

	const width = computed(
		() => `${max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0}%`
	);
</script>

<template>
	<div aria-hidden="true" class="h-1.5 rounded-full bg-white/10">
		<div
			class="h-full rounded-r-full"
			:class="tone === 'positive' ? 'bg-positive' : 'bg-(--chart-ink)/72'"
			:style="{ width }" />
	</div>
</template>
