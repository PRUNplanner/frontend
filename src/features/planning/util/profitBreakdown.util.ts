// Types & Interfaces
import type {
	IMaterialIO,
	IOverviewData,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";
import type {
	IProfitBreakdown,
	IProfitBreakdownItem,
} from "@/features/planning/util/profitBreakdown.types";

const byValue = (a: IProfitBreakdownItem, b: IProfitBreakdownItem) =>
	b.value - a.value;

/**
 * Splits a plan's daily profit into output value, production inputs,
 * workforce consumables and degradation, and into buildings. No new maths:
 * the steps reuse the engine's priced material i/o, so output − inputs −
 * workforce − degradation is the Overview profit.
 *
 * @remark Materials are netted on the combined material i/o, so one made
 * and used here only counts its surplus or shortfall. A shortfall goes to
 * workforce up to what the workers consume, the rest to production inputs.
 * A building's `dailyRevenue` already subtracts its degradation, which is
 * added back here, so degradation is its own step. Workforce per building
 * and buy/sell spreads of materials traded between buildings leave a small
 * rest, `unattributed`.
 * @author jplacht
 *
 * @param {IMaterialIO[]} materialIO combined, priced material i/o
 * @param {IMaterialIO[]} workforceMaterialIO priced workforce consumption
 * @param {IProductionBuilding[]} buildings production buildings
 * @param {IOverviewData} overview plan overview
 * @returns {IProfitBreakdown} breakdown
 */
export function profitBreakdown(
	materialIO: IMaterialIO[],
	workforceMaterialIO: IMaterialIO[],
	buildings: IProductionBuilding[],
	overview: IOverviewData
): IProfitBreakdown {
	const workforceCost = new Map(
		workforceMaterialIO.map((m) => [m.ticker, Math.max(-m.price, 0)])
	);

	let output = 0;
	let inputs = 0;
	let workforce = 0;
	const outputItems: IProfitBreakdownItem[] = [];
	const inputItems: IProfitBreakdownItem[] = [];
	const workforceItems: IProfitBreakdownItem[] = [];

	for (const m of materialIO) {
		if (m.price === 0 || m.delta === 0) continue;
		const price = m.price / m.delta;

		if (m.price > 0) {
			output += m.price;
			outputItems.push({
				key: m.ticker,
				value: m.price,
				amount: m.delta,
				price,
			});
			continue;
		}

		const cost = -m.price;
		const toWorkforce = Math.min(cost, workforceCost.get(m.ticker) ?? 0);
		const toInputs = cost - toWorkforce;
		workforce += toWorkforce;
		inputs += toInputs;
		if (toWorkforce > 0)
			workforceItems.push({
				key: m.ticker,
				value: toWorkforce,
				amount: toWorkforce / price,
				price,
			});
		if (toInputs > 0)
			inputItems.push({
				key: m.ticker,
				value: toInputs,
				amount: toInputs / price,
				price,
			});
	}

	// constructionCost is a (negative) value, so this adds degradation back
	const buildingItems: IProfitBreakdownItem[] = buildings.map((b) => ({
		key: b.name,
		value: b.dailyRevenue - (b.constructionCost * b.amount) / 180,
	}));
	const degradation = overview.dailyDegradationCost;
	const attributed =
		buildingItems.reduce((sum, b) => sum + b.value, 0) - degradation;

	return {
		output,
		inputs,
		workforce,
		degradation,
		profit: overview.profit,
		outputItems: outputItems.sort(byValue),
		inputItems: inputItems.sort(byValue),
		workforceItems: workforceItems.sort(byValue),
		buildings: buildingItems.sort(byValue),
		unattributed: overview.profit - attributed,
	};
}
