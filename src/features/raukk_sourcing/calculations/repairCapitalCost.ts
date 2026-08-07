// Types & Interfaces
import { RAUKK_REPAIR_DAY } from "@/features/raukk_sourcing/raukkSourcing.types";
import {
	IRaukkMaterialUnits,
	IRaukkRepairBuilding,
	IRaukkRepairCost,
	IRaukkRepairMaterials,
} from "@/features/raukk_sourcing/calculations/raukkCalculations.types";

/**
 * Repair material amount of a single building at a given day.
 *
 * Mirrors `calculateAmountAtDay` of
 * `src/features/repair_analysis/useRepairAnalysis.ts`. That function is
 * defined inside an async composable and therefore not importable as a
 * pure helper; the formula is duplicated verbatim instead of reinvented.
 *
 * See: https://pct.fnar.net/building-degradation/index.html
 *
 * @author raukk
 *
 * @param {number} day Day of repair
 * @param {number} materialAmount Construction material amount
 * @returns {number} Material amount needed to repair at that day
 */
export function calculateRepairAmountAtDay(
	day: number,
	materialAmount: number
): number {
	return (
		materialAmount -
		Math.floor((materialAmount * (180 - Math.min(180, day))) / 180)
	);
}

/**
 * Repair material demand per day, per building and as plan total.
 *
 * A repair at day D consumes `calculateRepairAmountAtDay(D, amount)` of
 * each construction material per building instance. Spread over the
 * repair cycle that is `amountAtDay / D` units per day.
 *
 * @author raukk
 *
 * @param {IRaukkRepairBuilding[]} buildings Plan production buildings
 * @param {RAUKK_REPAIR_DAY} repairDay Repair cycle length in days
 * @returns {IRaukkRepairMaterials} Repair units per day
 */
export function calculateRepairMaterialsPerDay(
	buildings: IRaukkRepairBuilding[],
	repairDay: RAUKK_REPAIR_DAY
): IRaukkRepairMaterials {
	const perBuilding: Record<string, IRaukkMaterialUnits> = {};
	const total: IRaukkMaterialUnits = {};

	buildings.forEach((building) => {
		const buildingUnits: IRaukkMaterialUnits =
			perBuilding[building.name] ?? {};

		building.constructionMaterials.forEach((material) => {
			const unitsPerDay: number =
				(calculateRepairAmountAtDay(repairDay, material.input) *
					building.amount) /
				repairDay;

			buildingUnits[material.ticker] =
				(buildingUnits[material.ticker] ?? 0) + unitsPerDay;
			total[material.ticker] =
				(total[material.ticker] ?? 0) + unitsPerDay;
		});

		perBuilding[building.name] = buildingUnits;
	});

	return { perBuilding, total };
}

/**
 * Repair capital cost per day, per building and as plan total.
 *
 * This replaces the vanilla `constructionCost / 180` degradation for the
 * sourcing feature only; upstream profit numbers are untouched.
 *
 * @author raukk
 *
 * @param {IRaukkRepairBuilding[]} buildings Plan production buildings
 * @param {RAUKK_REPAIR_DAY} repairDay Repair cycle length in days
 * @param {(ticker: string) => number} getPrice Unit price per ticker
 * @returns {IRaukkRepairCost} Repair cost per day
 */
export function calculateRepairCostPerDay(
	buildings: IRaukkRepairBuilding[],
	repairDay: RAUKK_REPAIR_DAY,
	getPrice: (ticker: string) => number
): IRaukkRepairCost {
	const materials: IRaukkRepairMaterials = calculateRepairMaterialsPerDay(
		buildings,
		repairDay
	);

	const priceCache: Map<string, number> = new Map();

	function cachedPrice(ticker: string): number {
		const cached: number | undefined = priceCache.get(ticker);
		if (cached !== undefined) return cached;

		const price: number = getPrice(ticker);
		priceCache.set(ticker, price);
		return price;
	}

	const perBuilding: Record<string, number> = {};
	let total: number = 0;

	Object.entries(materials.perBuilding).forEach(([name, units]) => {
		const cost: number = Object.entries(units).reduce(
			(sum, [ticker, unitsPerDay]) =>
				sum + unitsPerDay * cachedPrice(ticker),
			0
		);

		perBuilding[name] = cost;
		total += cost;
	});

	return {
		perBuilding,
		total,
		materialUnitsPerDay: materials.total,
	};
}
