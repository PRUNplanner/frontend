// Prices
import {
	getMaterialIOTotalPrice,
	type IPriceBook,
} from "@/features/cx/priceBook";

// Engine
import {
	getBuilding,
	getBuildingConstructionMaterials,
} from "@/features/planning/engine/buildings";
import { infrastructureBuildingNames } from "@/features/planning/calculations/infrastructureCalculations";

// Types & Interfaces
import type { Building, Planet } from "@/features/api/schemas/gameData.schemas";
import type { IInfrastructureCosts } from "@/features/cx/usePrice.types";
import type { InfrastructureType } from "@/features/api/schemas/planningData.schemas";
import type {
	IBuildingConstruction,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";
import type { IPlanTracer } from "@/features/planning/engine/engine.types";

/**
 * All buildings to construct: production buildings, the Core Module (CM)
 * and every infrastructure building the plan uses
 *
 * @param {Required<Record<InfrastructureType, number>>} infrastructure Plan infrastructure
 * @param {IProductionBuilding[]} production Production buildings
 * @param {Planet} planet Planet
 * @param {ReadonlyMap<string, Building>} buildings Building data
 * @param {IPlanTracer} [trace] Tracer
 * @returns {IBuildingConstruction[]} Buildings with materials and amount
 */
export function calculateConstructionMaterials(
	infrastructure: Required<Record<InfrastructureType, number>>,
	production: IProductionBuilding[],
	planet: Planet,
	buildings: ReadonlyMap<string, Building>,
	trace?: IPlanTracer
): IBuildingConstruction[] {
	const inf: IBuildingConstruction[] = [];

	for (const ticker of ["CM", ...infrastructureBuildingNames]) {
		const amount: number | undefined =
			infrastructure[ticker as InfrastructureType];

		if ((amount && amount > 0) || ticker === "CM")
			inf.push({
				ticker,
				materials: getBuildingConstructionMaterials(
					getBuilding(buildings, ticker),
					planet
				),
				amount: ticker === "CM" ? 1 : amount,
			});
	}

	const all: IBuildingConstruction[] = [
		...production.map((b) => ({
			ticker: b.name,
			materials: b.constructionMaterials,
			amount: b.amount,
		})),
		...inf,
	];

	if (trace)
		for (const c of all)
			trace.step({
				phase: "construction",
				label: `${c.ticker} materials`,
				inputs: Object.fromEntries(
					c.materials.map((m) => [m.ticker, m.input])
				),
				value: c.amount,
				unit: "buildings",
				scope: { building: c.ticker },
			});

	return all;
}

/**
 * Total price of all construction materials, bought
 *
 * @param {IBuildingConstruction[]} constructionMaterials Buildings to construct
 * @param {IPriceBook} prices Price Book
 * @param {IPlanTracer} [trace] Tracer
 * @returns {number} Total construction cost
 */
export function calculateTotalConstructionCost(
	constructionMaterials: IBuildingConstruction[],
	prices: IPriceBook,
	trace?: IPlanTracer
): number {
	const total: number = constructionMaterials
		.map((current) => {
			const unitCost: number = current.materials
				.map(
					(material) =>
						prices.getPrice(material.ticker, "BUY") * material.input
				)
				.reduce((a, b) => a + b, 0);
			const cost: number = current.amount * unitCost;
			trace?.step({
				phase: "construction",
				label: `${current.ticker} construction cost`,
				formula: "amount × Σ material × BUY price",
				inputs: { amount: current.amount, unit_cost: unitCost },
				value: cost,
				scope: { building: current.ticker },
			});
			return cost;
		})
		.reduce((a, b) => a + b, 0);

	trace?.step({
		phase: "construction",
		label: "total construction cost",
		formula: "Σ building construction cost",
		value: total,
	});

	return total;
}

/**
 * Calculates all infrastructure buildings construction costs
 * @author jplacht
 *
 * @param {IPriceBook} prices Price Book
 * @param {Planet} planet Planet Information
 * @param {ReadonlyMap<string, Building>} buildings Building data
 * @returns {IInfrastructureCosts} Infrastructure Construction Costs
 */
export function calculateInfrastructureCosts(
	prices: IPriceBook,
	planet: Planet,
	buildings: ReadonlyMap<string, Building>
): IInfrastructureCosts {
	const results: IInfrastructureCosts = {
		HB1: 0,
		HB2: 0,
		HB3: 0,
		HB4: 0,
		HB5: 0,
		HBB: 0,
		HBC: 0,
		HBM: 0,
		HBL: 0,
		STO: 0,
		STA: 0,
		STE: 0,
		STV: 0,
		STW: 0,
	};

	for (const buildingTicker of infrastructureBuildingNames) {
		const totalPrice = getMaterialIOTotalPrice(
			prices,
			getBuildingConstructionMaterials(
				getBuilding(buildings, buildingTicker),
				planet
			),
			"BUY"
		);

		results[buildingTicker] = totalPrice * -1;
	}

	return results;
}
