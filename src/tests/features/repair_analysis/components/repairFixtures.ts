import {
	calculateRepairCurve,
	findOptimalRepairDay,
	goodRange,
	repairCostSplit,
} from "@/features/repair_analysis/repairAnalysis.util";

// Types & Interfaces
import type {
	IRepairBuilding,
	IRepairMaterialList,
} from "@/features/repair_analysis/useRepairAnalysis.types";

/**
 * A building type as useRepairAnalysis returns it: 2 FRM, production 500 (or
 * `production`), workforce 100, construction 4 BBH (100) + 4 BSE (50)
 */
export function repairBuilding(
	overrides: Partial<IRepairBuilding> = {},
	production: number = 500
): IRepairBuilding {
	const constructionMaterials = [
		{ ticker: "BBH", input: 4, output: 0 },
		{ ticker: "BSE", input: 4, output: 0 },
	];
	const curve = calculateRepairCurve(production, 100, constructionMaterials, {
		BBH: 100,
		BSE: 50,
	});
	const best = Math.max(1, findOptimalRepairDay(curve).day);
	return {
		ticker: "FRM",
		name: "Farm",
		amount: 2,
		constructionMaterials,
		productionValue: production,
		workforceCost: 100,
		curve,
		split: repairCostSplit(curve, production),
		best,
		range: goodRange(curve, best),
		...overrides,
	};
}

/** n materials, most expensive first */
export function materialList(n: number): IRepairMaterialList {
	const materials = Array.from({ length: n }, (_, i) => ({
		ticker: `M${i}`,
		amount: n - i,
		cost: (n - i) * 100,
		weight: 1,
		volume: 2,
	}));
	return {
		materials,
		cost: materials.reduce((s, m) => s + m.cost, 0),
		weight: n,
		volume: 2 * n,
	};
}
