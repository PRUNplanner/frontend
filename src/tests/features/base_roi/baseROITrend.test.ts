import { describe, expect, it } from "vitest";

// Unit
import { profitTrend } from "@/features/base_roi/baseROITrend";

// Types & Interfaces
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

/** a row with just what the trend reads; the recipe label needs a recipe */
function row(
	key: string,
	o: {
		expertise: string | null;
		building: string;
		outputs: [string, number][];
		kind?: IBaseROIRow["kind"];
		recipe?: string;
	}
): IBaseROIRow {
	return {
		key,
		kind: o.kind ?? "recipe",
		expertise: o.expertise,
		building: o.building,
		outputs: o.outputs.map(([ticker, traded]) => ({
			ticker,
			amount: 1,
			traded,
		})),
		result: {
			production: {
				buildings: [
					{
						activeRecipes: [
							{
								recipe: {
									inputs: [],
									outputs: [
										{
											material_ticker:
												o.recipe ?? o.outputs[0][0],
											material_amount: 1,
										},
									],
								},
							},
						],
					},
				],
			},
		},
	} as unknown as IBaseROIRow;
}

const ROWS = [
	row("sc", {
		expertise: "CHEMISTRY",
		building: "CHP",
		outputs: [["SC", 30]],
	}),
	row("ca", {
		expertise: "CHEMISTRY",
		building: "CHP",
		outputs: [["CA", 10]],
	}),
	row("tnp", {
		expertise: "CHEMISTRY",
		building: "TNP",
		outputs: [["ETC", 20]],
	}),
	row("rat", {
		expertise: "FOOD_INDUSTRIES",
		building: "FP",
		outputs: [["RAT", 50]],
	}),
	row("rat2", {
		expertise: "FOOD_INDUSTRIES",
		building: "FP",
		outputs: [["RAT", 50]],
		recipe: "RAT2",
	}),
	// two planets of one extraction recipe: one entry, their mean
	row("f@a", {
		expertise: "RESOURCE_EXTRACTION",
		building: "COL",
		outputs: [["F", 40]],
		kind: "resource",
	}),
	row("f@b", {
		expertise: "RESOURCE_EXTRACTION",
		building: "COL",
		outputs: [["F", 40]],
		kind: "resource",
	}),
	// nothing traded: left out
	row("dead", {
		expertise: "METALLURGY",
		building: "SME",
		outputs: [["AL", 0]],
	}),
];
const PROFITS = new Map<string, number[]>([
	["sc", [300, 600]],
	["ca", [100, 200]],
	["tnp", [50, 80]],
	["rat", [10, 20]],
	["rat2", [30, 40]],
	["f@a", [100, 100]],
	["f@b", [300, 500]],
	["dead", [999, 999]],
]);
const keys = (t: ReturnType<typeof profitTrend>) => t.lines.map((l) => l.key);
const line = (t: ReturnType<typeof profitTrend>, key: string) =>
	t.lines.find((l) => l.key === key)!;

describe("profitTrend", () => {
	it("no search: one line per industry, weighted by traded volume, heaviest first", () => {
		const t = profitTrend(ROWS, PROFITS, "");
		expect(t.level).toBe("industry");
		expect(t.focus).toBeNull();
		expect(keys(t)).toEqual([
			"FOOD_INDUSTRIES",
			"CHEMISTRY",
			"RESOURCE_EXTRACTION",
		]);
		// (300×30 + 100×10 + 50×20) ÷ 60, (600×30 + 200×10 + 80×20) ÷ 60
		expect(line(t, "CHEMISTRY").values).toEqual([11_000 / 60, 21_600 / 60]);
		// two planets count once, at their mean, with one product's weight
		expect(line(t, "RESOURCE_EXTRACTION").values).toEqual([200, 300]);
		expect(line(t, "RESOURCE_EXTRACTION").weight).toBe(40);
	});

	it("an industry searched: its buildings", () => {
		const t = profitTrend(ROWS, PROFITS, "chemistry");
		expect(t.level).toBe("building");
		expect(t.focus).toBe("CHEMISTRY");
		expect(keys(t)).toEqual(["CHP", "TNP"]);
		expect(line(t, "CHP").values).toEqual([
			(300 * 30 + 100 * 10) / 40,
			(600 * 30 + 200 * 10) / 40,
		]);
		// the spaced name works too
		expect(profitTrend(ROWS, PROFITS, "food industries").focus).toBe(
			"FOOD_INDUSTRIES"
		);
	});

	it("a building searched: its products; a product: its recipes", () => {
		const b = profitTrend(ROWS, PROFITS, "chp");
		expect(b.level).toBe("product");
		expect(b.focus).toBe("CHP");
		expect(keys(b)).toEqual(["SC", "CA"]);

		const p = profitTrend(ROWS, PROFITS, "rat");
		expect(p.level).toBe("recipe");
		expect(p.focus).toBe("RAT");
		expect(p.lines).toHaveLength(2);
		expect(p.lines.every((l) => l.key.startsWith("FP: "))).toBe(true);
	});

	it("a partial search naming one industry drills into it", () => {
		const searched = ROWS.filter((r) => r.expertise === "CHEMISTRY");
		expect(profitTrend(searched, PROFITS, "chem").level).toBe("building");
		const one = ROWS.filter((r) => r.building === "CHP");
		expect(profitTrend(one, PROFITS, "ch").level).toBe("product");
	});

	it("a product made on planets: one line per building and product", () => {
		const t = profitTrend(ROWS, PROFITS, "F");
		expect(t.level).toBe("recipe");
		expect(keys(t)).toEqual(["COL: F"]);
		expect(line(t, "COL: F").values).toEqual([200, 300]);
	});

	it("rows without an industry: their own line, and no drill on a partial search", () => {
		const loose = [
			row("x", {
				expertise: null,
				building: "TNP",
				outputs: [["ETC", 5]],
			}),
			row("y", {
				expertise: null,
				building: "XYZ",
				outputs: [["ABC", 5]],
			}),
		];
		const profits = new Map([
			["x", [1, 2]],
			["y", [3, 4]],
		]);
		const top = profitTrend(loose, profits, "");
		expect(keys(top)).toEqual([""]);
		// two buildings, no industry: stays at the top level
		expect(profitTrend(loose, profits, "zz").level).toBe("industry");
	});

	it("caps the lines and counts the rest; no rows or no prices, no lines", () => {
		const t = profitTrend(ROWS, PROFITS, "", 2);
		expect(t.lines).toHaveLength(2);
		expect(t.more).toBe(1);
		expect(profitTrend([], PROFITS, "").lines).toEqual([]);
		expect(profitTrend(ROWS, new Map(), "").lines).toEqual([]);
	});
});
