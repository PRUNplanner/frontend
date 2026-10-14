<script setup lang="ts">
	import { computed } from "vue";

	// a small bar beside a number in a table cell; decorative, the number
	// next to it carries the value
	const {
		value,
		max,
		tone = "neutral",
		marks = [],
	} = defineProps<{
		value: number;
		max: number;
		tone?: "neutral" | "positive" | "negative" | "warning";
		// dashed thresholds on the same scale as value
		marks?: number[];
	}>();

	const TONE = {
		neutral: "bg-(--chart-ink)/72",
		positive: "bg-positive",
		negative: "bg-negative",
		warning: "bg-warning",
	};

	const pct = (v: number) =>
		`${max > 0 ? Math.min(Math.max(v / max, 0), 1) * 100 : 0}%`;
	const width = computed(() => pct(value));
</script>

<template>
	<div aria-hidden="true" class="relative h-1.5 rounded-full bg-white/10">
		<div
			class="h-full rounded-r-full"
			:class="TONE[tone]"
			:style="{ width }" />
		<div
			v-for="m in marks"
			:key="m"
			class="absolute -inset-y-1 border-l border-dashed border-white/40"
			:style="{ left: pct(m) }" />
	</div>
</template>
