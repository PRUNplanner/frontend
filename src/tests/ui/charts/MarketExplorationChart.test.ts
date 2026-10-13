import { describe, it, expect, vi } from "vitest";

import MarketExplorationChart from "@/ui/charts/MarketExplorationChart.vue";
import { mountComponent } from "@/tests/mountComponent";
import { switchPalette } from "@/tests/switchPalette";

// lightweight-charts needs a canvas, the mock records the series options
const series = vi.hoisted(
	() => [] as { options: Record<string, unknown>[] }[]
);
vi.mock("lightweight-charts", () => {
	const makeSeries = (options: Record<string, unknown>) => {
		const s = { options: [options] };
		series.push(s);
		return {
			setData: vi.fn(),
			applyOptions: (o: Record<string, unknown>) => s.options.push(o),
		};
	};
	return {
		ColorType: { Solid: "solid" },
		CandlestickSeries: "candles",
		HistogramSeries: "histogram",
		createChart: () => ({
			addSeries: (_type: string, options: Record<string, unknown>) =>
				makeSeries(options),
			applyOptions: vi.fn(),
			priceScale: () => ({ applyOptions: vi.fn() }),
			timeScale: () => ({
				setVisibleLogicalRange: vi.fn(),
				fitContent: vi.fn(),
			}),
			subscribeCrosshairMove: vi.fn(),
			remove: vi.fn(),
		}),
	};
});
vi.stubGlobal(
	"ResizeObserver",
	class {
		observe() {}
		disconnect() {}
	}
);

describe("MarketExplorationChart", () => {
	it("colours candles by sign and follows the palette", async () => {
		document.documentElement.style.setProperty("--color-positive", "#00ff00");
		document.documentElement.style.setProperty("--color-negative", "#ff0000");
		await mountComponent(MarketExplorationChart, {
			data: [[0, 1, 2, 0.5, 1.5, 10]],
		});

		const [candles] = series;
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
});
