import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string): string =>
	readFileSync(new URL(path, import.meta.url), "utf-8");

/** all matches of the first group, sorted */
const names = (source: string, pattern: RegExp): string[] =>
	[...source.matchAll(pattern)].map((match) => match[1]).sort();

describe("tracking plan", () => {
	const types = names(
		read("../../../lib/analytics/useAnalytics.types.ts"),
		/^\t"([a-z]+:[a-z_]+)":/gm
	);
	const documented = names(
		read("../../../../docs/analytics.md"),
		/^\| `([a-z]+:[a-z_]+)` \|/gm
	);

	it("finds the events", () => {
		expect(types.length).toBeGreaterThan(50);
	});

	it("docs/analytics.md lists exactly the typed events", () => {
		expect(documented).toEqual(types);
	});

	it("names are lowercase category:snake_case", () => {
		types.forEach((name) =>
			expect(name).toMatch(/^[a-z]+:[a-z]+(_[a-z]+)*$/)
		);
	});
});
