import type { IHomepageTourStep } from "@/features/homepage/homepageTour.types";

/**
 * Zoom and pan of a tour viewport, origin top left: the step's box centred
 * as far as the image allows, so no empty edge shows.
 *
 * @author jplacht
 */
export function tourTransform(step: IHomepageTourStep): string {
	const [x0, y0, x1, y1] = step.box;
	const z = step.zoom;
	const clamp = (v: number) => Math.min(0, Math.max(1 - z, v));
	const tx = clamp(0.5 - ((x0 + x1) / 2) * z) * 100;
	const ty = clamp(0.5 - ((y0 + y1) / 2) * z) * 100;
	// + 0 turns -0 into 0
	return `translate(${+tx.toFixed(2) + 0}%, ${+ty.toFixed(2) + 0}%) scale(${z})`;
}

/**
 * Position of the outlined region in the unzoomed image, outline and radius
 * divided by the zoom so they look the same at every step
 */
export function tourHighlight(step: IHomepageTourStep): Record<string, string> {
	const [x0, y0, x1, y1] = step.box;
	const pct = (v: number) => `${+(v * 100).toFixed(2)}%`;
	return {
		left: pct(x0),
		top: pct(y0),
		width: pct(x1 - x0),
		height: pct(y1 - y0),
		outlineWidth: `${+(2 / step.zoom).toFixed(2)}px`,
		borderRadius: `${+(6 / step.zoom).toFixed(2)}px`,
	};
}
