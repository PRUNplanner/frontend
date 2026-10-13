import { nextTick } from "vue";

/**
 * Sets CSS tokens inline on <html> and flips data-palette like the
 * colour-blind preference does, then waits for useChartTheme to re-read.
 * @author jplacht
 *
 * @param {string} palette data-palette value
 * @param {Record<string, string>} tokens CSS custom properties to set
 */
export async function switchPalette(
	palette: string,
	tokens: Record<string, string>
) {
	const html = document.documentElement;
	for (const [name, value] of Object.entries(tokens))
		html.style.setProperty(name, value);
	html.setAttribute("data-palette", palette);
	// MutationObserver callbacks run as a microtask
	await Promise.resolve();
	await nextTick();
}
