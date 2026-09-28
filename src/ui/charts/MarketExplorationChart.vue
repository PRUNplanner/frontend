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

	type OhlcArray = [number, number, number, number, number, number];

	const props = defineProps<{
		data: OhlcArray[];
	}>();

	const chartContainerRef = ref<HTMLElement | null>(null);
	let chart: ReturnType<typeof createChart> | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let candleSeries: ISeriesApi<"Candlestick"> | null = null;
	let volumeSeries: ISeriesApi<"Histogram"> | null = null;
	let paletteObserver: MutationObserver | null = null;

	// candle colours follow the semantic tokens in style.css
	function paletteColors() {
		const css = getComputedStyle(document.documentElement);
		const up = css.getPropertyValue("--color-positive").trim();
		const down = css.getPropertyValue("--color-negative").trim();
		return {
			upColor: up,
			downColor: down,
			wickUpColor: up,
			wickDownColor: down,
		};
	}

	const hoverData = ref({
		open: "0",
		high: "0",
		low: "0",
		close: "0",
		volume: 0,
		color: "#fff",
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
			...paletteColors(),
			borderVisible: false,
		});
		// the colour-blind preference flips data-palette on <html>
		paletteObserver = new MutationObserver(() =>
			candleSeries?.applyOptions(paletteColors())
		);
		paletteObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-palette"],
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

		const { candles, volumes } = processChartData(props.data);

		if (candleSeries) candleSeries.setData(candles);
		if (volumeSeries) volumeSeries.setData(volumes);

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
			const { candles, volumes } = processChartData(newData);

			if (candleSeries) candleSeries.setData(candles);
			if (volumeSeries) volumeSeries.setData(volumes);
		},
		{ deep: true }
	);

	onUnmounted(() => {
		paletteObserver?.disconnect();
		paletteObserver = null;
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
