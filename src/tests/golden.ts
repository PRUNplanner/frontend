/**
 * Golden (characterization) snapshots: freeze calculated numbers so a
 * refactor can prove it reproduces them. Same rounding as
 * usePlanCalculation.characterization.test.ts.
 */

// round finite numbers to 10 significant digits, NaN/Infinity as strings
function normalize(value: unknown): unknown {
	if (typeof value === "number")
		return Number.isFinite(value)
			? Number(value.toPrecision(10))
			: String(value);
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, normalize(v)])
		);
	return value;
}

/** normalized JSON for toMatchFileSnapshot */
export const golden = (value: unknown): string =>
	JSON.stringify(normalize(value), null, 1);
