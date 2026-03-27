<script setup lang="ts">
	import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
	import {
		createChart,
		ColorType,
		type ISeriesApi,
		CandlestickSeries,
		HistogramSeries,
	} from "lightweight-charts";

	type OhlcArray = [number, number, number, number, number, number];

	const props = defineProps<{
		data: OhlcArray[];
	}>();

	const chartContainerRef = ref<HTMLElement | null>(null);
	let chart: ReturnType<typeof createChart> | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let candleSeries: ISeriesApi<"Candlestick"> | null = null;
	let volumeSeries: ISeriesApi<"Histogram"> | null = null;

	const hoverData = ref({
		open: "0",
		high: "0",
		low: "0",
		close: "0",
		volume: 0,
		color: "#fff",
		price: false,
	});

	// Transformation function: [ms, o, h, l, c] -> { time, open, high, low, close }
	const transformCandleData = (raw: OhlcArray[]) => {
		return raw
			.map(([time, open, high, low, close]) => ({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				time: (time / 1000) as any,
				open,
				high,
				low,
				close,
			}))
			.sort((a, b) => a.time - b.time);
	};

	const transformVolumeData = (raw: OhlcArray[]) => {
		return raw
			.map(([time, _open, _high, _low, _close, volume]) => {
				return {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					time: (time / 1000) as any,
					value: volume,
				};
			})
			.sort((a, b) => a.time - b.time);
	};

	onMounted(async () => {
		if (!chartContainerRef.value) return;

		await nextTick();

		const initialWidth = chartContainerRef.value.clientWidth || 800;
		const initialHeight = chartContainerRef.value.clientHeight || 600;

		chart = createChart(chartContainerRef.value, {
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: "#94a3b8",
			},
			grid: {
				vertLines: { color: "rgba(148, 163, 184, 0.05)" },
				horzLines: { color: "rgba(148, 163, 184, 0.05)" },
			},
			width: initialWidth,
			height: initialHeight,
			timeScale: {
				borderColor: "rgba(148, 163, 184, 0.2)",
				timeVisible: true,
				rightOffset: 12,
			},
		});

		candleSeries = chart.addSeries(CandlestickSeries, {
			upColor: "#4ade80",
			downColor: "#f87171",
			borderVisible: false,
			wickUpColor: "#4ade80",
			wickDownColor: "#f87171",
		});

		volumeSeries = chart.addSeries(HistogramSeries, {
			color: "#3b82f6",
			priceFormat: { type: "volume" },
			priceScaleId: "volume",
			visible: true,
		});

		chart.priceScale("volume").applyOptions({
			scaleMargins: {
				top: 0.8,
				bottom: 0,
			},
		});

		candleSeries.setData(transformCandleData(props.data));
		volumeSeries.setData(transformVolumeData(props.data));

		resizeObserver = new ResizeObserver((entries) => {
			if (entries.length === 0 || !chart) return;
			const { width, height } = entries[0].contentRect;
			if (height > 0) {
				chart.applyOptions({ width, height });
			}
		});
		resizeObserver.observe(chartContainerRef.value);

		setTimeout(() => {
			if (chart && props.data.length > 0) {
				const totalBars = props.data.length;
				chart.timeScale().setVisibleLogicalRange({
					from: totalBars - 180,
					to: totalBars,
				});
			}
		}, 50);

		chart.subscribeCrosshairMove((param) => {
			if (!param.time || !candleSeries || !volumeSeries) {
				return;
			}
			const priceData = param.seriesData.get(candleSeries);

			if (priceData && "open" in priceData) {
				hoverData.value.open = priceData.open.toFixed(2);
				hoverData.value.high = priceData.high.toFixed(2);
				hoverData.value.low = priceData.low.toFixed(2);
				hoverData.value.close = priceData.close.toFixed(2);
				hoverData.value.color =
					priceData.close >= priceData.open ? "#4ade80" : "#f87171";
				hoverData.value.price = true;
			}

			const volData = param.seriesData.get(volumeSeries);
			if (volData && "value" in volData) {
				hoverData.value.volume = volData.value;
			}
		});

		resizeObserver = new ResizeObserver((entries) => {
			if (entries.length === 0 || !chart || !chartContainerRef.value)
				return;

			const { width, height } = entries[0].contentRect;

			if (height > 0) {
				chart.applyOptions({ width, height });
			}

			chart.timeScale().fitContent();
		});

		resizeObserver.observe(chartContainerRef.value);

		requestAnimationFrame(() => {
			if (chart && props.data.length > 0) {
				chart.timeScale().setVisibleLogicalRange({
					from: props.data.length - 365,
					to: props.data.length,
				});
			}
		});
	});

	watch(
		() => props.data,
		(newData) => {
			if (candleSeries)
				candleSeries.setData(transformCandleData(newData));
			if (volumeSeries)
				volumeSeries.setData(transformVolumeData(newData));
		},
		{ deep: true }
	);

	onUnmounted(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}
		if (chart) {
			chart.remove();
			chart = null;
		}
	});
</script>

<template>
	<div
		class="financial-chart-wrapper relative h-[600px] w-full overflow-hidden">
		<div
			class="absolute top-2 left-2 z-10 flex gap-4 font-mono text-xs pointer-events-none">
			<div v-if="hoverData.price" class="flex gap-2">
				<span class="text-slate-500">Open:</span>
				<span :style="{ color: hoverData.color }">
					{{ hoverData.open }}
				</span>
				<span class="text-slate-500">High:</span>
				<span :style="{ color: hoverData.color }">
					{{ hoverData.high }}
				</span>
				<span class="text-slate-500">Low:</span>
				<span :style="{ color: hoverData.color }">
					{{ hoverData.low }}
				</span>
				<span class="text-slate-500">Close:</span>
				<span :style="{ color: hoverData.color }">
					{{ hoverData.close }}
				</span>
			</div>
			<div
				v-if="hoverData.volume"
				class="flex gap-2 border-l border-slate-700 pl-4">
				<span class="text-slate-500">Volume:</span>
				<span class="text-blue-400">
					{{ hoverData.volume.toLocaleString() }}
				</span>
			</div>
		</div>

		<div ref="chartContainerRef" class="h-full w-full"></div>
	</div>
</template>

<style scoped>
	.financial-chart-wrapper {
		min-height: 400px;
	}
</style>
