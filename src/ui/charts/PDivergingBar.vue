<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// a bar from a centre line, left for negative and right for positive
	// values, scaled to maxAbs per side. `mirror` draws −|value| and
	// +|value| (a tornado row). A label sits inside its bar when the bar
	// fills at least 40 % of its side, else beside it; a narrow chart
	// hides the labels.
	const {
		value,
		maxAbs,
		mirror = false,
		format = (v: number) => formatNumber(v, 0, false, true),
	} = defineProps<{
		value: number;
		maxAbs: number;
		mirror?: boolean;
		format?: (v: number) => string;
	}>();

	const INSIDE = 0.4;

	const parts = computed(() =>
		(mirror ? [-Math.abs(value), Math.abs(value)] : [value])
			.filter((v) => v !== 0)
			.map((v) => {
				const share = maxAbs > 0 ? Math.min(Math.abs(v) / maxAbs, 1) : 0;
				const side = v < 0 ? "right" : "left";
				return {
					value: v,
					label: format(v),
					inside: share >= INSIDE,
					bar: { [side]: "50%", width: `${share * 50}%` },
					outside: { [side]: `calc(50% + ${share * 50}% + 4px)` },
				};
			})
	);
</script>

<template>
	<div
		role="img"
		:aria-label="parts.map((p) => p.label).join(' / ')"
		class="@container relative h-6 min-w-24">
		<div
			class="absolute inset-y-0 left-1/2 border-l border-(--chart-axis)" />
		<template v-for="p in parts" :key="p.value">
			<div
				class="absolute top-1 h-4 flex items-center"
				:class="
					p.value < 0
						? 'bg-negative rounded-l justify-start'
						: 'bg-positive rounded-r justify-end'
				"
				:style="p.bar">
				<span
					v-if="p.inside"
					class="px-1 text-xs font-bold text-black tabular-nums leading-none whitespace-nowrap @max-[240px]:hidden">
					{{ p.label }}
				</span>
			</div>
			<span
				v-if="!p.inside"
				class="absolute inset-y-0 flex items-center text-xs tabular-nums whitespace-nowrap @max-[240px]:hidden"
				:class="p.value < 0 ? 'text-negative' : 'text-positive'"
				:style="p.outside">
				{{ p.label }}
			</span>
		</template>
	</div>
</template>
