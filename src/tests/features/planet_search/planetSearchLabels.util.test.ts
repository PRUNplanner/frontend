import { describe, it, expect } from "vitest";

import {
	chipLabel,
	hintLabel,
	sortLabel,
} from "@/features/planet_search/planetSearchLabels.util";
import {
	activeChips,
	defaultFilter,
} from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type {
	PlanetSearchFilter,
	PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";

import en from "@/locales/en_US/planet_search.json";
import game from "@/locales/en_US/game.json";

// a tiny vue-i18n stand-in over the real en_US strings
const messages: Record<string, unknown> = { planet_search: en, game };
function t(key: string, params: Record<string, unknown> = {}): string {
	const value = key
		.split(".")
		.reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
	if (typeof value !== "string") throw new Error(`missing ${key}`);
	return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p]));
}
const refName = (r: PlanetSearchReference) =>
	r.kind === "cx" ? r.code : `Plan ${r.planUuid}`;

const labels = (f: PlanetSearchFilter) =>
	activeChips(f).map((c) => chipLabel(c, f.minDaily, t, refName));

describe("planet search labels", () => {
	it("chips carry the actual values", () => {
		expect(
			labels({
				...defaultFilter(),
				text: "mon",
				materialGroups: [
					{ op: "any", materials: ["FEO", "MAG"] },
					{ op: "all", materials: ["H2O"] },
				],
				minDaily: { FEO: 15 },
				cogc: ["WORKFORCE_PIONEERS", "ADVERTISING_METALLURGY"],
				infrastructure: ["LM"],
				fertile: true,
				surface: ["rocky", "gaseous"],
				acceptedExtras: ["MGC", "BL"],
				references: [
					{ kind: "plan", planUuid: "a" },
					{ kind: "cx", code: "NC1" },
				],
				maxJumps: 4,
			})
		).toEqual([
			'Name: "mon"',
			"(FEO ≥15/d or MAG)",
			"H2O",
			"COGC: Pioneers or Metallurgy",
			"LM",
			"Fertile",
			"Surface: Rocky + Gaseous",
			"Accept MGC, BL",
			"≤ 4 jumps from Plan a and NC1",
		]);

		expect(
			labels({
				...defaultFilter(),
				materialGroups: [
					{ op: "all", materials: ["FEO", "H2O"] },
					{ op: "all", materials: ["MAG", "O"] },
				],
				groupsOp: "any",
			})
		).toEqual(["(FEO and H2O) OR (MAG and O)"]);
	});

	it("hints", () => {
		const f = { ...defaultFilter(), fertile: true };
		const [chip] = activeChips(f);
		const base = { filter: f, count: 12 };
		expect(
			hintLabel({ kind: "chip", chip, ...base }, {}, t, refName)
		).toBe('Remove "Fertile" → 12 planets');
		expect(hintLabel({ kind: "gaseous", ...base }, {}, t, refName)).toBe(
			"Include gaseous planets → 12 planets"
		);
		expect(hintLabel({ kind: "extras", ...base }, {}, t, refName)).toBe(
			"Accept all extra building materials → 12 planets"
		);
		expect(
			hintLabel({ kind: "jumps", maxJumps: 7, ...base }, {}, t, refName)
		).toBe("Max jumps 7 → 12 planets");
	});

	it("sort keys", () => {
		expect(sortLabel("name", t, refName)).toBe("Planet");
		expect(sortLabel("fert", t, refName)).toBe("Fertility");
		expect(sortLabel("mat:FEO", t, refName)).toBe("FEO");
		expect(sortLabel("ref:cx:NC1", t, refName)).toBe("NC1");
		expect(sortLabel("ref:plan:a", t, refName)).toBe("Plan a");
		expect(sortLabel("ref:bogus", t, refName)).toBe("ref:bogus");
	});
});
