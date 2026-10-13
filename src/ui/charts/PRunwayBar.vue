<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	const { t } = useI18n();

	// Util
	import { chartZone } from "@/ui/charts/charts.util";

	// Types & Interfaces
	import type { IChartZone } from "@/ui/charts/charts.types";

	// a bar to min(value, axis) with dashed red and yellow threshold lines;
	// "›" past the axis. With a note (e.g. "produced here") the track shows
	// the note instead of a bar.
	const {
		value,
		axis,
		red,
		yellow,
		label,
		note = "",
	} = defineProps<{
		value: number;
		axis: number;
		red: number;
		yellow: number;
		label: string;
		note?: string;
	}>();

	const FILL_CLASS: Record<IChartZone, string> = {
		red: "bg-negative",
		yellow: "bg-warning",
		none: "bg-(--chart-ink)/72",
	};

	const pct = (v: number) =>
		axis > 0 ? (Math.min(Math.max(v, 0), axis) / axis) * 100 : 0;
	const beyond = computed(() => value > axis);
</script>

<template>
	<div
		role="img"
		:aria-label="
			note
				? `${label}: ${note}`
				: beyond
					? `${label}, ${t('common.ui.runway.beyond')}`
					: label
		"
		class="flex items-center gap-x-1 min-w-24">
		<div
			class="relative grow rounded-full bg-white/10"
			:class="note ? 'h-4' : 'h-2'">
			<span
				v-if="note"
				class="absolute inset-y-0 left-2 flex items-center text-xs text-muted leading-none">
				{{ note }}
			</span>
			<template v-else>
				<div
					class="h-full rounded-full"
					:class="FILL_CLASS[chartZone(value, red, yellow)]"
					:style="{ width: `${pct(value)}%` }" />
				<div
					class="absolute -inset-y-1 border-l border-dashed border-negative"
					:style="{ left: `${pct(red)}%` }" />
				<div
					class="absolute -inset-y-1 border-l border-dashed border-warning"
					:style="{ left: `${pct(yellow)}%` }" />
			</template>
		</div>
		<span class="w-2 text-xs text-muted leading-none" aria-hidden="true">
			{{ beyond && !note ? "›" : "" }}
		</span>
	</div>
</template>
