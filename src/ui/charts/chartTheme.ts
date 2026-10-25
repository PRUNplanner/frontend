import { computed, shallowRef, type ComputedRef } from "vue";

// Types & Interfaces
import type { IChartTheme } from "@/ui/charts/charts.types";

/** exchange colours, fixed on every page (tokens in style.css) */
const EXCHANGE_TOKENS: Record<string, string> = {
	AI1: "--color-cx-ai1",
	CI1: "--color-cx-ci1",
	IC1: "--color-cx-ic1",
	NC1: "--color-cx-nc1",
};

/** cost parts 1..4 (inputs, workforce, degradation, shipping) reuse the exchange hues */
const COST_PARTS = ["AI1", "CI1", "IC1", "NC1"] as const;

function readTokens() {
	const css = getComputedStyle(document.documentElement);
	const read = (name: string) => css.getPropertyValue(name).trim();
	return {
		positive: read("--color-positive"),
		negative: read("--color-negative"),
		warning: read("--color-warning"),
		muted: read("--color-muted"),
		ink: read("--chart-ink"),
		grid: read("--chart-grid"),
		axis: read("--chart-axis"),
		surface: read("--chart-surface"),
		mono: read("--font-mono") || "monospace",
		exchanges: Object.fromEntries(
			Object.entries(EXCHANGE_TOKENS).map(([code, token]) => [
				code,
				read(token),
			])
		),
	};
}

const tokens = shallowRef<ReturnType<typeof readTokens>>();
let paletteObserver: MutationObserver | undefined;

const theme = computed<IChartTheme>(() => {
	const { exchanges, ...t } = tokens.value!;
	const exchange = (code: string) => exchanges[code] || t.muted;
	return {
		...t,
		exchange,
		costPart: (slot) => exchange(COST_PARTS[slot - 1]),
	};
});

/**
 * Colours for every chart, from the CSS tokens in style.css. Follows the
 * colour-blind preference (data-palette on <html>) without a reload.
 * @author jplacht
 *
 * @returns {ComputedRef<IChartTheme>} chart colours
 */
export function useChartTheme(): ComputedRef<IChartTheme> {
	if (!paletteObserver) {
		tokens.value = readTokens();
		paletteObserver = new MutationObserver(
			() => (tokens.value = readTokens())
		);
		paletteObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-palette"],
		});
	}
	return theme;
}
