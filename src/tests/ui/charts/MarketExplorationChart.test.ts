import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import MarketExplorationChart from "@/ui/charts/MarketExplorationChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { switchPalette } from "@/tests/switchPalette";

// lightweight-charts needs a canvas, the mock records the calls
const mock = vi.hoisted(() => ({
	series: [] as {
		options: Record<string, unknown>[];
		setData: () => void;
		api: object;
	}[],
	chart: {} as Record<string, Mock>,
	createOptions: [] as Record<string, unknown>[],
	crosshair: undefined as ((param: unknown) => void) | undefined,
}));
vi.mock("lightweight-charts", () => {
	const makeSeries = (options: Record<string, unknown>) => {
		const s = { options: [options], setData: vi.fn(), api: {} };
		mock.series.push(s);
		s.api = {
			setData: s.setData,
			applyOptions: (o: Record<string, unknown>) => s.options.push(o),
		};
		return s.api;
	};
	return {
		ColorType: { Solid: "solid" },
		CandlestickSeries: "candles",
		HistogramSeries: "histogram",
		createChart: (_el: unknown, options: Record<string, unknown>) => {
			mock.createOptions.push(options);
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
				subscribeCrosshairMove: (cb: (param: unknown) => void) => {
					mock.crosshair = cb;
				},
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
		mock.createOptions.length = 0;
		mock.crosshair = undefined;
		observers.length = 0;
		// unstubGlobals resets it after every test
		vi.stubGlobal("ResizeObserver", ResizeObserverStub);
	});

	it("colours candles by sign and follows the palette", async () => {
		document.documentElement.style.setProperty(
			"--color-positive",
			"#00ff00"
		);
		document.documentElement.style.setProperty(
			"--color-negative",
			"#ff0000"
		);
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
			[
				{
					contentRect: { width: 1280, height: 600 },
				} as ResizeObserverEntry,
			],
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

	it("sizes the chart from the container, falling back to 800x600", async () => {
		await mountComponent(MarketExplorationChart, { data: bars(1) });
		expect(mock.createOptions[0]).toMatchObject({
			width: 800,
			height: 600,
		});

		const width = vi
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(1000);
		const height = vi
			.spyOn(HTMLElement.prototype, "clientHeight", "get")
			.mockReturnValue(450);
		await mountComponent(MarketExplorationChart, { data: bars(1) });
		width.mockRestore();
		height.mockRestore();

		expect(mock.createOptions[1]).toMatchObject({
			width: 1000,
			height: 450,
		});
	});

	it("maps the raw rows to candles and volume bars in seconds", async () => {
		await mountComponent(MarketExplorationChart, {
			data: [
				[2000, 1, 3, 0.5, 2, 7],
				[4000, 2, 4, 1, 1, 9],
			],
		});

		const [candles, volumes] = mock.series;
		expect(candles.setData).toHaveBeenCalledWith([
			{ time: 2, open: 1, high: 3, low: 0.5, close: 2 },
			{ time: 4, open: 2, high: 4, low: 1, close: 1 },
		]);
		expect(volumes.setData).toHaveBeenCalledWith([
			{ time: 2, value: 7 },
			{ time: 4, value: 9 },
		]);
	});

	it("ignores resizes without entries, without height or after unmount", async () => {
		const { wrapper } = await mountComponent(MarketExplorationChart, {
			data: bars(2),
		});
		const [observer] = observers;
		const notify = (entries: ResizeObserverEntry[]) =>
			observer.callback(entries, observer as unknown as ResizeObserver);
		mock.chart.applyOptions.mockClear();

		notify([]);
		notify([
			{ contentRect: { width: 500, height: 0 } } as ResizeObserverEntry,
		]);
		expect(mock.chart.applyOptions).not.toHaveBeenCalled();

		wrapper.unmount();
		notify([
			{ contentRect: { width: 500, height: 300 } } as ResizeObserverEntry,
		]);
		expect(mock.chart.applyOptions).not.toHaveBeenCalled();
	});

	it("loads the latest data when it changes before the chart exists", async () => {
		const wrapper = mount(MarketExplorationChart, {
			props: { data: bars(1) },
		});
		await wrapper.setProps({ data: bars(2) });
		await flushPromises();

		const [candles] = mock.series;
		expect(candles.setData).toHaveBeenCalledOnce();
		expect(
			(vi.mocked(candles.setData).mock.calls[0] as unknown[])[0]
		).toHaveLength(2);
	});

	// onMounted awaits a tick and then reads the container ref, which is null
	// once the component was unmounted in between (TypeError, no cleanup)
	it.fails("unmounting right after mounting does not throw", async () => {
		const errorHandler = vi.fn();
		const wrapper = mount(MarketExplorationChart, {
			props: { data: bars(1) },
			global: { config: { errorHandler } },
		});
		wrapper.unmount();
		await flushPromises();

		expect(errorHandler).not.toHaveBeenCalled();
	});

	describe("crosshair legend", () => {
		const move = (candle?: object, volume?: object, time: unknown = 1) => {
			const [candles, volumes] = mock.series;
			const seriesData = new Map<object, object>();
			if (candle) seriesData.set(candles.api, candle);
			if (volume) seriesData.set(volumes.api, volume);
			mock.crosshair!({ time, seriesData });
		};

		it("shows OHLC in the up colour and the volume while hovering", async () => {
			const { wrapper } = await mountComponent(MarketExplorationChart, {
				data: bars(2),
			});
			expect(wrapper.text()).not.toContain("Open:");
			expect(wrapper.text()).not.toContain("Volume:");

			move(
				{ open: 1, high: 3.456, low: 0.5, close: 2 },
				{ value: 12345 }
			);
			await nextTick();

			expect(wrapper.text()).toContain("Open:");
			const values = wrapper
				.findAll("span[style]")
				.map((el) => el.text());
			expect(values).toEqual(["1.00", "3.46", "0.50", "2.00"]);
			expect(wrapper.find("span[style]").attributes("style")).toContain(
				"var(--color-positive)"
			);
			expect(wrapper.find(".text-muted").text()).toBe(
				(12345).toLocaleString()
			);
		});

		it("uses the down colour when the candle closes lower", async () => {
			const { wrapper } = await mountComponent(MarketExplorationChart, {
				data: bars(2),
			});

			move({ open: 3, high: 3, low: 1, close: 2 });
			await nextTick();

			expect(wrapper.find("span[style]").attributes("style")).toContain(
				"var(--color-negative)"
			);
			// no volume bar under the cursor: the volume block stays hidden
			expect(wrapper.text()).not.toContain("Volume:");
		});

		it("leaves the legend alone without a time or without OHLC data", async () => {
			const { wrapper } = await mountComponent(MarketExplorationChart, {
				data: bars(2),
			});

			move({ open: 1, high: 1, low: 1, close: 1 }, { value: 5 }, null);
			await nextTick();
			expect(wrapper.text()).not.toContain("Open:");
			expect(wrapper.text()).not.toContain("Volume:");

			// a series entry that is a whitespace point has no "open"
			move({ time: 1 }, { time: 1 });
			await nextTick();
			expect(wrapper.text()).not.toContain("Open:");
			expect(wrapper.text()).not.toContain("Volume:");
		});
	});
});
