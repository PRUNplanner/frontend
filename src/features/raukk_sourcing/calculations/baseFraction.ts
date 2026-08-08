// Base fraction: how many base permits a plans product chain occupies.
// Pure math, no store or Vue access.

// Types & Interfaces
import { IRaukkMaterialUnits } from "@/features/raukk_sourcing/calculations/raukkCalculations.types";
import {
	IRaukkOutputCost,
	IRaukkSnapshot,
} from "@/features/raukk_sourcing/raukkSourcing.types";

/** Base fraction of a plan without any draws: its own base */
const OWN_BASE: number = 1;

/**
 * Cost weight of one output ticker within its plans output basket.
 *
 * Weights are the share of the sources total daily output value, so a
 * cheap by-product barely counts while the main product carries almost
 * the whole base. A source whose outputs are worth nothing falls back to
 * equal weights, otherwise a zero priced snapshot would silently drop
 * out of the metric.
 *
 * @author raukk
 *
 * @param {IRaukkOutputCost[]} outputs Source Plan Outputs
 * @returns {Record<string, number>} Weight per output ticker
 */
function costWeights(outputs: IRaukkOutputCost[]): Record<string, number> {
	const total: number = outputs.reduce(
		(sum, output) => sum + output.costPerUnit * output.unitsPerDay,
		0
	);

	const weights: Record<string, number> = {};

	outputs.forEach((output) => {
		weights[output.ticker] =
			total > 0
				? (output.costPerUnit * output.unitsPerDay) / total
				: 1 / outputs.length;
	});

	return weights;
}

/**
 * Base fraction of a plan from the daily amounts it draws elsewhere.
 *
 * A plan occupies its own base plus, per source plan, the cost weighted
 * share of that sources output it consumes, multiplied by the sources
 * own base fraction. Drawing half of a single output plans production
 * therefore yields `1 + 0.5 = 1.5`, and the recursion carries deeper
 * chains upwards: a source at 1.5 drawn at 50% adds 0.75.
 *
 * Values above the number of plans in the empire are possible and
 * meaningful, nothing is clamped: a high base fraction is exactly the
 * signal that a product chain ties up more permits than it is worth.
 *
 * Guards: tickers a source does not produce (any more) and outputs
 * without daily units are skipped, a source snapshot without a stored
 * base fraction counts as 1.
 *
 * @author raukk
 *
 * @param {Record<string, IRaukkMaterialUnits>} draws Draws per source
 * plan uuid, then ticker to units per day
 * @param {(planUuid: string) => IRaukkSnapshot | undefined}
 * getSourceSnapshot Source Snapshot Lookup
 * @returns {number} Base Fraction, at least 1
 */
export function calculateBaseFraction(
	draws: Record<string, IRaukkMaterialUnits>,
	getSourceSnapshot: (planUuid: string) => IRaukkSnapshot | undefined
): number {
	return Object.entries(draws).reduce(
		(fraction, [sourcePlanUuid, tickers]) => {
			const snapshot: IRaukkSnapshot | undefined =
				getSourceSnapshot(sourcePlanUuid);

			if (!snapshot) return fraction;

			const outputs: IRaukkOutputCost[] = Object.values(snapshot.outputs);
			if (outputs.length === 0) return fraction;

			const weights: Record<string, number> = costWeights(outputs);

			const share: number = Object.entries(tickers).reduce(
				(sum, [ticker, unitsPerDay]) => {
					const output: IRaukkOutputCost | undefined =
						snapshot.outputs[ticker];

					if (!output || output.unitsPerDay <= 0) return sum;

					return (
						sum +
						(unitsPerDay / output.unitsPerDay) *
							(weights[ticker] ?? 0)
					);
				},
				0
			);

			return fraction + share * (snapshot.baseFraction ?? OWN_BASE);
		},
		OWN_BASE
	);
}
