import { z } from "zod";

// Engine
import {
	compareRows,
	materialChanges,
	paybackOfDifference,
} from "@/features/planning/util/whatIf.util";

// Util
import { calculate, loadPlanSetup } from "@/mcp/context";
import { basisText, PriceBasisSchema } from "@/mcp/priceBasis";
import { planChanges } from "@/mcp/tools/planVersions";
import {
	amount,
	defineTool,
	figures,
	money,
	planUrl,
	uuidArg,
} from "@/mcp/tools/shared";

// Types & Interfaces
import type { IPlanSetup } from "@/mcp/context";

const finite = (v: number): number | null =>
	Number.isFinite(v) ? money(v) : null;

export const comparePlans = defineTool({
	name: "compare_plans",
	title: "Compare two plans",
	description:
		"Compares two saved plans as Plan check's compare does: each key figure (profit, revenue, cost, construction cost, payback, profit per area) for both, the difference and the better side; the materials whose value per day differs most; the payback of the difference (B's extra construction cost against its extra profit per day); and what differs in the plans themselves, worded as the app's version compare. Each plan is calculated as its plan page opens it, unless empire_uuid puts both in one empire; price_basis prices both alike, e.g. at an exchange's current VWAP or ask/bid.",
	inputSchema: z.object({
		plan_a: uuidArg().describe("First plan (from list_plans)"),
		plan_b: uuidArg().describe("Second plan"),
		empire_uuid: uuidArg()
			.optional()
			.describe("Calculate both in this empire (faction, CX preference)"),
		price_basis: PriceBasisSchema.optional(),
	}),
	async run(
		{ plan_a, plan_b, empire_uuid, price_basis },
		{ backend, appUrl }
	) {
		const basis = price_basis ?? "plan";
		const [a, b] = await Promise.all([
			loadPlanSetup(backend, plan_a, empire_uuid, basis),
			loadPlanSetup(backend, plan_b, empire_uuid, basis),
		]);
		const ca = calculate(a);
		const cb = calculate(b);

		const side = (s: IPlanSetup, calc: typeof ca) => ({
			uuid: s.plan.uuid,
			name: s.plan.plan_name,
			planet: s.planet.planet_natural_id,
			empire: s.resolved.empire?.empire_name ?? null,
			price_basis: basisText(s.basis, s.cx),
			per_day: figures(calc),
			url: planUrl(appUrl, s.plan),
		});
		const rows = compareRows(ca, cb).map((r) => ({
			figure: r.key,
			a: finite(r.a),
			b: finite(r.b),
			b_minus_a: finite(r.delta),
			better: r.better === undefined ? null : r.better ? "b" : "a",
		}));
		const materials = materialChanges(ca, cb)
			.toSorted((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
			.slice(0, 15)
			.map((m) => ({
				ticker: m.ticker,
				a_value_per_day: money(m.a),
				b_value_per_day: money(m.b),
				b_minus_a: money(m.delta),
			}));
		const payback = paybackOfDifference(ca, cb);
		const changes = planChanges(a.plan, b.plan);
		const notes = [
			a.resolved.note && `A: ${a.resolved.note}`,
			b.resolved.note && `B: ${b.resolved.note}`,
			a.planet.planet_natural_id !== b.planet.planet_natural_id &&
				"Different planets: fees, resources, fertility and COGC differ too.",
			(a.resolved.empire?.uuid ?? null) !==
				(b.resolved.empire?.uuid ?? null) &&
				"Calculated in different empires (faction bonus and CX preference); pass empire_uuid to use one.",
		].filter(Boolean);

		const fa = figures(ca);
		const fb = figures(cb);
		return {
			text: `${a.plan.plan_name} vs ${b.plan.plan_name}: profit ${fa.profit} vs ${fb.profit} per day, construction cost ${fa.construction_cost} vs ${fb.construction_cost}, ROI ${fa.roi_days ?? "never"} vs ${fb.roi_days ?? "never"} days; ${changes.length} differences in the plans.`,
			data: {
				a: side(a, ca),
				b: side(b, cb),
				figures: rows,
				material_changes: materials,
				payback_of_difference: {
					extra_construction_cost: money(payback.cost),
					extra_profit_per_day: money(payback.profit),
					days:
						typeof payback.days === "number"
							? amount(payback.days)
							: payback.days,
				},
				plan_differences: changes.slice(0, 60).map((c) => c.text),
				note: notes.join(" ") || null,
			},
		};
	},
});
