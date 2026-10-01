<script setup lang="ts">
	import { computed, onBeforeUnmount, onMounted, ref } from "vue";
	import { useI18n } from "vue-i18n";
	import {
		Chart as ChartJS,
		Tooltip,
		BarElement,
		CategoryScale,
		LinearScale,
		type ChartData,
		type ChartOptions,
	} from "chart.js";
	import { Bar } from "vue-chartjs";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { topWithOther } from "@/ui/charts/charts.util";

	// Types & Interfaces
	import type { IChartBarItem } from "@/ui/charts/charts.types";

	ChartJS.register(Tooltip, BarElement, CategoryScale, LinearScale);

	const props = withDefaults(
		defineProps<{
			items: IChartBarItem[];
			top?: number;
		}>(),
		{ top: 10 }
	);

	const { t } = useI18n();

	const bars = computed(() =>
		topWithOther(props.items, props.top, (n) =>
			t("common.charts.other", { n })
		)
	);

	// sign and "Other" colours follow the semantic tokens in style.css
	function readTokens() {
		const css = getComputedStyle(document.documentElement);
		return {
			positive: css.getPropertyValue("--color-positive").trim(),
			negative: css.getPropertyValue("--color-negative").trim(),
			muted: css.getPropertyValue("--color-muted").trim(),
		};
	}
	const tokens = ref(readTokens());

	// the colour-blind preference flips data-palette on <html>
	let paletteObserver: MutationObserver | null = null;
	onMounted(() => {
		paletteObserver = new MutationObserver(
			() => (tokens.value = readTokens())
		);
		paletteObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-palette"],
		});
	});
	onBeforeUnmount(() => paletteObserver?.disconnect());

	const LABEL_SIZE = 12;

	// chart.js caps the value axis at ~1/4 of the chart width, so values stay
	// short: no decimals from 100 up, the unit goes into the heading
	function format(value: number): string {
		return formatNumber(value, Math.abs(value) >= 100 ? 0 : 2);
	}

	const chartData = computed<ChartData<"bar">>(() => {
		const hasOther = bars.value.length > props.top;
		return {
			labels: bars.value.map((b) => b.name),
			datasets: [
				{
					data: bars.value.map((b) => b.value),
					backgroundColor: bars.value.map((b, i) =>
						hasOther && i === props.top
							? tokens.value.muted
							: (b.color ??
								(b.value < 0
									? tokens.value.negative
									: tokens.value.positive))
					),
					borderRadius: 2,
				},
			],
		};
	});

	// no squashed bars: height grows with the bar count
	const height = computed(() => `${bars.value.length * 28 + 40}px`);

	const chartOptions = computed<ChartOptions<"bar">>(() => ({
		indexAxis: "y",
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: "rgba(15, 23, 42, 0.9)",
				padding: 12,
				borderColor: "rgba(255, 255, 255, 0.1)",
				borderWidth: 1,
				callbacks: {
					label: (ctx) => ` ${formatNumber(ctx.raw as number)}`,
				},
			},
			datalabels: { display: false },
		},
		scales: {
			x: {
				grid: { color: "rgba(255, 255, 255, 0.05)" },
				ticks: {
					color: "#999999",
					callback: (value) => {
						const n = value as number;
						if (Math.abs(n) >= 1000000)
							return (n / 1000000).toFixed(1) + "M";
						if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + "k";
						return n;
					},
				},
			},
			y: {
				grid: { display: false },
				ticks: {
					color: "#999999",
					font: { family: "monospace", size: LABEL_SIZE },
				},
				// chart.js caps a side axis at ~1/4 of the chart width and
				// clips longer labels from the left ("ther (12)" at 375 px):
				// widen the axis to the longest label, up to 45 % of the chart
				// so long plan names leave room for the bars
				afterFit: (scale) => {
					const ctx = scale.ctx;
					ctx.save();
					ctx.font = `${LABEL_SIZE}px monospace`;
					const widest = Math.max(
						...bars.value.map((b) => ctx.measureText(b.name).width)
					);
					ctx.restore();
					// tick padding (3 px) and some air
					scale.width = Math.min(
						Math.max(scale.width, Math.ceil(widest) + 12),
						scale.chart.width * 0.45
					);
				},
			},
			// values as a right-hand column level with each bar; the axis
			// sizes itself to the longest value, so no label is clipped
			values: {
				type: "category",
				position: "right",
				// bar charts only offset their own index axis
				offset: true,
				labels: bars.value.map((b) => format(b.value)),
				grid: { display: false },
				border: { display: false },
				ticks: {
					color: "#ffffff",
					font: { family: "monospace", size: 11 },
				},
			},
		},
	}));
</script>

<template>
	<div v-if="bars.length" class="w-full relative" :style="{ height }">
		<!-- remount on a new bar count, chart.js misses the height change -->
		<Bar :key="bars.length" :data="chartData" :options="chartOptions" />
	</div>
	<div v-else class="py-3 text-muted">
		{{ $t("common.charts.empty") }}
	</div>
</template>
