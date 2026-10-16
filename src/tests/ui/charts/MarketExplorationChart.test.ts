import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import MarketExplorationChart from "@/ui/charts/MarketExplorationChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { switchPalette } from "@/tests/switchPalette";

// lightweight-charts needs a canvas, the mock records the calls
const mock = vi.hoisted(() => ({
	series: [] as { options: Record<string, unknown>[]; setData: () => void }[],
	chart: {} as Record<string, Mock>,
}));
vi.mock("lightweight-charts", () => {
	const makeSeries = (options: Record<string, unknown>) => {
		const s = { options: [options], setData: vi.fn() };
		mock.series.push(s);
		return {
			setData: s.setData,
			applyOptions: (o: Record<string, unknown>) => s.options.push(o),
		};
	};
	return {
		ColorType: { Solid: "solid" },
		CandlestickSeries: "candles",
		HistogramSeries: "histogram",
		createChart: () => {
			mock.chart = {
				applyOptions: vi.fn(),
				setVisibleLogicalRange: vi.fn(),
				fitContent: vi.fn(),
				remove: vi.fn(),
			};
			return {
				addSeries: (_type: string, options: Record<string, unknown>) =>
					makeSeries(options),
				applyOptions: mock.chart.applyOptions,
				priceScale: () => ({ applyOptions: vi.fn() }),
				timeScale: () => ({
					setVisibleLogicalRange: mock.chart.setVisibleLogicalRange,
					fitContent: mock.chart.fitContent,
				}),
				subscribeCrosshairMove: vi.fn(),
				remove: mock.chart.remove,
			};
		},
	};
});

const observers: {
	callback: ResizeObserverCallback;
	observe: Mock;
	disconnect: Mock;
}[] = [];
class ResizeObserverStub {
	observe = vi.fn();
	disconnect = vi.fn();
	constructor(public callback: ResizeObserverCallback) {
		observers.push(this);
	}
}

type Ohlc = [number, number, number, number, number, number];
const bars = (n: number): Ohlc[] =>
	Array.from({ length: n }, (_, i) => [i * 86400000, 1, 2, 0.5, 1.5, 10]);

describe("MarketExplorationChart", () => {
	beforeEach(() => {
		mock.series.length = 0;
		observers.length = 0;
		// unstubGlobals resets it after every test
		vi.stubGlobal("ResizeObserver", ResizeObserverStub);
	});

	it("colours candles by sign and follows the palette", async () => {
		document.documentElement.style.setProperty("--color-positive", "#00ff00");
		document.documentElement.style.setProperty("--color-negative", "#ff0000");
		await mountComponent(MarketExplorationChart, {
			data: [[0, 1, 2, 0.5, 1.5, 10]],
		});

		const [candles] = mock.series;
		expect(candles.options[0]).toMatchObject({
			upColor: "#00ff00",
			downColor: "#ff0000",
		});

		await switchPalette("colorblind", {
			"--color-positive": "#60a5fa",
			"--color-negative": "#fb923c",
		});
		expect(candles.options.at(-1)).toMatchObject({
			upColor: "#60a5fa",
			downColor: "#fb923c",
		});
	});

	it("fits every candle once on load and keeps the zoom on resize", async () => {
		const { wrapper } = await mountComponent(MarketExplorationChart, {
			data: bars(400),
		});

		expect(mock.chart.fitContent).toHaveBeenCalledOnce();
		expect(mock.chart.setVisibleLogicalRange).not.toHaveBeenCalled();

		expect(observers).toHaveLength(1);
		const [observer] = observers;
		expect(observer.observe).toHaveBeenCalledOnce();

		mock.chart.applyOptions.mockClear();
		observer.callback(
			[{ contentRect: { width: 1280, height: 600 } } as ResizeObserverEntry],
			observer as unknown as ResizeObserver
		);
		expect(mock.chart.applyOptions).toHaveBeenCalledWith({
			width: 1280,
			height: 600,
		});
		// no refit: the user's zoom stays
		expect(mock.chart.fitContent).toHaveBeenCalledOnce();

		wrapper.unmount();
		expect(observer.disconnect).toHaveBeenCalledOnce();
		expect(mock.chart.remove).toHaveBeenCalledOnce();
	});

	it("sets data once per new array", async () => {
		const data = bars(3);
		const { setProps } = await mountComponent(MarketExplorationChart, {
			data,
		});
		const [candles, volumes] = mock.series;
		expect(candles.setData).toHaveBeenCalledOnce();

		await setProps({ data: bars(4) });
		expect(candles.setData).toHaveBeenCalledTimes(2);
		expect(volumes.setData).toHaveBeenCalledTimes(2);
	});
});
