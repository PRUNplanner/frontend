// Types & Interfaces
import type { Material } from "@/features/api/schemas/gameData.schemas";
import {
	IMaterialIOMaterial,
	IMaterialIOMinimal,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

export const TOTALMSDAY: number = 24 * 60 * 60 * 1000;

/**
 * Combines multiple material i/o arrays into a single one, summing up
 * input and output per ticker in order of appearance
 * @author jplacht
 *
 * @param {IMaterialIOMinimal[][]} arrays Material IO arrays
 * @returns {IMaterialIOMinimal[]} Combined Material IO
 */
export function combineMaterialIOMinimal(
	arrays: IMaterialIOMinimal[][]
): IMaterialIOMinimal[] {
	const combinedArray: IMaterialIOMinimal[] = arrays.flat().filter((v) => v);

	const tickerMap: { [key: string]: IMaterialIOMinimal } = {};

	combinedArray.forEach(({ ticker, input, output }) => {
		if (!tickerMap[ticker]) {
			tickerMap[ticker] = { ticker: ticker, input: 0, output: 0 };
		}

		tickerMap[ticker].input += input as number;
		tickerMap[ticker].output += output as number;
	});

	return Object.values(tickerMap);
}

/**
 * Enhances a minimal material i/o with delta, weight and volume, sorted
 * by ticker. Throws if a material is unknown.
 * @author jplacht
 *
 * @param {Pick<ReadonlyMap<string, Material>, "get">} materials Material lookup
 * @param {IMaterialIOMinimal[]} data Minimal Material IO
 * @returns {IMaterialIOMaterial[]} Material IO with material information
 */
export function enhanceMaterialIOMinimal(
	materials: Pick<ReadonlyMap<string, Material>, "get">,
	data: IMaterialIOMinimal[]
): IMaterialIOMaterial[] {
	const enhancedArray: IMaterialIOMaterial[] = [];

	data.forEach((minimal) => {
		const material = materials.get(minimal.ticker);
		if (!material)
			throw new Error(`Material ${minimal.ticker} not available.`);

		enhancedArray.push({
			ticker: minimal.ticker,
			input: minimal.input,
			output: minimal.output,
			delta: minimal.output - minimal.input,
			individualWeight: material.weight,
			individualVolume: material.volume,
			totalWeight: (minimal.output - minimal.input) * material.weight,
			totalVolume: (minimal.output - minimal.input) * material.volume,
		});
	});

	// return sorted
	return enhancedArray.sort((a, b) => (a.ticker > b.ticker ? 1 : -1));
}

/**
 * Calculates production buildings total material io based on their
 * running active recipe batches
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
export function calculateMaterialIO(
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
