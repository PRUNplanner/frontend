import { describe, expect, it } from "vitest";

import {
	buildChangeSummary,
	buildingChanges,
	isOwnPlan,
	planFigures,
	SUMMARY_LIMIT,
	toWorkingCopy,
} from "@/features/sharing/sharedPlan.util";
import { diffPlan } from "@/features/planning_data/planDiff";

// test data
import plan from "@/tests/test_data/api_data_plan_etherwind.json";

// renders the key and its params, so tests can see what went in
const t = (key: string, params: Record<string, string | number> = {}) =>
	`${key}${JSON.stringify(params)}`;

const figures = (profit: number, roi: number) => ({
	profit,
	roi,
	area: 100,
	workforce: 200,
	buildings: 10,
});

function copy() {
	// @ts-expect-error mock data
	return toWorkingCopy(plan);
}

describe("toWorkingCopy", () => {
	it("drops everything keyed to the owner's plan", () => {
		const working = copy();

		expect(working.uuid).toBeUndefined();
		expect(working).not.toHaveProperty("empires");
		expect(working).not.toHaveProperty("modified_at");
		expect(working.plan_data.buildings).toEqual(plan.plan_data.buildings);
	});

	it("leaves the shared plan untouched", () => {
		const working = copy();
		working.plan_data.buildings[0].amount = 99;

		expect(plan.uuid).toBe("41094cb6-c4bc-429f-b8c8-b81d02b3811c");
		expect(plan.empires.length).toBe(2);
		expect(plan.plan_data.buildings[0].amount).toBe(1);
	});
});

describe("isOwnPlan", () => {
	it("finds the shared plan among the viewer's plans", () => {
		expect(isOwnPlan([{ uuid: "a" }, { uuid: "b" }], "b")).toBe(true);
		expect(isOwnPlan([{ uuid: "a" }], "b")).toBe(false);
		expect(isOwnPlan([], "b")).toBe(false);
	});
});

describe("planFigures", () => {
	it("sums workforce and buildings", () => {
		const result = {
			area: { areaUsed: 250 },
			workforce: {
				pioneer: { required: 100 },
				settler: { required: 50 },
			},
			production: { buildings: [{ amount: 3 }, { amount: 4 }] },
		};

		expect(
			// @ts-expect-error mock data
			planFigures(result, { profit: 1200, roi: 14 })
		).toEqual({
			profit: 1200,
			roi: 14,
			area: 250,
			workforce: 150,
			buildings: 7,
		});
	});
});

describe("buildingChanges", () => {
	it("marks added, removed, amount and recipe changes", () => {
		const from = copy();
		const to = copy();
		const [ext, fp] = to.plan_data.buildings;
		// EXT removed, FP more and a new recipe, PP1 new
		to.plan_data.buildings = to.plan_data.buildings.filter(
			(b) => b.name !== "EXT"
		);
		fp.amount = 20;
		fp.active_recipes[0] = { recipeid: "FP#NEW", amount: 1 };
		to.plan_data.buildings.push({
			name: "PP1",
			amount: 2,
			active_recipes: [],
		});

		const changes = buildingChanges(from, to);

		expect(ext.name).toBe("EXT");
		expect(changes.removed).toEqual(["EXT"]);
		expect(changes.buildings.FP).toEqual({
			kinds: ["amount", "recipe"],
			newRecipes: ["FP#NEW"],
		});
		expect(changes.buildings.PP1).toEqual({
			kinds: ["added"],
			newRecipes: [],
		});
		expect(changes.buildings.HYF).toBeUndefined();
	});

	it("is empty without changes", () => {
		expect(buildingChanges(copy(), copy())).toEqual({
			buildings: {},
			removed: [],
		});
	});
});

describe("buildChangeSummary", () => {
	const input = (changes = diffPlan(copy(), copy())) => ({
		name: "EW COF",
		planet: "KW-688c",
		changes,
		before: figures(1000, 14),
		after: figures(2800, 11),
		priceSource: "universe 30-day average",
		url: "https://prunplanner.org/shared/abc",
	});

	it("lists every change, profit, ROI, prices and the link last", () => {
		const to = copy();
		to.plan_data.buildings[1].amount = 20;
		to.plan_data.buildings[1].active_recipes.pop();
		to.plan_corphq = true;

		const text = buildChangeSummary(input(diffPlan(copy(), to)), t);
		const lines = text.split("\n");

		expect(lines[0]).toBe("**EW COF** (KW-688c)");
		expect(text).toContain("save_conflict.change.corphq_on");
		expect(text).toContain(
			'save_conflict.change.amount{"label":"FP","from":19,"to":20}'
		);
		// the recipe line names the recipes before and after
		expect(text).toContain("sharing.changes.recipe");
		expect(text).toContain("1x 1xMUS 1xVEG 1xMAI=>10xRAT");
		expect(text).toContain('sharing.changes.profit{"from":"1,000"');
		expect(text).toContain('"to":"2,800"');
		expect(text).toContain("sharing.changes.roi");
		expect(text).toContain("universe 30-day average");
		expect(lines.at(-1)).toBe("https://prunplanner.org/shared/abc");
	});

	it("stays within Discord's limit, the rest as '…and N more'", () => {
		const to = copy();
		to.plan_data.buildings = Array.from({ length: 200 }, (_, i) => ({
			name: `B${i}`,
			amount: 1,
			active_recipes: [],
		}));
		const changes = diffPlan(copy(), to);

		const text = buildChangeSummary(input(changes), t);

		expect(text.length).toBeLessThanOrEqual(SUMMARY_LIMIT);
		const more = text.match(/sharing\.changes\.more\{"n":(\d+)\}/);
		expect(more).not.toBeNull();
		const listed = text
			.split("\n")
			.filter((l) => l.startsWith("- save_conflict")).length;
		expect(listed + Number(more![1])).toBe(changes.length);
		// the link survives the cut
		expect(text.endsWith("https://prunplanner.org/shared/abc")).toBe(true);
	});

	it("leaves a short summary whole", () => {
		const text = buildChangeSummary(input(), t);
		expect(text).not.toContain("sharing.changes.more");
	});
});
