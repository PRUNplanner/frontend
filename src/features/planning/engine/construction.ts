// Prices
import { getMaterialIOTotalPrice, IPriceBook } from "@/features/cx/priceBook";

// Engine
import {
	getBuilding,
	getBuildingConstructionMaterials,
} from "@/features/planning/engine/buildings";
import { infrastructureBuildingNames } from "@/features/planning/calculations/infrastructureCalculations";

// Types & Interfaces
import { IBuilding, IPlanet } from "@/features/api/gameData.types";
import { IInfrastructureCosts } from "@/features/cx/usePrice.types";
import {
	IBuildingConstruction,
	INFRASTRUCTURE_TYPE,
	IProductionBuilding,
} from "@/features/planning/usePlanCalculation.types";

/**
 * All buildings to construct: production buildings, the Core Module (CM)
 * and every infrastructure building the plan uses
 *
 * @param {Required<Record<INFRASTRUCTURE_TYPE, number>>} infrastructure Plan infrastructure
 * @param {IProductionBuilding[]} production Production buildings
 * @param {IPlanet} planet Planet
 * @param {ReadonlyMap<string, IBuilding>} buildings Building data
 * @returns {IBuildingConstruction[]} Buildings with materials and amount
 */
export function calculateConstructionMaterials(
	infrastructure: Required<Record<INFRASTRUCTURE_TYPE, number>>,
	production: IProductionBuilding[],
	planet: IPlanet,
	buildings: ReadonlyMap<string, IBuilding>
): IBuildingConstruction[] {
	const inf: IBuildingConstruction[] = [];

	for (const ticker of ["CM", ...infrastructureBuildingNames]) {
		const amount: number | undefined =
			infrastructure[ticker as INFRASTRUCTURE_TYPE];

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

	return [
		...production.map((b) => ({
			ticker: b.name,
			materials: b.constructionMaterials,
			amount: b.amount,
		})),
		...inf,
	];
}

/**
 * Total price of all construction materials, bought
 *
 * @param {IBuildingConstruction[]} constructionMaterials Buildings to construct
 * @param {IPriceBook} prices Price Book
 * @returns {number} Total construction cost
 */
export function calculateTotalConstructionCost(
	constructionMaterials: IBuildingConstruction[],
	prices: IPriceBook
): number {
	return constructionMaterials
		.map(
			(current) =>
				current.amount *
				current.materials
					.map(
						(material) =>
							prices.getPrice(material.ticker, "BUY") *
							material.input
					)
					.reduce((a, b) => a + b, 0)
		)
		.reduce((a, b) => a + b, 0);
}

/**
 * Calculates all infrastructure buildings construction costs
 * @author jplacht
 *
 * @param {IPriceBook} prices Price Book
 * @param {IPlanet} planet Planet Information
 * @param {ReadonlyMap<string, IBuilding>} buildings Building data
 * @returns {IInfrastructureCosts} Infrastructure Construction Costs
 */
export function calculateInfrastructureCosts(
	prices: IPriceBook,
	planet: IPlanet,
	buildings: ReadonlyMap<string, IBuilding>
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
