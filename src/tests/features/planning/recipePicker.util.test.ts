import { describe, it, expect } from "vitest";

import {
	dependencyNote,
	inputSource,
	pickerOptions,
	recipeConsumers,
} from "@/features/planning/recipePicker.util";
import type {
	IMaterialIO,
	IProductionBuilding,
	IRecipeBuildingOption,
} from "@/features/planning/usePlanCalculation.types";

const m = (material_ticker: string, material_amount = 1) => ({
	material_ticker,
	material_amount,
});

const recipe = (
	id: string,
	daily: number,
	area: number,
	roi: number,
	inputs: string[] = [],
	outputs: string[] = [id]
): IRecipeBuildingOption =>
	({
		recipe_id: id,
		building_ticker: "HYF",
		recipe_name: id,
		time_ms: 1000,
		inputs: inputs.map((t) => m(t)),
		outputs: outputs.map((t) => m(t, 2)),
		dailyRevenue: daily,
		profitPerArea: area,
		roi,
	}) as IRecipeBuildingOption;

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
		const rows = pickerOptions("change", OPTIONS, ["CAF"], "CAF", "daily", none);
		expect(ids(rows)).toStrictEqual(["CAF", "ALG", "MUS", "VEG"]);
		expect(rows[0]).toMatchObject({ current: true, disabled: true });
		expect(rows.slice(1).every((r) => !r.disabled)).toBe(true);
	});

	it("disables the other recipes the building runs in change mode", () => {
		const rows = pickerOptions("change", OPTIONS, ["CAF", "MUS"], "CAF", "daily", none);
		expect(rows.map((r) => [r.recipe.recipe_id, r.disabled])).toStrictEqual([
			["CAF", true],
			["ALG", false],
			["MUS", true],
			["VEG", false],
		]);
		expect(rows[2]).toMatchObject({ current: false, inPlan: true });
	});

	it("sorts by area, payback (never last) and popularity", () => {
		const area = pickerOptions("change", OPTIONS, [], "CAF", "area", none);
		expect(ids(area)).toStrictEqual(["CAF", "MUS", "ALG", "VEG"]);

		const payback = pickerOptions("change", OPTIONS, [], "CAF", "payback", none);
		expect(ids(payback)).toStrictEqual(["CAF", "MUS", "ALG", "VEG"]);

		const plans: Record<string, number> = { VEG: 60, ALG: 20 };
		const popular = pickerOptions("add", OPTIONS, [], undefined, "popular", (id) => plans[id]);
		expect(ids(popular)).toStrictEqual(["VEG", "ALG", "CAF", "MUS"]);
	});

	it("lists recipes already ordered last and disabled in add mode", () => {
		const rows = pickerOptions("add", OPTIONS, ["ALG", "CAF"], undefined, "daily", none);
		expect(ids(rows)).toStrictEqual(["MUS", "VEG", "ALG", "CAF"]);
		expect(rows.map((r) => r.disabled)).toStrictEqual([false, false, true, true]);
		expect(rows.every((r) => !r.current)).toBe(true);
	});
});

const building = (
	name: string,
	active: IRecipeBuildingOption[]
): IProductionBuilding =>
	({
		name,
		activeRecipes: active.map((r) => ({ recipeId: r.recipe_id, recipe: r })),
	}) as IProductionBuilding;

const COF = recipe("COF", 0, 0, 0, ["CAF", "DW"], ["COF"]);
const PLAN = [building("HYF", [CAF]), building("FP", [COF])];

const io = (ticker: string, input: number, output: number): IMaterialIO => ({
	ticker,
	input,
	output,
	delta: output - input,
	price: 0,
	individualWeight: 0,
	individualVolume: 0,
	totalWeight: 0,
	totalVolume: 0,
});

describe("dependencyNote", () => {
	it("gives the In amount and who uses the output", () => {
		expect(dependencyNote(CAF, [io("CAF", 27.1, 30)], PLAN)).toStrictEqual({
			ticker: "CAF",
			amount: 27.1,
			consumers: [{ building: "FP", outputs: ["COF"] }],
		});
	});

	it("is undefined when nothing in the plan uses the output", () => {
		expect(dependencyNote(CAF, [io("CAF", 0, 30)], PLAN)).toBeUndefined();
		expect(dependencyNote(CAF, [], PLAN)).toBeUndefined();
	});

	it("names no building when only the workforce uses it", () => {
		expect(dependencyNote(ALG, [io("ALG", 4, 0)], PLAN)).toStrictEqual({
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
		const flow = [io("H2O", 10, 20), io("NS", 5, 0)];
		expect(inputSource("H2O", flow)).toBe("made");
		expect(inputSource("NS", flow)).toBe("bought");
		expect(inputSource("XX", flow)).toBe("bought");
	});
});
