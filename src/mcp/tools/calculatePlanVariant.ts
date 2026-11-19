import { z } from "zod";

// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { paybackOfDifference } from "@/features/planning/util/whatIf.util";

// Util
import { calculate, loadPlanSetup } from "@/mcp/context";
import { basisText, type PriceBasis } from "@/mcp/priceBasis";
import { buildVariant, VariantChangesSchema } from "@/mcp/variant";
import {
	amount,
	constructionMaterials,
	defineTool,
	figures,
	materialLines,
	money,
	planUrl,
	shipping,
	cogcWarnings,
	warnings,
	workforce,
	uuidArg,
} from "@/mcp/tools/shared";

// Types & Interfaces
import type { IPriceBook } from "@/features/cx/priceBook";
import type { IPlanCalculation } from "@/features/planning/engine/engine.types";

const PriceOverrideSchema = z.object({
	ticker: z.string(),
	buy: z.number().min(0).optional().describe("Price per unit when bought"),
	sell: z.number().min(0).optional().describe("Price per unit when sold"),
});
type PriceOverride = z.infer<typeof PriceOverrideSchema>;

const EPSILON = 0.005;

/**
 * A price book with some prices replaced
 * @author jplacht
 */
function overriddenBook(
	book: IPriceBook,
	overrides: Map<string, PriceOverride>
): IPriceBook {
	return {
		getPrice(ticker, type) {
			const o = overrides.get(ticker);
			const price = type === "BUY" ? o?.buy : o?.sell;
			return price ?? book.getPrice(ticker, type);
		},
		getPriceSource: book.getPriceSource,
	};
}

/**
 * Material lines that changed between two calculations, a missing side
 * reading 0
 * @author jplacht
 */
function changedLines(
	before: IPlanCalculation,
	beforeBook: IPriceBook,
	after: IPlanCalculation,
	afterBook: IPriceBook,
	overrides: Map<string, PriceOverride>,
	bases: [PriceBasis, PriceBasis]
) {
	const zero = { input: 0, output: 0, delta: 0, value: 0 };
	const a = new Map(
		materialLines(before.result.materialio, beforeBook, bases[0]).map(
			(l) => [l.ticker, l]
		)
	);
	const b = new Map(
		materialLines(after.result.materialio, afterBook, bases[1]).map((l) => [
			l.ticker,
			l,
		])
	);
	return [...new Set([...a.keys(), ...b.keys()])]
		.sort()
		.map((ticker) => {
			const x = a.get(ticker);
			const y = b.get(ticker);
			const o = overrides.get(ticker);
			const overridden =
				y && (y.delta > 0 ? o?.sell : o?.buy) !== undefined;
			const pick = (l: typeof x) =>
				l
					? {
							input: l.input,
							output: l.output,
							delta: l.delta,
							value: l.value,
						}
					: zero;
			return {
				ticker,
				before: pick(x),
				after: pick(y),
				value_change: money((y?.value ?? 0) - (x?.value ?? 0)),
				unit_price: y?.unit_price ?? x?.unit_price ?? 0,
				price_source: overridden
					? "price override (this variant)"
					: (y?.price_source ?? x?.price_source),
			};
		})
		.filter(
			(l) =>
				Math.abs(l.after.delta - l.before.delta) >= 0.0001 ||
				Math.abs(l.value_change) >= EPSILON
		);
}

/**
 * Construction materials the change adds and removes, priced like the
 * construction cost
 * @author jplacht
 */
function constructionChange(
	before: IPlanCalculation,
	after: IPlanCalculation,
	book: IPriceBook
) {
	const a = new Map(
		constructionMaterials(before, book).map((m) => [m.ticker, m.amount])
	);
	const b = new Map(
		constructionMaterials(after, book).map((m) => [m.ticker, m.amount])
	);
	const lines = [...new Set([...a.keys(), ...b.keys()])]
		.sort()
		.map((ticker) => {
			const change = amount((b.get(ticker) ?? 0) - (a.get(ticker) ?? 0));
			const unit = book.getPrice(ticker, "BUY");
			return {
				ticker,
				change,
				unit_price: money(unit),
				value: money(unit * change),
			};
		})
		.filter((l) => l.change !== 0);
	return {
		to_buy: lines.filter((l) => l.change > 0),
		freed: lines.filter((l) => l.change < 0),
		net_cost: money(lines.reduce((s, l) => s + l.value, 0)),
	};
}

export const calculatePlanVariant = defineTool({
	name: "calculate_plan_variant",
	title: "Try a plan variant",
	description:
		"Calculates a what-if variant of a saved plan without saving anything (save_plan saves the same changes). Change buildings (absolute amounts, 0 removes; habs HB1… and storage STO… too), switch or re-weight a building's recipes (recipes replaces its orders; recipe_id + recipe_amount adds or re-weights one, recipe_amount 0 removes it), COGC, corp HQ, permits, experts, luxuries, the planet, the empire or faction, the price basis, or single prices. habs sizes habitation with the plan editor's optimiser (use auto after changing buildings). Returns before, after and the difference of the key figures, workforce and area, warnings, the changed material lines (before and after), the construction materials to buy or freed by the change, shipping before and after, and the payback of the difference.",
	inputSchema: VariantChangesSchema.extend({
		plan_uuid: uuidArg(),
		empire_uuid: uuidArg()
			.optional()
			.describe(
				"Empire both sides are calculated in (default the one the plan page opens with); use switch_empire_uuid to compare empires"
			),
		prices: z
			.array(PriceOverrideSchema)
			.optional()
			.describe("Price overrides for the variant only"),
	}),
	async run(args, { backend, appUrl }) {
		const setup = await loadPlanSetup(
			backend,
			args.plan_uuid,
			args.empire_uuid
		);
		const before = calculate(setup);
		const variant = await buildVariant(backend, setup, args);

		const overrides = new Map(
			(args.prices ?? []).map((o) => [o.ticker.toUpperCase(), o])
		);
		let after = variant.calc;
		let afterBook = variant.ctx.prices;
		if (overrides.size) {
			afterBook = overriddenBook(variant.ctx.prices, overrides);
			after = calculatePlan(variant.input, {
				...variant.ctx,
				prices: afterBook,
			});
		}

		const fb = figures(before);
		const fa = figures(after);
		const delta = Object.fromEntries(
			(Object.keys(fb) as (keyof typeof fb)[]).map((k) => [
				k,
				fa[k] === null || fb[k] === null ? null : money(fa[k] - fb[k]),
			])
		);
		const payback = paybackOfDifference(before, after);
		const data = {
			plan: {
				uuid: setup.plan.uuid,
				name: setup.plan.plan_name,
				url: planUrl(appUrl, setup.plan),
			},
			note: [setup.resolved.note, ...variant.notes, "Nothing was saved."]
				.filter(Boolean)
				.join(" "),
			price_basis: {
				before: basisText(setup.basis, setup.cx),
				after: basisText(variant.basis, variant.cx),
			},
			planet: variant.planet.planet_natural_id,
			empire: variant.empire
				? {
						uuid: variant.empire.uuid,
						name: variant.empire.empire_name,
						faction: variant.empire.empire_faction,
					}
				: null,
			before: fb,
			after: fa,
			delta,
			workforce_before: workforce(before),
			workforce_after: workforce(after),
			workforce_left_delta: Object.fromEntries(
				Object.values(after.result.workforce)
					.map((w) => [
						w.name,
						amount(w.left - before.result.workforce[w.name].left),
					])
					.filter(([, d]) => d !== 0)
			),
			area_before: before.result.area,
			area_after: after.result.area,
			area_used_delta: amount(
				after.result.area.areaUsed - before.result.area.areaUsed
			),
			infrastructure_after: Object.fromEntries(
				Object.entries(after.result.infrastructure).filter(
					([, n]) => n > 0
				)
			),
			warnings_after: [
				...warnings(after),
				...cogcWarnings(
					after,
					variant.planet,
					setup.gameData.buildings
				),
			],
			changed_material_io: changedLines(
				before,
				setup.ctx.prices,
				after,
				afterBook,
				overrides,
				[setup.basis, variant.basis]
			),
			construction_change: constructionChange(before, after, afterBook),
			shipping_before: shipping(before),
			shipping_after: shipping(after),
			payback_of_difference: {
				extra_construction_cost: money(payback.cost),
				extra_profit_per_day: money(payback.profit),
				days:
					typeof payback.days === "number"
						? amount(payback.days)
						: payback.days,
			},
		};
		return {
			text: `Variant of ${setup.plan.plan_name}: profit ${fb.profit} → ${fa.profit} per day (${delta.profit! >= 0 ? "+" : ""}${delta.profit}), construction cost ${fb.construction_cost} → ${fa.construction_cost}. Nothing was saved.`,
			data,
		};
	},
});
