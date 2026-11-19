// Types & Interfaces
import type {
	IEmpireCostOverview,
	IEmpireMaterialIO,
	IEmpireMaterialIONet,
	IEmpireMaterialIONetEntry,
	IEmpireMaterialIOPlanet,
	IEmpireMaterialIOSide,
	IEmpirePlanMaterialIO,
} from "@/features/empire/empire.types";
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import type {
	EmpireMaterialIOState,
	PlanEmpireElement,
} from "@/features/api/schemas/empireData.schemas";

const round2 = (v: number): number => Math.round(v * 100) / 100 || 0;

/**
 * Summarizes one side (producers or consumers) of an empire material row:
 * plans sorted by amount, their share of the side and how full the side's
 * bar is against the row's larger side
 * @author jplacht
 *
 * @param {IEmpireMaterialIOPlanet[]} planets Plans on this side
 * @param {"output" | "input"} side Which amount to read
 * @param {number} scale max(row production, row consumption)
 * @returns {IEmpireMaterialIOSide} Side summary
 */
export function summarizeSide(
	planets: IEmpireMaterialIOPlanet[],
	side: "output" | "input",
	scale: number
): IEmpireMaterialIOSide {
	const total = planets.reduce((sum, p) => sum + p[side], 0);
	const entries = planets
		.map((p) => ({
			planetId: p.planetId,
			planUuid: p.planUuid,
			planName: p.planName,
			amount: p[side],
			share: total > 0 ? p[side] / total : 0,
		}))
		.sort((a, b) => b.amount - a.amount);

	return {
		entries,
		total,
		top: entries[0],
		more: Math.max(entries.length - 1, 0),
		fillPct: scale > 0 ? (total / scale) * 100 : 0,
	};
}

/**
 * Nets an empire material row per planet (summing all plans on it) and
 * splits planets into surplus (balanced last) and needs
 * @author jplacht
 *
 * @param {IEmpireMaterialIO} row Empire material row
 * @returns {IEmpireMaterialIONet} Net per planet
 */
export function netPerPlanet(row: IEmpireMaterialIO): IEmpireMaterialIONet {
	const planets = new Map<
		string,
		{
			produces: number;
			consumes: number;
			plans: Map<string, { planName: string; volume: number }>;
		}
	>();

	const add = (p: IEmpireMaterialIOPlanet, side: "output" | "input") => {
		const planet = planets.get(p.planetId) ?? {
			produces: 0,
			consumes: 0,
			plans: new Map(),
		};
		if (side === "output") planet.produces += p.output;
		else planet.consumes += p.input;
		const plan = planet.plans.get(p.planUuid) ?? {
			planName: p.planName,
			volume: 0,
		};
		plan.volume += p[side];
		planet.plans.set(p.planUuid, plan);
		planets.set(p.planetId, planet);
	};
	row.outputPlanets.forEach((p) => add(p, "output"));
	row.inputPlanets.forEach((p) => add(p, "input"));

	const entries = [...planets.entries()].map(([planetId, p]) => {
		const raw = p.produces - p.consumes;
		return {
			raw,
			entry: {
				planetId,
				produces: round2(p.produces),
				consumes: round2(p.consumes),
				net: round2(raw),
				balanced: round2(raw) === 0,
				plans: [...p.plans.entries()]
					.map(([planUuid, plan]) => ({ planUuid, ...plan }))
					.sort((a, b) => b.volume - a.volume),
			} satisfies IEmpireMaterialIONetEntry,
		};
	});

	const surplus = entries.filter((e) => e.entry.net > 0);
	const balanced = entries.filter((e) => e.entry.balanced);
	const needs = entries.filter((e) => e.entry.net < 0);
	const sum = (list: typeof entries) =>
		round2(list.reduce((s, e) => s + e.raw, 0));

	return {
		surplus: [...surplus.sort((a, b) => b.raw - a.raw), ...balanced].map(
			(e) => e.entry
		),
		needs: needs.sort((a, b) => a.raw - b.raw).map((e) => e.entry),
		// balanced planets' leftovers count to surplus, so the totals add up to the row delta
		surplusTotal: sum([...surplus, ...balanced]),
		needsTotal: sum(needs),
	};
}

/**
 * Planet name without the "(ID)" suffix `usePlanetData` adds to named
 * planets, the id stays in the link title
 * @author jplacht
 *
 * @param {Map<string, string>} planetNames Loaded planet names
 * @param {string} planetId Planet natural id
 * @returns {string} Plain planet name, or the id while it loads
 */
export function shortPlanetName(
	planetNames: Map<string, string>,
	planetId: string
): string {
	return (planetNames.get(planetId) ?? planetId).replace(
		` (${planetId})`,
		""
	);
}

/**
 * Combines the material i/o of an empire's plans per material: amounts
 * summed, the plans on each side, and the delta priced at the plans'
 * amount-weighted average price
 * @author jplacht
 *
 * @param {IEmpirePlanMaterialIO[]} data Material i/o per plan
 * @returns {IEmpireMaterialIO[]} Empire material rows, by ticker
 */
export function combineEmpireMaterialIO(
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

			// a plan that uses what it makes sits on both sides, once each
			if (element.input > 0)
				combinedMap[element.ticker].inputPlanets.push(planetPart);
			if (element.output > 0)
				combinedMap[element.ticker].outputPlanets.push(planetPart);
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
		const flatPlanets = [...pre.inputPlanets, ...pre.outputPlanets].filter(
			(p) => p.delta
		);

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
		a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0
	);
}

/**
 * Empire revenue, cost and profit per day from its material rows plus the
 * cost that isn't materials (degradation, fees)
 * @author jplacht
 *
 * @param {IEmpireMaterialIO[]} data Empire material rows
 * @param {number} totalAreaUsed Area of all plans
 * @param {number} nonMaterialCost Daily cost besides materials
 * @returns {IEmpireCostOverview} Overview
 */
export function calculateEmpireCostOverview(
	data: IEmpireMaterialIO[],
	totalAreaUsed: number,
	nonMaterialCost: number
): IEmpireCostOverview {
	const { totalRevenue, materialCost } = data.reduce(
		(totals, { deltaPrice }) => {
			if (deltaPrice > 0) totals.totalRevenue += deltaPrice;
			if (deltaPrice < 0) totals.materialCost -= deltaPrice;
			return totals;
		},
		{ totalRevenue: 0, materialCost: 0 }
	);
	const totalCost = materialCost + nonMaterialCost;

	return {
		totalRevenue,
		totalCost,
		totalProfit: totalRevenue - totalCost,
		totalAreaUsed,
	};
}

/**
 * The Empire page's totals from its plans' results: revenue and material
 * cost from the combined rows, plus every plan's cost that isn't a bought
 * material (workforce, degradation, fees)
 * @author jplacht
 *
 * @param {IEmpireMaterialIO[]} combined Combined empire material rows
 * @param {IPlanResult[]} results Plan results
 * @returns {IEmpireCostOverview} Overview
 */
export function empireCostOverview(
	combined: IEmpireMaterialIO[],
	results: IPlanResult[]
): IEmpireCostOverview {
	return calculateEmpireCostOverview(
		combined,
		results.reduce((sum, r) => sum + r.area.areaUsed, 0),
		results.reduce(
			(sum, r) =>
				sum +
				r.cost -
				r.materialio.reduce(
					(materialCost, m) =>
						materialCost + (m.delta < 0 ? -m.price : 0),
					0
				),
			0
		)
	);
}

/**
 * The empire state the Empire page stores for the API exports and the
 * global material insights: per material the empire's production,
 * consumption and delta per day, and the same per plan
 * @author jplacht
 *
 * @param {PlanEmpireElement | undefined} empire Empire (none: undefined)
 * @param {IEmpireMaterialIO[]} data Combined empire material i/o
 * @returns {EmpireMaterialIOState | undefined} State to store
 */
export function empireStateOf(
	empire: PlanEmpireElement | undefined,
	data: IEmpireMaterialIO[]
): EmpireMaterialIOState | undefined {
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
		const allPlanEntries = [...item.inputPlanets, ...item.outputPlanets];
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
