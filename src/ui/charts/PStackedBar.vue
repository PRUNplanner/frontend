<script setup lang="ts">
	import { computed } from "vue";

	// UI
	import PTooltip from "@/ui/components/PTooltip.vue";

	// Types & Interfaces
	import type { IStackedBarSegment } from "@/ui/charts/charts.types";

	// a 100 % bar of parts with 2 px gaps, rounded at the data end. From
	// hatchFrom (%) on, a hatched negative overlay marks e.g. the cost that
	// revenue doesn't cover. The default slot is the tooltip (hover, focus,
	// tap).
	const {
		segments,
		label,
		hatchFrom = undefined,
	} = defineProps<{
		segments: IStackedBarSegment[];
		label: string;
		hatchFrom?: number;
	}>();

	const shown = computed(() => segments.filter((s) => s.value > 0));
	const hatched = computed(() => hatchFrom !== undefined && hatchFrom < 100);

	const HATCH =
		"repeating-linear-gradient(135deg, var(--color-negative) 0 6px, color-mix(in srgb, var(--color-negative) 35%, transparent) 6px 10px)";
</script>

<template>
	<PTooltip>
		<template #trigger>
			<div
				role="img"
				:aria-label="label"
				class="relative flex gap-[2px] h-3 min-w-16 rounded-r-full overflow-hidden bg-white/5">
				<div
					v-for="s in shown"
					:key="s.key"
					:data-key="s.key"
					class="h-full"
					:style="{ flex: `${s.value} 1 0%`, background: s.color }" />
				<div
					v-if="hatched"
					data-key="hatch"
					class="absolute inset-y-0 right-0"
					:style="{
						left: `${Math.max(hatchFrom!, 0)}%`,
						background: HATCH,
					}" />
			</div>
		</template>
		<slot />
	</PTooltip>
</template>
