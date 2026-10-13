import { describe, it, expect, beforeAll } from "vitest";
import { useChartTheme } from "@/ui/charts/chartTheme";
import { switchPalette } from "@/tests/switchPalette";

describe("useChartTheme", () => {
	beforeAll(() => {
		const style = document.documentElement.style;
		style.setProperty("--color-positive", "#00ff00");
		style.setProperty("--color-negative", "#ff0000");
		style.setProperty("--color-muted", "#888888");
		style.setProperty("--color-warning", "#ffff00");
		style.setProperty("--chart-ink", "#ffffff");
		style.setProperty("--color-cx-ai1", "#3d8ce6");
		style.setProperty("--color-cx-ci1", "#d96a22");
		style.setProperty("--color-cx-ic1", "#1fa67a");
		style.setProperty("--color-cx-nc1", "#c85fd0");
	});

	it("reads the tokens", () => {
		const theme = useChartTheme();

		expect(theme.value.positive).toBe("#00ff00");
		expect(theme.value.negative).toBe("#ff0000");
		expect(theme.value.warning).toBe("#ffff00");
		expect(theme.value.ink).toBe("#ffffff");
	});

	it("has fixed exchange colours, UNIVERSE and unknown are muted", () => {
		const { exchange } = useChartTheme().value;

		expect(["AI1", "CI1", "IC1", "NC1"].map(exchange)).toEqual([
			"#3d8ce6",
			"#d96a22",
			"#1fa67a",
			"#c85fd0",
		]);
		expect(exchange("UNIVERSE")).toBe("#888888");
		expect(exchange("XX1")).toBe("#888888");
	});

	it("gives the cost parts the exchange hues", () => {
		const { costPart } = useChartTheme().value;

		expect([1, 2, 3, 4].map((s) => costPart(s as 1 | 2 | 3 | 4))).toEqual([
			"#3d8ce6",
			"#d96a22",
			"#1fa67a",
			"#c85fd0",
		]);
	});

	it("switches with data-palette without a reload", async () => {
		const theme = useChartTheme();

		await switchPalette("colorblind", {
			"--color-positive": "#60a5fa",
			"--color-negative": "#fb923c",
		});

		expect(theme.value.positive).toBe("#60a5fa");
		expect(theme.value.negative).toBe("#fb923c");
	});

	it("leaves no hex colour in the chart components", () => {
		const sources = import.meta.glob("/src/ui/charts/*.vue", {
			query: "?raw",
			import: "default",
			eager: true,
		}) as Record<string, string>;

		expect(Object.keys(sources).length).toBeGreaterThan(0);
		for (const [file, source] of Object.entries(sources))
			expect(source.match(/#[0-9a-f]{3,8}\b/gi), file).toBeNull();
	});
});
