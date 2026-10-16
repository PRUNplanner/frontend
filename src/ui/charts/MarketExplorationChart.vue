<script setup lang="ts">
	import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
	import {
		createChart,
		ColorType,
		type ISeriesApi,
		CandlestickSeries,
		HistogramSeries,
		type CandlestickData,
		type HistogramData,
		type Time,
	} from "lightweight-charts";

	// Util
	import { useChartTheme } from "@/ui/charts/chartTheme";

	type OhlcArray = [number, number, number, number, number, number];

	const props = defineProps<{
		data: OhlcArray[];
	}>();

	const chartContainerRef = ref<HTMLElement | null>(null);
	let chart: ReturnType<typeof createChart> | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let candleSeries: ISeriesApi<"Candlestick"> | null = null;
	let volumeSeries: ISeriesApi<"Histogram"> | null = null;

	const theme = useChartTheme();

	// candle colours follow the colour-blind preference
	function candleColors() {
		const { positive, negative } = theme.value;
		return {
			upColor: positive,
			downColor: negative,
			wickUpColor: positive,
			wickDownColor: negative,
		};
	}

	function layoutColors() {
		const { muted, grid, axis } = theme.value;
		return {
			layout: {
				background: { type: ColorType.Solid, color: "transparent" },
				textColor: muted,
			},
			grid: {
				vertLines: { color: grid },
				horzLines: { color: grid },
			},
			rightPriceScale: { borderColor: axis },
			timeScale: { borderColor: axis },
		};
	}

	watch(theme, () => {
		chart?.applyOptions(layoutColors());
		candleSeries?.applyOptions(candleColors());
		volumeSeries?.applyOptions({ color: theme.value.muted });
	});

	const hoverData = ref({
		open: "0",
		high: "0",
		low: "0",
		close: "0",
		volume: 0,
		color: "",
		price: false,
	});

	const processChartData = (raw: OhlcArray[]) => {
		const total = raw.length;
		const candles: CandlestickData[] = new Array(total);
		const volumes: HistogramData[] = new Array(total);

		for (let i = 0; i < total; i++) {
			const [ms, open, high, low, close, volume] = raw[i];
			const timeInSeconds = (ms / 1000) as Time;

			candles[i] = {
				time: timeInSeconds,
				open,
				high,
				low,
				close,
			};

			volumes[i] = {
				time: timeInSeconds,
				value: volume,
			};
		}

		return { candles, volumes };
	};

	onMounted(async () => {
		if (!chartContainerRef.value) return;

		await nextTick();

		const initialWidth = chartContainerRef.value.clientWidth || 800;
		const initialHeight = chartContainerRef.value.clientHeight || 600;

		const colors = layoutColors();
		chart = createChart(chartContainerRef.value, {
			...colors,
			width: initialWidth,
			height: initialHeight,
			timeScale: {
				...colors.timeScale,
				timeVisible: true,
				rightOffset: 12,
			},
		});

		candleSeries = chart.addSeries(CandlestickSeries, {
			...candleColors(),
			borderVisible: false,
		});

		volumeSeries = chart.addSeries(HistogramSeries, {
			color: theme.value.muted,
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

		const { candles, volumes } = processChartData(props.data);

		if (candleSeries) candleSeries.setData(candles);
		if (volumeSeries) volumeSeries.setData(volumes);

		// every candle on load; a resize keeps the user's zoom
		chart.timeScale().fitContent();

		resizeObserver = new ResizeObserver((entries) => {
			if (entries.length === 0 || !chart) return;
			const { width, height } = entries[0].contentRect;
			if (height > 0) {
				chart.applyOptions({ width, height });
			}
		});
		resizeObserver.observe(chartContainerRef.value);

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
					priceData.close >= priceData.open
						? "var(--color-positive)"
						: "var(--color-negative)";
				hoverData.value.price = true;
			}

			const volData = param.seriesData.get(volumeSeries);
			if (volData && "value" in volData) {
				hoverData.value.volume = volData.value;
			}
		});
	});

	// the prop is replaced on change, never mutated
	watch(
		() => props.data,
		(newData) => {
			const { candles, volumes } = processChartData(newData);

			if (candleSeries) candleSeries.setData(candles);
			if (volumeSeries) volumeSeries.setData(volumes);
		}
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
				<span class="text-muted">
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
