import { describe, expect, it } from "vitest";

// Util
import { PRESET_KEYS, presetLayout } from "@/features/planning/layout/presets";
import { normaliseLayout } from "@/features/planning/layout/normaliseLayout";
import { packLayout } from "@/features/planning/layout/packLayout";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";

// typical content heights per element, so the golden positions mean something
const HEIGHTS: Record<string, number> = {
	"kpi-profit": 76,
	"kpi-payback": 76,
	"kpi-workforce": 76,
	"kpi-area": 76,
	"kpi-storage": 76,
	empire: 140,
	planet: 260,
	workforce: 200,
	housing: 120,
	experts: 300,
	production: 900,
	"supply-cart": 420,
	"plan-check": 600,
	"material-io": 640,
	"material-io-totals": 140,
};
const heights = (key: (typeof PRESET_KEYS)[number]) =>
	Object.fromEntries(
		presetLayout(key).items.map((i) => [i.id, HEIGHTS[i.els[0]] ?? 200])
	);

describe("presets", () => {
	it.each(PRESET_KEYS)("%s is valid and normalised", (key) => {
		const layout = presetLayout(key);
		expect(normaliseLayout(layout)).toEqual(layout);
		// every element once, Production included
		expect(layout.items.flatMap((i) => i.els).sort()).toEqual(
			[...ELEMENT_IDS].sort()
		);
		// the results tiles are kept in view
		expect(
			layout.items
				.filter((i) => i.els[0].startsWith("kpi-"))
				.every((i) => i.pin)
		).toBe(true);
	});

	it("hands out a fresh copy each time", () => {
		const a = presetLayout("standard");
		a.items[0].x = 5;
		expect(presetLayout("standard").items[0].x).toBe(0);
	});

	describe.each(PRESET_KEYS)("%s packs the same as before", (key) => {
		it.each([2560, 1920, 1440, 1280, 1024, 768, 390, 375])(
			"at %i px",
			(width) => {
				const pack = packLayout(presetLayout(key), width, heights(key));
				const rows = Object.entries(pack.items).map(
					([id, p]) =>
						`${id} ${p.region} x${p.x} w${p.w} @${Math.round(p.left)},${Math.round(p.top)} ${Math.round(p.width)}×${p.height}${p.auto ? " auto" : ""}${p.scroll ? " scroll" : ""}`
				);
				expect({
					band: pack.band.height,
					page: pack.page.height,
					phone: pack.phone,
					rows,
				}).toMatchSnapshot();
			}
		);
	});
});
