import { z } from "zod";

// Engine
import {
	combineEmpireMaterialIO,
	empireCostOverview,
} from "@/features/empire/util/empireMaterialIO.util";

// Util
import {
	calculate,
	findEmpireCX,
	getCXs,
	getEmpirePlans,
	getEmpires,
	planSetup,
} from "@/mcp/context";
import { getPlanet, loadGameData, preloadPlanets } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { basisText, PriceBasisSchema } from "@/mcp/priceBasis";
import { buildVariant, sizingNotes, VariantChangesSchema } from "@/mcp/variant";
import { calculateNew, NewPlanSchema } from "@/mcp/tools/calculateNewPlan";
import {
	amount,
	argsOf,
	defineTool,
	empireUrl,
	money,
	planUrl,
	uuidArg,
} from "@/mcp/tools/shared";

// Types & Interfaces
import type { IEmpireMaterialIO } from "@/features/empire/empire.types";
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";

interface IEmpirePlanRow {
	uuid: string;
	name: string;
	planet: string;
	planCOGC: string;
	calc: IPlanCalculation;
}

/** an empire's totals and material rows from its plans' calculations */
function aggregate(rows: IEmpirePlanRow[]) {
	const combined = combineEmpireMaterialIO(
		rows.map((r) => ({
			planetId: r.planet,
			planUuid: r.uuid,
			planName: r.name,
			planCOGC: r.planCOGC as never,
			materialIO: r.calc.result.materialio,
		}))
	);
	const totals = empireCostOverview(
		combined,
		rows.map((r) => r.calc.result)
	);
	return { combined, totals };
}

/** "buys", "sells" or "balanced" for an empire's net daily flow */
const position = (delta: number) =>
	Math.abs(delta) < 0.0001
		? "balanced"
		: delta > 0
			? "sells surplus"
			: "buys";

export const calculateEmpireVariant = defineTool({
	name: "calculate_empire_variant",
	title: "Try an empire variant",
	description:
		"What-if for a whole empire without saving anything: change several plans at once (each with the fields of calculate_plan_variant), take plans out, or add unsaved plans (as calculate_new_plan). Returns the empire's profit, revenue and cost per day before and after, each plan's profit before and after, and every material whose empire balance changes: daily amounts and value before and after, whether the empire buys it, balances it or sells a surplus, and which plans make and use it after. Use it for 'if Plan A makes its own X, what does it do to Plan B and the empire?'.",
	inputSchema: z.object({
		empire_uuid: uuidArg(),
		changes: z
			.array(
				argsOf(VariantChangesSchema.extend({ plan_uuid: uuidArg() }))
			)
			.optional()
			.describe(
				"Per plan: plan_uuid and calculate_plan_variant's change arguments"
			),
		remove_plans: z.array(uuidArg()).optional(),
		new_plans: z
			.array(argsOf(NewPlanSchema))
			.max(5)
			.optional()
			.describe("Each: calculate_new_plan's arguments"),
		price_basis: PriceBasisSchema.optional(),
	}),
	async run(args, { backend, appUrl }) {
		const [empires, cxs, plans, gameData] = await Promise.all([
			getEmpires(backend),
			getCXs(backend),
			getEmpirePlans(backend, args.empire_uuid),
			loadGameData(backend),
		]);
		const empire = empires.find((e) => e.uuid === args.empire_uuid);
		if (!empire) throw new ToolError(`Unknown empire ${args.empire_uuid}.`);
		const cx = findEmpireCX(cxs, empire.uuid);
		const basis = args.price_basis ?? "plan";
		const changes = new Map(
			(args.changes ?? []).map((c) => [c.plan_uuid, c])
		);
		const removed = new Set(args.remove_plans ?? []);
		for (const id of [...changes.keys(), ...removed])
			if (!plans.some((p) => p.uuid === id))
				throw new ToolError(
					`Plan ${id} isn't in ${empire.empire_name}.`
				);

		await preloadPlanets(
			backend,
			plans.map((p) => p.planet_natural_id)
		);
		const notes: string[] = [];
		const before: IEmpirePlanRow[] = [];
		const after: IEmpirePlanRow[] = [];
		for (const plan of plans) {
			const planet = await getPlanet(backend, plan.planet_natural_id);
			const setup = planSetup(
				plan,
				planet,
				gameData,
				{ empire },
				cx,
				basis
			);
			const row = {
				uuid: plan.uuid,
				name: plan.plan_name,
				planet: plan.planet_natural_id,
				planCOGC: plan.plan_cogc,
			};
			const calc = calculate(setup);
			before.push({ ...row, calc });
			if (removed.has(plan.uuid)) continue;
			const change = changes.get(plan.uuid);
			if (!change) {
				after.push({ ...row, calc });
				continue;
			}
			const v = await buildVariant(backend, setup, change);
			notes.push(...v.notes.map((n) => `${plan.plan_name}: ${n}`));
			after.push({
				...row,
				planet: v.planet.planet_natural_id,
				planCOGC: v.plan.plan_cogc,
				calc: v.calc,
			});
		}
		for (const [i, np] of (args.new_plans ?? []).entries()) {
			const v = await calculateNew(backend, np, empire.uuid, basis);
			notes.push(...sizingNotes(v).map((n) => `New plan ${i + 1}: ${n}`));
			after.push({
				uuid: `new-${i + 1}`,
				name: `New plan ${i + 1} (${v.planet.planet_natural_id})`,
				planet: v.planet.planet_natural_id,
				planCOGC: v.plan.plan_cogc,
				calc: v.calc,
			});
		}

		const a = aggregate(before);
		const b = aggregate(after);
		const rowOf = (rows: IEmpireMaterialIO[]) =>
			new Map(rows.map((r) => [r.ticker, r]));
		const ra = rowOf(a.combined);
		const rb = rowOf(b.combined);
		const materials = [...new Set([...ra.keys(), ...rb.keys()])]
			.sort()
			.map((ticker) => {
				const x = ra.get(ticker);
				const y = rb.get(ticker);
				return {
					ticker,
					before: {
						delta: amount(x?.delta ?? 0),
						value: money(x?.deltaPrice ?? 0),
						position: position(x?.delta ?? 0),
					},
					after: {
						delta: amount(y?.delta ?? 0),
						value: money(y?.deltaPrice ?? 0),
						position: position(y?.delta ?? 0),
					},
					made_by_after: (y?.outputPlanets ?? []).map((p) => ({
						plan: p.planName,
						amount: amount(p.output),
					})),
					used_by_after: (y?.inputPlanets ?? []).map((p) => ({
						plan: p.planName,
						amount: amount(p.input),
					})),
				};
			})
			.filter(
				(m) =>
					Math.abs(m.after.delta - m.before.delta) >= 0.0001 ||
					Math.abs(m.after.value - m.before.value) >= 0.005
			);

		const profitOf = (rows: IEmpirePlanRow[], id: string) =>
			rows.find((r) => r.uuid === id)?.calc.result.profit;
		const planRows = [
			...before.map((r) => {
				const after_ = profitOf(after, r.uuid);
				return {
					uuid: r.uuid,
					name: r.name,
					status: removed.has(r.uuid)
						? "removed"
						: changes.has(r.uuid)
							? "changed"
							: "unchanged",
					profit_before: money(r.calc.result.profit),
					profit_after: after_ === undefined ? null : money(after_),
					url: planUrl(appUrl, {
						uuid: r.uuid,
						planet_natural_id: r.planet,
					} as never),
				};
			}),
			...after
				.filter((r) => r.uuid.startsWith("new-"))
				.map((r) => ({
					uuid: null,
					name: r.name,
					status: "new",
					profit_before: null,
					profit_after: money(r.calc.result.profit),
					url: `${appUrl}/plan/${r.planet}`,
				})),
		];

		const day = (t: typeof a.totals) => ({
			revenue: money(t.totalRevenue),
			cost: money(t.totalCost),
			profit: money(t.totalProfit),
		});
		const data = {
			empire: {
				uuid: empire.uuid,
				name: empire.empire_name,
				url: empireUrl(appUrl, empire.uuid),
			},
			note: [...notes, "Nothing was saved."].join(" "),
			price_basis: basisText(basis, cx),
			before: day(a.totals),
			after: day(b.totals),
			profit_change: money(b.totals.totalProfit - a.totals.totalProfit),
			plans: planRows,
			changed_materials: materials,
		};
		return {
			text: `${empire.empire_name}: profit ${data.before.profit} → ${data.after.profit} per day (${data.profit_change >= 0 ? "+" : ""}${data.profit_change}); ${materials.length} materials change. Nothing was saved.`,
			data,
		};
	},
});
