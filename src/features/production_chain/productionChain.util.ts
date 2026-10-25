// Util
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type {
	Material,
	Recipe,
} from "@/features/api/schemas/gameData.schemas";
import type { IChainResult } from "@/features/production_chain/engine/chainSolver.types";
import type {
	ExpertType,
	PlanCOGCProgram,
} from "@/features/api/schemas/planningData.schemas";

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

/** what one base buys */
export interface IChainBuyGroup {
	base: string;
	items: IChainBuyItem[];
	weight: number;
	volume: number;
	cost: number;
}

export interface IChainBuyList {
	groups: IChainBuyGroup[];
	weight: number;
	volume: number;
	cost: number;
	targetsWeight: number;
	targetsVolume: number;
}

const sumOf = <T extends Record<K, number>, K extends string>(
	list: T[],
	k: K
) => list.reduce((s, i) => s + i[k], 0);

/**
 * What to buy for a number of days, grouped by the base that uses it:
 * whole units of every bought row (a material used in two bases in
 * both, with each base's share), weight, volume and cost; and the
 * targets' weight and volume going out
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
	// what each base's steps take of a bought material
	const uses = new Map<string, Map<string, number>>();
	for (const l of result.links) {
		const base = result.rows[l.consumer]?.base;
		if (result.rows[l.input]?.source !== "buy" || !base) continue;
		const byBase = uses.get(l.input) ?? new Map<string, number>();
		byBase.set(base, (byBase.get(base) ?? 0) + l.perDay);
		uses.set(l.input, byBase);
	}

	const groups: IChainBuyGroup[] = [];
	for (const b of result.bases) {
		const items: IChainBuyItem[] = [];
		for (const t of result.order) {
			const row = result.rows[t];
			const byBase = uses.get(t);
			if (row.source !== "buy" || row.perDay <= 1e-9 || !byBase) continue;
			const total = [...byBase.values()].reduce((s, q) => s + q, 0);
			const share = total > 0 ? (byBase.get(b.id) ?? 0) / total : 0;
			if (share <= 1e-9) continue;
			const units = Math.ceil(row.perDay * share * days - 1e-9);
			const m = materials.get(t);
			items.push({
				ticker: t,
				units,
				weight: units * (m?.weight ?? 0),
				volume: units * (m?.volume ?? 0),
				cost: units * row.price,
			});
		}
		if (items.length)
			groups.push({
				base: b.id,
				items,
				weight: sumOf(items, "weight"),
				volume: sumOf(items, "volume"),
				cost: sumOf(items, "cost"),
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

	return {
		groups,
		weight: sumOf(groups, "weight"),
		volume: sumOf(groups, "volume"),
		cost: sumOf(groups, "cost"),
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

const WORKFORCE_PROGRAMS: PlanCOGCProgram[] = [
	"PIONEERS",
	"SETTLERS",
	"TECHNICIANS",
	"ENGINEERS",
	"SCIENTISTS",
];

/** the game.cogc_program key of a plan's program */
export function cogcKey(program: PlanCOGCProgram): string {
	if (program === "---") return "game.cogc_program.NONE";
	const kind = WORKFORCE_PROGRAMS.includes(program)
		? "WORKFORCE"
		: "ADVERTISING";
	return `game.cogc_program.${kind}_${program}`;
}

/** what a program adds to the buildings it helps, in % */
export function cogcBonus(program: PlanCOGCProgram): number {
	return WORKFORCE_PROGRAMS.includes(program) ? 10 : 25;
}

/** the game.expertise key of an expert type */
export function expertKey(type: ExpertType): string {
	return `game.expertise.${type.toUpperCase()}`;
}

/** "5 Food Industries + 1 Agriculture", most first; "" without experts */
export function expertsText(
	experts: Partial<Record<ExpertType, number>>,
	name: (type: ExpertType) => string
): string {
	return (Object.entries(experts) as [ExpertType, number][])
		.filter(([, n]) => n > 0)
		.sort((a, b) => b[1] - a[1])
		.map(([type, n]) => `${n} ${name(type)}`)
		.join(" + ");
}
