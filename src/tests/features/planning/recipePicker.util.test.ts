import { describe, it, expect } from "vitest";

import {
	dependencyNote,
	inputSource,
	pickerOptions,
	recipeConsumers,
} from "@/features/planning/recipePicker.util";
import type { IRecipeBuildingOption } from "@/features/planning/usePlanCalculation.types";
import {
	activeRecipe,
	building,
	inOut,
	m,
	option,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

const recipe = (
	id: string,
	daily: number,
	area: number,
	roi: number,
	inputs: string[] = [],
	outputs: string[] = [id]
) =>
	option(id, {
		building_ticker: "HYF",
		time_ms: 1000,
		inputs: inputs.map((t) => m(t)),
		outputs: outputs.map((t) => m(t, 2)),
		dailyRevenue: daily,
		profitPerArea: area,
		roi,
	});

const CAF = recipe("CAF", 100, 5, 70, ["H2O"]);
const ALG = recipe("ALG", 500, 20, 20, ["H2O"]);
const MUS = recipe("MUS", 300, 30, 10, ["NS"]);
const VEG = recipe("VEG", 200, 10, -1, ["NS"]);
const OPTIONS = [CAF, ALG, MUS, VEG];
const ids = (rows: { recipe: IRecipeBuildingOption }[]) =>
	rows.map((r) => r.recipe.recipe_id);
const none = () => undefined;

describe("pickerOptions", () => {
	it("pins the current recipe first in change mode, not selectable", () => {
		const rows = pickerOptions(
			"change",
			OPTIONS,
			["CAF"],
			"CAF",
			"daily",
			none
		);
		expect(ids(rows)).toStrictEqual(["CAF", "ALG", "MUS", "VEG"]);
		expect(rows[0]).toMatchObject({ current: true, disabled: true });
		expect(rows.slice(1).every((r) => !r.disabled)).toBe(true);
	});

	it("keeps the other recipes the building runs selectable in change mode", () => {
		const rows = pickerOptions(
			"change",
			OPTIONS,
			["CAF", "MUS"],
			"CAF",
			"daily",
			none
		);
		// only the recipe being replaced is disabled; MUS is in plan but a
		// second order of it stays pickable
		expect(rows.map((r) => [r.recipe.recipe_id, r.disabled])).toStrictEqual(
			[
				["CAF", true],
				["ALG", false],
				["MUS", false],
				["VEG", false],
			]
		);
		expect(rows[2]).toMatchObject({ current: false, inPlan: true });
	});

	it("sorts by popularity, unknown last", () => {
		const plans: Record<string, number> = { VEG: 60, ALG: 20 };
		const popular = pickerOptions(
			"add",
			OPTIONS,
			[],
			undefined,
			"popular",
			(id) => plans[id]
		);
		expect(ids(popular)).toStrictEqual(["VEG", "ALG", "CAF", "MUS"]);
	});

	it("lists recipes already ordered last in add mode, still selectable", () => {
		const rows = pickerOptions(
			"add",
			OPTIONS,
			["ALG", "CAF"],
			undefined,
			"daily",
			none
		);
		expect(ids(rows)).toStrictEqual(["MUS", "VEG", "ALG", "CAF"]);
		expect(rows.map((r) => r.inPlan)).toStrictEqual([
			false,
			false,
			true,
			true,
		]);
		// add mode has no current recipe, so nothing is disabled
		expect(rows.every((r) => !r.disabled && !r.current)).toBe(true);
	});
});

const COF = recipe("COF", 0, 0, 0, ["CAF", "DW"], ["COF"]);
const PLAN = [
	building("HYF", { activeRecipes: [activeRecipe(CAF)] }),
	building("FP", { activeRecipes: [activeRecipe(COF)] }),
];

describe("dependencyNote", () => {
	it("gives the In amount and who uses the output", () => {
		expect(
			dependencyNote(CAF, [inOut("CAF", 27.1, 30)], PLAN)
		).toStrictEqual({
			ticker: "CAF",
			amount: 27.1,
			consumers: [{ building: "FP", outputs: ["COF"] }],
		});
	});

	it("is undefined when nothing in the plan uses the output", () => {
		expect(
			dependencyNote(CAF, [inOut("CAF", 0, 30)], PLAN)
		).toBeUndefined();
		expect(dependencyNote(CAF, [], PLAN)).toBeUndefined();
	});

	it("names no building when only the workforce uses it", () => {
		expect(dependencyNote(ALG, [inOut("ALG", 4, 0)], PLAN)).toStrictEqual({
			ticker: "ALG",
			amount: 4,
			consumers: [],
		});
	});
});

describe("recipeConsumers / inputSource", () => {
	it("finds the buildings that use a recipe's outputs", () => {
		expect(recipeConsumers(CAF, PLAN)).toStrictEqual([
			{ building: "FP", outputs: ["COF"] },
		]);
		expect(recipeConsumers(MUS, PLAN)).toStrictEqual([]);
	});

	it("says whether the plan makes an input or buys it", () => {
		const flow = [inOut("H2O", 10, 20), inOut("NS", 5, 0)];
		expect(inputSource("H2O", flow)).toBe("made");
		expect(inputSource("NS", flow)).toBe("bought");
		expect(inputSource("XX", flow)).toBe("bought");
	});
});
