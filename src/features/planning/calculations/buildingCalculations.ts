// Types & Interfaces
import {
	IMaterialIOMinimal,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

export const TOTALMSDAY: number = 24 * 60 * 60 * 1000;

export function useBuildingCalculation() {
	/**
	 * Calculates a plans production buildings total material io based
	 * on their running active recipe batches
	 *
	 * @remark Single pass. Sums per ticker in the same order as combining
	 * each building's inputs, then outputs, then all buildings with
	 * combineMaterialIOMinimal, so results are bit-identical to that.
	 *
	 * @author jplacht
	 *
	 * @param {IProductionBuilding[]} data Production Buildings
	 * @returns {IMaterialIOMinimal[]} Material IO
	 */
	function calculateMaterialIO(
		data: IProductionBuilding[]
	): IMaterialIOMinimal[] {
		const total = new Map<string, IMaterialIOMinimal>();

		const add = (ticker: string, input: number, output: number) => {
			let element = total.get(ticker);
			if (!element) {
				element = { ticker: ticker, input: 0, output: 0 };
				total.set(ticker, element);
			}
			element.input += input;
			element.output += output;
		};

		for (const building of data) {
			const batchRuns: number =
				(TOTALMSDAY * building.amount) / building.totalBatchTime;

			const inputs = new Map<string, number>();
			const outputs = new Map<string, number>();

			for (const ar of building.activeRecipes) {
				// skip if the recipes amount is set to 0
				if (ar.amount === 0) continue;

				for (const i of ar.recipe.inputs)
					inputs.set(
						i.material_ticker,
						(inputs.get(i.material_ticker) ?? 0) +
							i.material_amount * ar.amount * batchRuns
					);
				for (const o of ar.recipe.outputs)
					outputs.set(
						o.material_ticker,
						(outputs.get(o.material_ticker) ?? 0) +
							o.material_amount * ar.amount * batchRuns
					);
			}

			// building order: its inputs, then outputs it doesn't consume
			for (const [ticker, input] of inputs)
				add(ticker, input, outputs.get(ticker) ?? 0);
			for (const [ticker, output] of outputs)
				if (!inputs.has(ticker)) add(ticker, 0, output);
		}

		return [...total.values()];
	}

	return {
		calculateMaterialIO,
	};
}
