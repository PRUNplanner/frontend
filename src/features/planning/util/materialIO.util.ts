// Composables
import {
	IEmpireMaterialIO,
	IEmpireMaterialIOPlanet,
	IEmpirePlanMaterialIO,
} from "@/features/empire/empire.types";
import { useMaterialData } from "@/database/services/useMaterialData";

// Types & Interfaces
import {
	IMaterialIOMaterial,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";

export async function useMaterialIOUtil() {
	const { materialsMap } = useMaterialData();

	/**
	 * Combines arrays of MaterialIOMinimal into a singular array
	 * with summed up input and output amounts per ticker
	 *
	 * @author jplacht
	 *
	 * @param {IMaterialIOMinimal[][]} arrays Array of MaterialIOMinimals
	 * @returns {IMaterialIOMinimal[]} combined array
	 */
	function combineMaterialIOMinimal(
		arrays: IMaterialIOMinimal[][]
	): IMaterialIOMinimal[] {
		const combinedArray: IMaterialIOMinimal[] = arrays
			.flat()
			.filter((v) => v);

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
	 * Enhances a MaterialIO Minimal with weight and volume
	 * information based on the arrays materials
	 *
	 * @author jplacht
	 *
	 * @param {IMaterialIOMinimal[]} data Minimal Array
	 * @returns {IMaterialIOMaterial[]} Array enhanced by Weight & Volume
	 */
	function enhanceMaterialIOMinimal(
		data: IMaterialIOMinimal[]
	): IMaterialIOMaterial[] {
		const enhancedArray: IMaterialIOMaterial[] = [];

		data.forEach((minimal) => {
			const material = materialsMap.value[minimal.ticker];

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

	function combineEmpireMaterialIO(
		data: IEmpirePlanMaterialIO[]
	): IEmpireMaterialIO[] {
		// key = Material Ticker
		const combinedMap: Record<string, IEmpireMaterialIO> = {};

		// create a combined map of all data
		data.forEach((planInfo) => {
			planInfo.materialIO.forEach((element) => {
				// create empty combined element if ticker not yet present
				if (!combinedMap[element.ticker]) {
					combinedMap[element.ticker] = {
						ticker: element.ticker,
						input: 0,
						output: 0,
						delta: 0,
						deltaPrice: 0,
						inputPlanets: [],
						outputPlanets: [],
					};
				}

				// overwrite values
				combinedMap[element.ticker].input += element.input;
				combinedMap[element.ticker].output += element.output;
				combinedMap[element.ticker].delta += element.delta;

				const planetPart: IEmpireMaterialIOPlanet = {
					planetId: planInfo.planetId,
					planUuid: planInfo.planUuid,
					planName: planInfo.planName,
					delta: element.delta,
					input: element.input,
					output: element.output,
					price: element.price,
				};

				/*
				 * Delta check, handle delta === 0 separately, as the planet is
				 * full consuming all its producing, so it needs to be on both sides
				 */
				if (element.input > 0) {
					// only consuming
					combinedMap[element.ticker].inputPlanets.push(planetPart);
				}
				if (element.output > 0) {
					// only producing
					combinedMap[element.ticker].outputPlanets.push(planetPart);
				}
				if (element.delta === 0) {
					// full consuming all its producing
					combinedMap[element.ticker].inputPlanets.push(planetPart);
					combinedMap[element.ticker].outputPlanets.push(planetPart);
				}
			});
		});

		/*
		 * Calculate the price to use for the individual material, this is not just
		 * an empire-based price, but depends on the prices given in the material i/o.
		 *
		 * Reasoning: As prices for materials can vary between plans according to the
		 * users exchange preferences, we'll do a weighted average of the price according
		 * to all input and output planets, their price from material i/o and the value
		 * (i.e. the amount) they're contributing
		 */

		Object.entries(combinedMap).map(([ticker, pre]) => {
			const flatPlanets = [pre.inputPlanets, pre.outputPlanets]
				.flat()
				.filter((v) => v);

			const flatValues: number[] = flatPlanets.map((pv) =>
				Math.abs(pv.delta)
			);
			const flatPrices: number[] = flatPlanets.map((pv) =>
				Math.abs(pv.price / pv.delta)
			);
			const sumValue: number = flatValues.reduce((sum, c) => sum + c, 0);
			const sumProduct: number = flatPrices.reduce(
				(sum, c, i) => sum + c * flatValues[i],
				0
			);

			// check for NaN, as sumValue could be 0 and lead to zero-division
			const weightedPrice: number = isNaN(sumProduct / sumValue)
				? 0
				: sumProduct / sumValue;

			// update price
			combinedMap[ticker].deltaPrice =
				combinedMap[ticker].delta * weightedPrice;
		});

		return Object.values(combinedMap).sort((a, b) =>
			a.ticker > b.ticker ? 1 : -1
		);
	}

	return {
		combineMaterialIOMinimal,
		enhanceMaterialIOMinimal,
		combineEmpireMaterialIO,
	};
}
