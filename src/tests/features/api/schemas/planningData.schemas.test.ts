import { describe, it, expect } from "vitest";
import {
	PlanCreateDataSchema,
	PlanSchema,
	PlanSummarySchema,
} from "@/features/api/schemas/planningData.schemas";

const summary = {
	v: 1,
	profit: 27740.4,
	revenue: 41000,
	cost: 13259.6,
	payback_days: 45.2,
	plan_cost: 1253000,
	area_used: 412,
	area_total: 500,
	outputs: [{ ticker: "FE", per_day: 123.4 }],
	price_basis: "CI1_30D",
	cogc: "METALLURGY",
};

const plan = {
	uuid: "da105ce1-25f2-479d-b1eb-944353f4784f",
	plan_name: "Plan",
	planet_natural_id: "OT-580b",
	plan_permits_used: 1,
	plan_corphq: false,
	plan_cogc: "---",
	plan_data: {
		experts: [],
		workforce: [],
		infrastructure: [],
		buildings: [],
	},
};

describe("PlanSummarySchema", () => {
	it("parses the backend's summary", () => {
		expect(PlanSummarySchema.parse(summary)).toStrictEqual(summary);
	});

	it.each([
		{ v: 2 },
		{ cogc: "---" },
		{ outputs: Array(5).fill({ ticker: "FE", per_day: 1 }) },
		{ area_used: 1.5 },
		{ payback_days: -1 },
	])("rejects %o", (override) => {
		expect(
			PlanSummarySchema.safeParse({ ...summary, ...override }).success
		).toBe(false);
	});
});

describe("PlanSchema", () => {
	it.each([
		{},
		{ plan_summary: null, plan_summary_at: null },
		{ plan_summary: summary, plan_summary_at: "2026-11-08T12:00:00Z" },
	])("reads a plan with %o", (extra) => {
		expect(PlanSchema.safeParse({ ...plan, ...extra }).success).toBe(true);
	});

	it("reads a summary it doesn't know as null", () => {
		const parsed = PlanSchema.parse({
			...plan,
			plan_summary: { v: 2, anything: true },
		});
		expect(parsed.plan_summary).toBeNull();
	});

	it("sends the summary with a save, or leaves it out", () => {
		const { uuid: _uuid, ...data } = plan;
		expect(PlanCreateDataSchema.parse(data)).not.toHaveProperty(
			"plan_summary"
		);
		expect(
			PlanCreateDataSchema.parse({ ...data, plan_summary: summary })
				.plan_summary
		).toStrictEqual(summary);
	});
});
