// Types & Interfaces
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";

/** The saved fields of a CX */
export type ICXDiffable = Pick<CX, "cx_name" | "cx_data">;

// shown for a preference that isn't set on one side
const NONE = "—";

/**
 * Preferences as "scope:key" → value, the empire's scope is empty
 */
function flatten<T>(
	empire: T[],
	planets: { planet: string; preferences: T[] }[],
	keyOf: (item: T) => string,
	valueOf: (item: T) => string | number
): Map<string, string | number> {
	const map = new Map<string, string | number>();
	empire.forEach((p) => map.set(`:${keyOf(p)}`, valueOf(p)));
	planets.forEach(({ planet, preferences }) =>
		preferences.forEach((p) => map.set(`${planet}:${keyOf(p)}`, valueOf(p)))
	);
	return map;
}

function changes(
	area: string,
	from: Map<string, string | number>,
	to: Map<string, string | number>,
	params: (key: string) => Record<string, string>
): IChangeLine[] {
	const lines: IChangeLine[] = [];
	for (const key of new Set([...from.keys(), ...to.keys()])) {
		const before = from.get(key) ?? NONE;
		const after = to.get(key) ?? NONE;
		if (before === after) continue;

		const planet = key.split(":")[0];
		lines.push({
			area: `${area}:${key}`,
			key: planet ? `${area}_planet` : area,
			params: {
				...params(key),
				...(planet ? { planet } : {}),
				from: before,
				to: after,
			},
		});
	}
	return lines;
}

/**
 * What changed in a CX: its name, the exchange per type (BUY, SELL, BOTH)
 * and the ticker prices, for the empire and per planet
 *
 * @author jplacht
 *
 * @param {ICXDiffable} from Old version
 * @param {ICXDiffable} to New version
 * @returns {IChangeLine[]} Change lines
 */
export function diffCX(from: ICXDiffable, to: ICXDiffable): IChangeLine[] {
	const lines: IChangeLine[] = [];

	if (from.cx_name !== to.cx_name)
		lines.push({
			area: "name",
			key: "name",
			params: { from: from.cx_name, to: to.cx_name },
		});

	const exchanges = (cx: ICXDiffable) =>
		flatten(
			cx.cx_data.cx_empire,
			cx.cx_data.cx_planets,
			(p) => p.type,
			(p) => p.exchange
		);
	lines.push(
		...changes("exchange", exchanges(from), exchanges(to), (key) => ({
			type: key.split(":")[1],
		}))
	);

	const tickers = (cx: ICXDiffable) =>
		flatten(
			cx.cx_data.ticker_empire,
			cx.cx_data.ticker_planets,
			(p) => `${p.ticker}:${p.type}`,
			(p) => p.value
		);
	lines.push(
		...changes("ticker", tickers(from), tickers(to), (key) => ({
			ticker: key.split(":")[1],
			type: key.split(":")[2],
		}))
	);

	return lines;
}
