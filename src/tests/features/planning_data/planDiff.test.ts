import { describe, expect, it } from "vitest";

import {
	diffPlan,
	type IPlanDiffable,
} from "@/features/planning_data/planDiff";
import { threeWay } from "@/features/save_conflict/saveConflict.util";

function plan(): IPlanDiffable {
	return {
		plan_name: "Base",
		plan_cogc: "---",
		plan_corphq: false,
		plan_permits_used: 1,
		plan_data: {
			experts: [
				{ type: "Agriculture", amount: 0 },
				{ type: "Chemistry", amount: 1 },
			],
			workforce: [
				{ type: "pioneer", lux1: true, lux2: true },
				{ type: "settler", lux1: true, lux2: true },
			],
			infrastructure: [
				{ building: "HB1", amount: 2 },
				{ building: "HBB", amount: 6 },
			],
			buildings: [
				{
					name: "EXT",
					amount: 1,
					active_recipes: [{ recipeid: "EXT#1", amount: 1 }],
				},
				{
					name: "RIG",
					amount: 2,
					active_recipes: [{ recipeid: "RIG#1", amount: 1 }],
				},
			],
		},
	};
}

describe("diffPlan", () => {
	it("no changes, also when lists are reordered", () => {
		const reordered = plan();
		reordered.plan_data.buildings.reverse();
		reordered.plan_data.infrastructure.reverse();
		reordered.plan_data.experts.reverse();
		reordered.plan_data.workforce.reverse();

		expect(diffPlan(plan(), plan())).toStrictEqual([]);
		expect(diffPlan(plan(), reordered)).toStrictEqual([]);
	});

	it("lists added, removed and changed items", () => {
		const to = plan();
		to.plan_name = "Renamed";
		to.plan_permits_used = 2;
		to.plan_cogc = "AGRICULTURE";
		to.plan_corphq = true;
		to.plan_data.infrastructure = [
			{ building: "HB1", amount: 3 },
			{ building: "STO", amount: 1 },
		];
		to.plan_data.experts[0].amount = 2;
		to.plan_data.workforce[1].lux2 = false;
		to.plan_data.buildings = [
			{
				name: "EXT",
				amount: 1,
				active_recipes: [{ recipeid: "EXT#2", amount: 1 }],
			},
			{ name: "FRM", amount: 2, active_recipes: [] },
		];

		expect(diffPlan(plan(), to)).toStrictEqual([
			{
				area: "name",
				key: "name",
				params: { from: "Base", to: "Renamed" },
			},
			{ area: "permits", key: "permits", params: { from: 1, to: 2 } },
			{
				area: "cogc",
				key: "cogc",
				params: { from: "---", to: "AGRICULTURE" },
			},
			{ area: "corphq", key: "corphq_on", params: {} },
			{
				area: "building:FRM",
				key: "added",
				params: { label: "FRM", amount: 2 },
			},
			{ area: "building:RIG", key: "removed", params: { label: "RIG" } },
			{
				area: "building:EXT",
				key: "recipe",
				params: { label: "EXT", from: "1x 1", to: "1x 2" },
			},
			{
				area: "infrastructure:HB1",
				key: "amount",
				params: { label: "HB1", from: 2, to: 3 },
			},
			{
				area: "infrastructure:HBB",
				key: "removed",
				params: { label: "HBB" },
			},
			{
				area: "infrastructure:STO",
				key: "added",
				params: { label: "STO", amount: 1 },
			},
			{
				area: "expert:Agriculture",
				key: "experts",
				params: { label: "Agriculture", from: 0, to: 2 },
			},
			{
				area: "workforce:settler",
				key: "lux_off",
				params: { label: "settler", n: 2 },
			},
		]);
	});

	it("a building's amount and recipe amounts", () => {
		const to = plan();
		to.plan_data.buildings[1].amount = 3;
		to.plan_data.buildings[0].active_recipes[0].amount = 2;

		expect(diffPlan(plan(), to)).toStrictEqual([
			{
				area: "building:EXT",
				key: "recipe",
				params: { label: "EXT", from: "1x 1", to: "2x 1" },
			},
			{
				area: "building:RIG",
				key: "amount",
				params: { label: "RIG", from: 2, to: 3 },
			},
		]);
	});

	it("both tabs: B HB1 2 → 3, A HBB 6 → 7 and both HB1", () => {
		const theirs = plan();
		theirs.plan_data.infrastructure[0].amount = 3;
		const mine = plan();
		mine.plan_data.infrastructure[1].amount = 7;
		mine.plan_data.infrastructure[0].amount = 4;

		const result = threeWay(plan(), theirs, mine, diffPlan);

		expect(result.theirs).toStrictEqual([
			{
				area: "infrastructure:HB1",
				key: "amount",
				params: { label: "HB1", from: 2, to: 3 },
			},
		]);
		expect(result.mine.map((l) => l.params)).toStrictEqual([
			{ label: "HB1", from: 2, to: 4 },
			{ label: "HBB", from: 6, to: 7 },
		]);
		expect(result.both).toStrictEqual(["infrastructure:HB1"]);
	});
});
