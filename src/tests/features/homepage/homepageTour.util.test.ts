import { describe, it, expect } from "vitest";

import {
	tourHighlight,
	tourTransform,
} from "@/features/homepage/homepageTour.util";
import {
	EMPIRE_TOUR,
	PLAN_TOUR,
	PLANET_SEARCH_TOUR,
} from "@/features/homepage/homepage.constants";
import type { IHomepageTourStep } from "@/features/homepage/homepageTour.types";

const step = (
	box: IHomepageTourStep["box"],
	zoom: number
): IHomepageTourStep => ({ key: "s", box, zoom });

describe("tourTransform", () => {
	it("leaves the whole image as it is", () => {
		expect(tourTransform(step([0, 0, 1, 1], 1))).toBe(
			"translate(0%, 0%) scale(1)"
		);
	});

	it("centres the box", () => {
		expect(tourTransform(step([0.379, 0.205, 0.519, 0.416], 2.6))).toBe(
			"translate(-66.74%, -30.73%) scale(2.6)"
		);
	});

	it("stops at the image's edges", () => {
		// right edge: 1 - 2.2 = -1.2; top edge: 0
		expect(tourTransform(step([0.715, 0.014, 0.944, 0.045], 2.2))).toBe(
			"translate(-120%, 0%) scale(2.2)"
		);
	});
});

describe("tourHighlight", () => {
	it("places the outline on the box, its width independent of the zoom", () => {
		expect(tourHighlight(step([0.05, 0.108, 0.53, 0.146], 1.8))).toEqual({
			left: "5%",
			top: "10.8%",
			width: "48%",
			height: "3.8%",
			outlineWidth: "1.11px",
			borderRadius: "3.33px",
		});
	});
});

describe("the landing page's tours", () => {
	// the part of the image the 16:10 viewport shows, in image fractions
	function visible({ box, zoom }: IHomepageTourStep, axis: 0 | 1) {
		const centre = (box[axis] + box[axis + 2]) / 2;
		const offset = Math.min(0, Math.max(1 - zoom, 0.5 - centre * zoom));
		return [-offset / zoom, (1 - offset) / zoom];
	}

	it.each([
		["plan", PLAN_TOUR],
		["planet_search", PLANET_SEARCH_TOUR],
		["empire", EMPIRE_TOUR],
	])("%s: every outlined region is fully inside the viewport", (_, tour) => {
		for (const s of tour)
			for (const axis of [0, 1] as const) {
				const [from, to] = visible(s, axis);
				expect(s.box[axis], s.key).toBeGreaterThanOrEqual(from - 1e-9);
				expect(s.box[axis + 2], s.key).toBeLessThanOrEqual(to + 1e-9);
				// no empty edge: the shown part stays within the image
				expect(from).toBeGreaterThanOrEqual(0);
				expect(to).toBeLessThanOrEqual(1 + 1e-9);
			}
	});
});
