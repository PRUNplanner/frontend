// Util
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type {
	Material,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { IChainResult } from "@/features/production_chain/engine/chainSolver.types";

/** a quantity: no decimals from 100, one from 10, else two */
export function formatQty(n: number): string {
	const abs = Math.abs(n);
	return formatNumber(n, abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
}

/** money without its sign: 918.5k, 6.20M, 7,796 */
export function formatMoney(n: number): string {
	const abs = Math.abs(n);
	if (abs >= 1e6) return `${formatNumber(n / 1e6, 2)}M`;
	if (abs >= 1e4) return `${formatNumber(n / 1e3, 1)}k`;
	return formatNumber(n, 0);
}

/** a share (0–1) as "45 %", one decimal below 10 % */
export function formatShare(share: number): string {
	if (!Number.isFinite(share)) return "—";
	const pct = share * 100;
	return `${formatNumber(pct, Math.abs(pct) < 10 ? 1 : 0)} %`;
}

/** "1 VEG + 1 MUS → 10 RAT", "nothing → 1 DV" without inputs */
export function recipeLabel(recipe: Recipe, nothing: string): string {
	const side = (list: Recipe["inputs"]) =>
		list.map((m) => `${m.material_amount} ${m.material_ticker}`).join(" + ");
	return `${side(recipe.inputs) || nothing} → ${side(recipe.outputs)}`;
}

export interface IChainBuyItem {
	ticker: string;
	units: number;
	weight: number;
	volume: number;
	cost: number;
}

export interface IChainBuyList {
	items: IChainBuyItem[];
	weight: number;
	volume: number;
	cost: number;
	targetsWeight: number;
	targetsVolume: number;
}

/**
 * What to buy for a number of days: whole units of every bought row, its
 * weight, volume and cost; and the targets' weight and volume going out
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {ReadonlyMap<string, Material>} materials Materials by ticker
 * @param {number} days Days
 * @returns {IChainBuyList} Buy list
 */
export function buyList(
	result: IChainResult,
	materials: ReadonlyMap<string, Material>,
	days: number
): IChainBuyList {
	const items: IChainBuyItem[] = [];
	for (const t of result.order) {
		const row = result.rows[t];
		if (row.source !== "buy" || row.perDay <= 1e-9) continue;
		const units = Math.ceil(row.perDay * days - 1e-9);
		const m = materials.get(t);
		items.push({
			ticker: t,
			units,
			weight: units * (m?.weight ?? 0),
			volume: units * (m?.volume ?? 0),
			cost: units * row.price,
		});
	}

	let targetsWeight = 0;
	let targetsVolume = 0;
	for (const t of result.order) {
		const row = result.rows[t];
		if (!row.target) continue;
		const m = materials.get(t);
		targetsWeight += row.targetPerDay * days * (m?.weight ?? 0);
		targetsVolume += row.targetPerDay * days * (m?.volume ?? 0);
	}

	const sum = (k: "weight" | "volume" | "cost") =>
		items.reduce((s, i) => s + i[k], 0);
	return {
		items,
		weight: sum("weight"),
		volume: sum("volume"),
		cost: sum("cost"),
		targetsWeight,
		targetsVolume,
	};
}

const csvCell = (v: string | number) => {
	const s = String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The steps as CSV, one row per material in chain order
 * @author jplacht
 *
 * @param {IChainResult} result Solved chain
 * @param {string[]} header Column names
 * @param {(source: string) => string} sourceLabel Source name
 * @param {string} nothing Label for a recipe without inputs
 * @returns {string} CSV
 */
export function chainCsv(
	result: IChainResult,
	header: string[],
	sourceLabel: (source: string) => string,
	nothing: string
): string {
	const lines = [header.map(csvCell).join(",")];
	for (let k = result.order.length - 1; k >= 0; k--) {
		const row = result.rows[result.order[k]];
		lines.push(
			[
				row.ticker,
				row.perDay.toFixed(4),
				sourceLabel(row.source),
				row.recipe ? recipeLabel(row.recipe, nothing) : "",
				row.buildingTicker ?? "",
				row.buildings.toFixed(4),
				row.unitCost.toFixed(2),
				row.price.toFixed(2),
			]
				.map(csvCell)
				.join(",")
		);
	}
	return lines.join("\n");
}
