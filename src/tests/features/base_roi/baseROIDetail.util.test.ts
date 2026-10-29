import { beforeAll, describe, expect, it } from "vitest";

// Unit
import {
	detailSections,
	detailText,
	recipeLabel,
} from "@/features/base_roi/baseROIDetail.util";
import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";
import { baseROIRows } from "@/tests/features/base_roi/baseROI.fixtures";

// Types & Interfaces
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

// keys with their named values, so the test reads what each line says
const t = (key: string, named: Record<string, unknown> = {}) =>
	Object.keys(named).length ? `${key}${JSON.stringify(named)}` : key;

let rows: IBaseROIRow[];
beforeAll(async () => {
	rows = await baseROIRows();
}, 60_000);

const settings = (o: Partial<BaseROISettings> = {}): BaseROISettings => ({
	...defaultBaseROISettings(),
	...o,
});
const line = (
	row: IBaseROIRow,
	s: BaseROISettings,
	section: number,
	label: string
) =>
	detailSections(row, s, t)
		.find((x) => x.id === section)!
		.lines.find((l) => l.label.startsWith(label));

describe("baseROIDetail.util (criterion 16)", () => {
	it("ten sections, each line with a value", () => {
		const sections = detailSections(rows[0], settings(), t);
		expect(sections.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		for (const s of sections) expect(s.lines.length).toBeGreaterThan(0);
	});

	it("HQ and ships with the formula when on, the reason when off", () => {
		const row = rows[0];
		expect(line(row, settings(), 1, "base_roi.detail.hq")!.formula).toBe(
			"base_roi.detail.hq_off"
		);
		expect(line(row, settings(), 1, "base_roi.detail.ships")!.formula).toBe(
			"base_roi.detail.ships_off"
		);
		const on = settings({ targetPermit: 10, roundTripHours: 8, logistics: "none" });
		expect(line(row, on, 1, "base_roi.detail.hq")!.formula).toContain('"level":9');
		// no ship chosen: the WCB
		expect(line(row, on, 1, "base_roi.detail.ships")!.formula).toContain('"ship":"WCB"');
	});

	it("logistics check per mode", () => {
		const row = rows[0];
		expect(line(row, settings(), 2, "base_roi.detail.ship_check")!.formula).toContain(
			"ship_formula"
		);
		expect(
			line(row, settings({ logistics: "manual" }), 2, "base_roi.detail.ship_check")!
				.formula
		).toContain("manual_formula");
		expect(
			line(row, settings({ logistics: "none" }), 2, "base_roi.detail.ship_check")!.value
		).toBe("base_roi.detail.no_limit");
		const tooLarge = { ...row, metrics: { ...row.metrics, fitsLogistics: false } };
		expect(line(tooLarge, settings(), 2, "base_roi.detail.ship_check")!.value).toBe(
			"base_roi.detail.too_large"
		);
	});

	it("break-even: the ramp's stages, or building cost ÷ profit when fixed; never", () => {
		const row = rows[0];
		const ramp = detailSections(row, settings(), t).find((s) => s.id === 7)!;
		expect(ramp.lines.some((l) => l.label.startsWith("base_roi.detail.stage"))).toBe(true);
		const fixed = detailSections(row, settings({ experts: 3 }), t).find((s) => s.id === 7)!;
		expect(fixed.lines.map((l) => l.label)).toContain("base_roi.detail.payback_fixed");

		const never = {
			...row,
			metrics: { ...row.metrics, breakEven: Infinity, payback: Infinity },
		};
		const lines = detailSections(never, settings({ experts: 2 }), t).find((s) => s.id === 7)!.lines;
		expect(lines[0]).toMatchObject({ label: "base_roi.detail.never", value: "—" });
	});

	it("section 10: the standard planet, or the planet with its jumps and COGC", () => {
		const recipe = rows.find((r) => r.kind === "recipe")!;
		expect(line(recipe, settings(), 10, "base_roi.detail.planet")!.value).toBe(
			"base_roi.detail.standard_planet"
		);
		const planet = {
			...rows.find((r) => r.kind === "resource")!,
			jumps: null,
			planetCOGC: "ADVERTISING_RESOURCE_EXTRACTION",
		};
		const s10 = detailSections(planet, settings(), t).find((s) => s.id === 10)!;
		expect(s10.lines[1].value).toContain("(—)");
		expect(s10.lines[2].label).toContain("real_cogc");
	});

	it("money: a material without a price shows a dash", () => {
		const row = { ...rows[0], materials: [] };
		const money = detailSections(row, settings(), t).find((s) => s.id === 6)!;
		expect(money.lines.some((l) => l.value === "—")).toBe(true);
	});

	it("recipe label and plain text", () => {
		const resource = rows.find((r) => r.kind === "resource")!;
		// an extraction recipe has outputs only
		expect(recipeLabel(resource)).not.toContain("→");
		const text = detailText("H2O · RIG", detailSections(resource, settings(), t));
		expect(text.split("\n")[0]).toBe("H2O · RIG");
		expect(text).toContain("10 base_roi.detail.s10");
	});
});
