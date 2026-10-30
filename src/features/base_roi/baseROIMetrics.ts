// Engine
import { calculateExpertBonus } from "@/features/planning/engine/efficiency";

// Static
import hqLevels from "@/features/hq_upgrade_calculator/hq_levels.json";
import {
	EXPERT_STAGE_DAYS,
	SHIP_COST_FALLBACK,
	SHIP_PRICE,
	SHIPS,
	VOLATILITY_MAX_COMBINATIONS,
	VOLATILITY_THRESHOLD,
} from "@/features/base_roi/baseROI.constants";

// Types & Interfaces
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type {
	IBaseROICandidate,
	IBaseROIHidden,
	IBaseROIMaterial,
	IBaseROIMetrics,
	IBaseROIRow,
	IBaseROIRowInput,
	IBaseROIScenario,
	IBaseROIScenarioPrice,
	IBaseROIStage,
} from "@/features/base_roi/baseROI.types";

/**
 * # Base ROI metrics
 *
 * Pure functions over one base's daily money and cargo (from the plan
 * engine) and the settings' add-ons: building cost with buffer stock, HQ
 * and ships, break-even with the expert ramp, weekly return, logistics,
 * market capacity and volatility scenarios.
 */

type MetricsSettings = Pick<
	BaseROISettings,
	| "experts"
	| "bufferDays"
	| "targetPermit"
	| "roundTripHours"
	| "logistics"
	| "ship"
	| "visitDays"
	| "manualWeight"
	| "manualVolume"
>;

/**
 * Materials of one HQ upgrade step for a target permit: HQ level N − 1,
 * from 3 permits on (2 permits come with the base)
 *
 * @param {number} targetPermit Target permit, 0 = off
 * @param {(ticker: string) => number} getPrice Buy price
 * @returns {number} Cost of the step
 */
export function hqStepCost(
	targetPermit: number,
	getPrice: (ticker: string) => number
): number {
	if (targetPermit < 3) return 0;
	const materials =
		(hqLevels as Record<string, { ticker: string; amount: number }[]>)[
			String(targetPermit - 1)
		] ?? [];
	return materials.reduce((s, m) => s + m.amount * getPrice(m.ticker), 0);
}

/** buffer days × (inputs + consumables + revenue) ÷ 2 */
export function bufferStock(
	days: number,
	inputs: number,
	consumables: number,
	revenue: number
): number {
	return (days * (inputs + consumables + revenue)) / 2;
}

/**
 * Ships a base keeps busy: the larger of weight and volume per day over
 * the ship's capacity, times the round trip in days
 */
export function shipsNeeded(
	weight: number,
	volume: number,
	ship: { weight: number; volume: number },
	roundTripHours: number
): number {
	return (
		Math.max(weight / ship.weight, volume / ship.volume) *
		(roundTripHours / 24)
	);
}

/**
 * Break-even with experts arriving over time: the stages with 0–4 experts
 * last EXPERT_STAGE_DAYS ÷ production buildings, revenue and inputs scale
 * with the expert bonus, consumables and degradation stay. After 4 experts
 * the 5-expert profit pays off the rest; no positive profit then = never.
 *
 * @param {number} buildingCost Building cost
 * @param {number} scaling Revenue − inputs per day at 5 experts
 * @param {number} fixed Consumables + degradation per day
 * @param {number} buildings Production buildings
 * @returns {{ breakEven: number; timeline: IBaseROIStage[] }} Days and stages
 */
export function rampBreakEven(
	buildingCost: number,
	scaling: number,
	fixed: number,
	buildings: number
): { breakEven: number; timeline: IBaseROIStage[] } {
	const full = 1 + calculateExpertBonus(5);
	const timeline: IBaseROIStage[] = [];
	let remaining = buildingCost;
	let elapsed = 0;

	for (let experts = 0; experts <= 5; experts++) {
		const dailyProfit =
			(scaling * (1 + calculateExpertBonus(experts))) / full - fixed;
		const days =
			experts < 5
				? EXPERT_STAGE_DAYS[experts] / Math.max(buildings, 1)
				: Infinity;
		const stage: IBaseROIStage = {
			experts,
			dailyProfit,
			remaining,
			days,
			paidAfter: null,
		};
		timeline.push(stage);

		if (dailyProfit > 0 && remaining <= dailyProfit * days) {
			stage.paidAfter = remaining / dailyProfit;
			return { breakEven: elapsed + stage.paidAfter, timeline };
		}
		if (experts === 5) break;
		remaining -= dailyProfit * days;
		elapsed += days;
	}

	return { breakEven: Infinity, timeline };
}

/** cost ÷ profit, Infinity when it never pays off */
function payback(cost: number, profit: number): number {
	return profit > 0 ? cost / profit : Infinity;
}

/**
 * Volatility scenarios: every material priced from a 7D or 30D VWAP whose
 * bid or ask is more than 30% off that price. All combinations when there
 * are at most 100, else "all taker" (buy at ask, sell at bid) and "all
 * maker" (buy at bid, sell at ask).
 *
 * @param {IBaseROIMaterial[]} materials Bought and sold materials
 * @param {number} dailyProfit Profit with the table's prices
 * @returns {IBaseROIScenario[]} Scenarios, lowest profit first
 */
export function volatilityScenarios(
	materials: IBaseROIMaterial[],
	dailyProfit: number
): IBaseROIScenario[] {
	const options: {
		material: IBaseROIMaterial;
		alt: IBaseROIScenarioPrice[];
	}[] = [];

	for (const m of materials) {
		const { key, exchange } = m.source;
		if (key !== "vwap_7d" && key !== "vwap_30d") continue;
		if (exchange === null || m.price <= 0) continue;
		const alt: IBaseROIScenarioPrice[] = [];
		for (const side of ["bid", "ask"] as const) {
			const price = m[side];
			if (
				price > 0 &&
				Math.abs(price - m.price) / m.price > VOLATILITY_THRESHOLD
			)
				alt.push({ ticker: m.ticker, side, price });
		}
		if (alt.length) options.push({ material: m, alt });
	}
	if (!options.length) return [];

	const profitWith = (prices: IBaseROIScenarioPrice[]): number =>
		prices.reduce((p, s) => {
			const m = options.find(
				(o) => o.material.ticker === s.ticker
			)!.material;
			return p + m.amount * (s.price - m.price);
		}, dailyProfit);

	const combinations = options.reduce((n, o) => n * (o.alt.length + 1), 1);
	let sets: IBaseROIScenarioPrice[][];

	if (combinations - 1 <= VOLATILITY_MAX_COMBINATIONS) {
		// every material: unchanged or one of its alternatives
		sets = options.reduce<IBaseROIScenarioPrice[][]>(
			(acc, o) =>
				acc.flatMap((set) => [set, ...o.alt.map((a) => [...set, a])]),
			[[]]
		);
		sets = sets.filter((s) => s.length > 0);
	} else {
		const pick = (taker: boolean) =>
			options.flatMap((o) => {
				// taker buys at ask and sells at bid
				const want = o.material.amount < 0 === taker ? "ask" : "bid";
				return o.alt.filter((a) => a.side === want);
			});
		sets = [pick(true), pick(false)].filter((s) => s.length > 0);
	}

	return sets
		.map((prices) => ({ prices, dailyProfit: profitWith(prices) }))
		.sort((a, b) => a.dailyProfit - b.dailyProfit);
}

/**
 * Every metric of one row for the settings
 *
 * @param {IBaseROIRowInput} row Engine numbers of the row
 * @param {MetricsSettings} settings Settings
 * @param {number} hqCost Cost of the HQ step, see hqStepCost
 * @returns {IBaseROIMetrics} Metrics
 */
export function calculateMetrics(
	row: IBaseROIRowInput,
	settings: MetricsSettings,
	hqCost: number
): IBaseROIMetrics {
	const runningCost = row.inputs + row.consumables + row.degradation;
	const dailyProfit = row.revenue - runningCost;

	const weight = Math.max(row.weightIn, row.weightOut);
	const volume = Math.max(row.volumeIn, row.volumeOut);
	const cargo = Math.max(weight, volume);

	const buffer = bufferStock(
		settings.bufferDays,
		row.inputs,
		row.consumables,
		row.revenue
	);
	const ship =
		SHIPS[
			settings.logistics === "ship" ? settings.ship : SHIP_COST_FALLBACK
		];
	const ships =
		settings.roundTripHours > 0
			? shipsNeeded(weight, volume, ship, settings.roundTripHours)
			: 0;
	const shipCost = ships * SHIP_PRICE;
	const buildingCost = row.construction + buffer + hqCost + shipCost;

	let breakEven: number;
	let timeline: IBaseROIStage[] = [];
	const fixedPayback = payback(buildingCost, dailyProfit);
	if (settings.experts === "ramp") {
		({ breakEven, timeline } = rampBreakEven(
			buildingCost,
			row.revenue - row.inputs,
			row.consumables + row.degradation,
			row.productionBuildings
		));
	} else breakEven = fixedPayback;

	let fitsLogistics = true;
	if (settings.logistics === "ship")
		fitsLogistics =
			weight * settings.visitDays <= ship.weight &&
			volume * settings.visitDays <= ship.volume;
	else if (settings.logistics === "manual")
		fitsLogistics =
			weight <= settings.manualWeight && volume <= settings.manualVolume;

	const marketCapacity = row.outputs.length
		? Math.min(
				...row.outputs.map((o) =>
					o.amount > 0 ? o.traded / o.amount : Infinity
				)
			)
		: 0;

	return {
		dailyProfit,
		runningCost,
		buildingCost,
		bufferStock: buffer,
		hqCost,
		shipCost,
		shipsNeeded: ships,
		breakEven,
		payback: fixedPayback,
		timeline,
		weeklyReturn: buildingCost > 0 ? (7 * dailyProfit) / buildingCost : 0,
		cargo,
		fitsLogistics,
		marketCapacity,
		scenarios: volatilityScenarios(row.materials, dailyProfit),
	};
}

type RowFilter = Pick<
	BaseROISettings,
	| "showResources"
	| "showRecipes"
	| "showNegative"
	| "expertise"
	| "building"
	| "minMarketCapacity"
>;

/** the row kind and building filters, not counted as hidden */
export function matchesFilters(
	row: Pick<IBaseROICandidate, "kind" | "building" | "expertise">,
	filter: RowFilter
): boolean {
	if (row.kind === "recipe" ? !filter.showRecipes : !filter.showResources)
		return false;
	if (filter.expertise && row.expertise !== filter.expertise) return false;
	if (filter.building && row.building !== filter.building) return false;
	return true;
}

/**
 * The rows the table shows and how many each limit hides, every row
 * counted once at its first limit: max jumps, logistics, market capacity,
 * then negative profit while "Show negative" is off
 *
 * @param {IBaseROIRow[]} rows Calculated rows
 * @param {Pick<IBaseROICandidate, "kind" | "building" | "expertise">[]} beyondJumps Planet rows beyond max jumps, never calculated
 * @param {RowFilter} filter Settings
 * @returns {{ rows: IBaseROIRow[]; hidden: IBaseROIHidden }} Shown rows, sorted by break-even, and hidden counts
 */
export function filterRows(
	rows: IBaseROIRow[],
	beyondJumps: Pick<IBaseROICandidate, "kind" | "building" | "expertise">[],
	filter: RowFilter
): { rows: IBaseROIRow[]; hidden: IBaseROIHidden } {
	const hidden: IBaseROIHidden = {
		maxJumps: beyondJumps.filter((c) => matchesFilters(c, filter)).length,
		logistics: 0,
		marketCapacity: 0,
		negative: 0,
	};
	const shown: IBaseROIRow[] = [];

	for (const row of rows) {
		if (!matchesFilters(row, filter)) continue;
		if (!row.metrics.fitsLogistics) hidden.logistics++;
		else if (row.metrics.marketCapacity < filter.minMarketCapacity)
			hidden.marketCapacity++;
		else if (!filter.showNegative && row.metrics.dailyProfit <= 0)
			hidden.negative++;
		else shown.push(row);
	}

	shown.sort(
		(a, b) =>
			a.metrics.breakEven - b.metrics.breakEven ||
			b.metrics.dailyProfit - a.metrics.dailyProfit
	);
	return { rows: shown, hidden };
}
