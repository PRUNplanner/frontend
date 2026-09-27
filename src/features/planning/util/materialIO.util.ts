// Composables
import type {
	IEmpireMaterialIO,
	IEmpireMaterialIOPlanet,
	IEmpirePlanMaterialIO,
} from "@/features/empire/empire.types";
import type {
	EmpireMaterialIOState,
	PlanEmpireElement,
} from "@/features/api/schemas/empireData.schemas";
import { useMaterialData } from "@/database/services/useMaterialData";
import {
	combineMaterialIOMinimal,
	enhanceMaterialIOMinimal as enhanceWithMaterials,
} from "@/features/planning/engine/materialIO";

// Types & Interfaces
import type { Material } from "@/features/api/schemas/gameData.schemas";
import type {
	IMaterialIOMaterial,
	IMaterialIOMinimal,
} from "@/features/planning/usePlanCalculation.types";

export function useMaterialIOUtil() {
	const { materialsMap } = useMaterialData();

	// material lookup for the engine, reactive through materialsMap
	const materials = {
		get: (ticker: string): Material | undefined =>
			materialsMap.value[ticker],
	};

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
		return enhanceWithMaterials(materials, data);
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
					planCOGC: planInfo.planCOGC,
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

	async function empireMaterialIOState(
		empire: PlanEmpireElement | undefined,
		data: IEmpireMaterialIO[]
	): Promise<EmpireMaterialIOState | undefined> {
		if (!empire) return undefined;

		const result: EmpireMaterialIOState = {
			metadata: {
				faction: empire.empire_faction,
				permits_used: empire.empire_permits_used,
				permits_total: empire.empire_permits_total,
				plan_count: empire.plans.length,
				timestamp: new Date().toISOString(),
			},
			empire_total: {},
			plan_details: {},
		};

		const round = (val: number) => Math.round(val * 10000) / 10000;

		// empire totals
		data.forEach((item) => {
			const ticker = item.ticker;

			result.empire_total[ticker] = {
				p: round(item.output),
				c: round(item.input),
				d: round(item.delta),
			};

			// processing plans
			const allPlanEntries = [
				...item.inputPlanets,
				...item.outputPlanets,
			];
			const seenPlansInTicker = new Set();

			allPlanEntries.forEach((planEntry) => {
				const uuid = planEntry.planUuid;

				if (seenPlansInTicker.has(uuid)) return;
				seenPlansInTicker.add(uuid);

				if (!result.plan_details[uuid]) {
					result.plan_details[uuid] = {
						metadata: {
							planet_natural_id: planEntry.planetId,
							cogc: planEntry.planCOGC,
						},
						deltas: {},
					};
				}

				// Record the production/consumption for this specific plan
				// input -> c, output -> p, delta -> d
				result.plan_details[uuid].deltas[ticker] = {
					p: round(planEntry.output),
					c: round(planEntry.input),
					d: round(planEntry.delta),
				};
			});
		});

		return result;
	}

	return {
		combineMaterialIOMinimal,
		enhanceMaterialIOMinimal,
		combineEmpireMaterialIO,
		empireMaterialIOState,
	};
}
