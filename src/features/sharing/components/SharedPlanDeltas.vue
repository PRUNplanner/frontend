<script setup lang="ts">
	import { computed, type PropType } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber, formatPayback } from "@/util/numbers";

	// Types & Interfaces
	import type { IPlanCompare } from "@/features/sharing/sharedPlan.types";

	const props = defineProps({
		compare: {
			type: Object as PropType<IPlanCompare>,
			required: true,
		},
	});

	// a payback that never happens is the worst
	const paybackDays = (roi: number): number =>
		Number.isFinite(roi) && roi >= 0 ? roi : Infinity;

	/**
	 * The figures that differ from the shared plan, each with its text and
	 * whether it got better (undefined: neither, e.g. more area)
	 */
	const deltas = computed(() => {
		const { before, after } = props.compare;
		const signed = (n: number, decimals = 0): string =>
			formatNumber(n, decimals, true, true);
		const list: { key: string; text: string; better?: boolean }[] = [];

		const profit: number = after.profit - before.profit;
		if (Math.abs(profit) >= 0.005)
			list.push({
				key: "profit",
				text: t("sharing.compare.profit", { delta: signed(profit, 2) }),
				better: profit > 0,
			});
		if (paybackDays(after.roi) !== paybackDays(before.roi))
			list.push({
				key: "roi",
				text: t("sharing.compare.roi", {
					from: formatPayback(before.roi),
					to: formatPayback(after.roi),
				}),
				better: paybackDays(after.roi) < paybackDays(before.roi),
			});
		(["area", "workforce", "buildings"] as const).forEach((key) => {
			const delta: number = after[key] - before[key];
			if (delta !== 0)
				list.push({
					key,
					text: t(`sharing.compare.${key}`, { delta: signed(delta) }),
				});
		});
		return list;
	});
</script>

<template>
	<div
		v-if="deltas.length"
		class="flex flex-row flex-wrap items-baseline gap-x-3 gap-y-1 text-sm tabular-nums">
		<span class="text-muted">{{ $t("sharing.compare.label") }}</span>
		<span
			v-for="d in deltas"
			:key="d.key"
			class="font-bold"
			:class="
				d.better === undefined
					? 'text-muted-strong'
					: d.better
						? 'text-positive'
						: 'text-negative'
			">
			{{ d.text }}
		</span>
	</div>
</template>
