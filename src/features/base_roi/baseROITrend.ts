// Util
import { recipeLabel } from "@/features/base_roi/baseROIDetail.util";

// Types & Interfaces
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

/** what the lines of the trend chart are */
export type BaseROITrendLevel = "industry" | "building" | "product" | "recipe";

export interface IBaseROITrendLine {
	/** group key: an expertise, a building, an output ticker list or a recipe */
	key: string;
	/** daily profit per day, oldest first, weighted by traded volume */
	values: number[];
	/** traded volume per day behind the line */
	weight: number;
}

export interface IBaseROITrend {
	level: BaseROITrendLevel;
	/** the industry, building or product drilled into; null at the top */
	focus: string | null;
	lines: IBaseROITrendLine[];
	/** groups left out beyond the line limit */
	more: number;
}

/** a row's weight: its outputs' 7-day average traded volume per day */
const weightOf = (row: IBaseROIRow) =>
	row.outputs.reduce((s, o) => s + o.traded, 0);

const tickers = (row: IBaseROIRow) =>
	row.outputs.map((o) => o.ticker).join(", ");

/**
 * Planet rows of one resource or farming recipe count once (their mean),
 * so a hundred planets don't swamp an industry; recipe rows are one each
 */
function mergePlanets(
	rows: IBaseROIRow[],
	profits: Map<string, number[]>
): { row: IBaseROIRow; values: number[]; weight: number }[] {
	const merged = new Map<
		string,
		{ row: IBaseROIRow; sums: number[]; n: number; weight: number }
	>();
	for (const row of rows) {
		const values = profits.get(row.key);
		if (!values) continue;
		const key =
			row.kind === "recipe" ? row.key : `${row.building}|${tickers(row)}`;
		const entry = merged.get(key);
		if (entry) {
			values.forEach((v, d) => (entry.sums[d] += v));
			entry.n++;
		} else
			merged.set(key, {
				row,
				sums: [...values],
				n: 1,
				weight: weightOf(row),
			});
	}
	return [...merged.values()].map((e) => ({
		row: e.row,
		values: e.sums.map((s) => s / e.n),
		weight: e.weight,
	}));
}

/**
 * The level the search drills into: an exact building, product or
 * industry first; else, when every searched row shares a building or an
 * industry, that one; else the industries.
 */
function drill(
	rows: IBaseROIRow[],
	query: string
): {
	level: BaseROITrendLevel;
	focus: string | null;
	rows: IBaseROIRow[];
	group: (r: IBaseROIRow) => string;
} {
	const q = query.trim().toLowerCase();
	const byBuilding = (b: string) => ({
		level: "product" as const,
		focus: b,
		rows: rows.filter((r) => r.building === b),
		group: tickers,
	});
	const byIndustry = (e: string) => ({
		level: "building" as const,
		focus: e,
		rows: rows.filter((r) => r.expertise === e),
		group: (r: IBaseROIRow) => r.building,
	});

	if (q) {
		const building = rows.find((r) => r.building.toLowerCase() === q);
		if (building) return byBuilding(building.building);
		const product = rows
			.flatMap((r) => r.outputs)
			.find((o) => o.ticker.toLowerCase() === q);
		if (product)
			return {
				level: "recipe",
				focus: product.ticker,
				rows: rows.filter((r) =>
					r.outputs.some((o) => o.ticker === product.ticker)
				),
				group: (r) =>
					r.kind === "recipe"
						? `${r.building}: ${recipeLabel(r)}`
						: `${r.building}: ${tickers(r)}`,
			};
		const expertise = rows.find((r) => {
			const e = r.expertise?.toLowerCase();
			return !!e && (e === q || e.replaceAll("_", " ") === q);
		});
		if (expertise) return byIndustry(expertise.expertise!);
		// a partial search that still names one building or industry
		if (rows.length && rows.every((r) => r.building === rows[0].building))
			return byBuilding(rows[0].building);
		if (
			rows.length &&
			rows[0].expertise &&
			rows.every((r) => r.expertise === rows[0].expertise)
		)
			return byIndustry(rows[0].expertise);
	}
	return {
		level: "industry",
		focus: null,
		rows,
		group: (r) => r.expertise ?? "",
	};
}

/**
 * The trend chart: volume-weighted daily profit over the window, one line
 * per industry, or per building, product or recipe as the search drills
 * in. Each base weighs by its product's traded volume; groups without any
 * traded volume are left out; the `max` heaviest groups get a line.
 *
 * @param {IBaseROIRow[]} rows Shown rows, already searched
 * @param {Map<string, number[]>} profits Daily profit per row key
 * @param {string} query The search text
 * @param {number} [max] Lines at most
 * @returns {IBaseROITrend} Level, focus and lines, heaviest first
 */
export function profitTrend(
	rows: IBaseROIRow[],
	profits: Map<string, number[]>,
	query: string,
	max: number = 7
): IBaseROITrend {
	const { level, focus, rows: picked, group } = drill(rows, query);
	const groups = new Map<string, { sums: number[]; weight: number }>();
	for (const e of mergePlanets(picked, profits)) {
		if (e.weight <= 0) continue;
		const key = group(e.row);
		const g = groups.get(key) ?? {
			sums: Array(e.values.length).fill(0),
			weight: 0,
		};
		e.values.forEach((v, d) => (g.sums[d] += v * e.weight));
		g.weight += e.weight;
		groups.set(key, g);
	}
	const lines = [...groups.entries()]
		.map(([key, g]) => ({
			key,
			values: g.sums.map((s) => s / g.weight),
			weight: g.weight,
		}))
		.sort((a, b) => b.weight - a.weight);
	return {
		level,
		focus,
		lines: lines.slice(0, max),
		more: Math.max(0, lines.length - max),
	};
}
