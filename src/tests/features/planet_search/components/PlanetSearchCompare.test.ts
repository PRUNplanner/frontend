import { describe, it, expect } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import PlanetSearchCompare from "@/features/planet_search/components/PlanetSearchCompare.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";
import { deepClone } from "@/util/data";
import planet_search from "@/locales/en_US/planet_search.json";
import game from "@/locales/en_US/game.json";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type {
	PlanetSearchFilter,
	PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";
import type { IPlanetSearchContext } from "@/features/planet_search/planetSearch.types";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

const index = fixture as PlanetSearchIndexEntry[];
function planet(
	id: string,
	overrides: Partial<PlanetSearchIndexEntry> = {}
): PlanetSearchIndexEntry {
	return {
		...deepClone(index.find((p) => p.planet_natural_id === id)!),
		...overrides,
	};
}

// gaseous, high gravity, low temperature, HE 12.2223, LM/COGC/WAR/ADM,
// Electronics program until 1791734592042
const tarvos = planet("UV-351e");
// rocky, high temperature, FEO 40.3653 / HE 1.3389 / AMM 4.8366, nothing built
const gc = planet("GC-231a", { fertility: 0.33 });
// rocky, high pressure, low temperature, HAL/SIO/LIO, LM/COGC/WAR/ADM,
// Metallurgy program until 1791223097142
const pg = planet("PG-027b", { fertility: -0.33 });

// both programs are running
const NOW = 1791200000000;

// AI1 knows two systems, NC1 is 3 / 5 jumps from those, the rest unknown
function ctx(now = NOW): IPlanetSearchContext {
	return {
		now,
		refJumps: (ref: PlanetSearchReference) => {
			if (ref.kind !== "cx") return undefined;
			if (ref.code === "AI1")
				return new Map([
					[tarvos.system_id, 1],
					[gc.system_id, 2],
				]);
			if (ref.code === "NC1")
				return new Map([
					[tarvos.system_id, 3],
					[gc.system_id, 5],
				]);
			return undefined;
		},
	};
}

function filter(): PlanetSearchFilter {
	return {
		...defaultFilter(),
		// HE twice: one row per material
		materialGroups: [
			{ op: "any", materials: ["HE"] },
			{ op: "any", materials: ["HE"] },
		],
		references: [{ kind: "cx", code: "NC1" }],
	};
}

async function mountCompare(
	planets: PlanetSearchIndexEntry[],
	props: Record<string, unknown> = {}
) {
	const { component, setProps } = await mountComponent(
		PlanetSearchCompare,
		{
			planets,
			filter: filter(),
			ctx: ctx(),
			refName: (r: PlanetSearchReference) =>
				r.kind === "cx" ? `CX ${r.code}` : r.planUuid,
			...props,
		},
		{ messages: { planet_search, game } }
	);
	return { compare: component as VueWrapper, setProps };
}

/** Row label → cell texts */
function table(compare: VueWrapper): Record<string, string[]> {
	return Object.fromEntries(
		compare
			.findAll("tbody tr")
			.map((tr) => [
				tr.find("th").text(),
				tr.findAll("td").map((td) => td.text()),
			])
	);
}

const row = (compare: VueWrapper, label: string) =>
	compare.findAll("tbody tr").find((tr) => tr.find("th").text() === label)!;

/** Rank in percent from the cell's colour mix, null without one */
const rank = (style: string | undefined) => {
	const m = style?.match(/var\(--color-positive\) (\d+)%/);
	return m ? Number(m[1]) : null;
};

describe("PlanetSearchCompare", () => {
	it("names each pinned planet in the title, the chips and the columns", async () => {
		const { compare } = await mountCompare([tarvos, gc, pg]);

		expect(compare.find("button[aria-expanded]").text()).toContain(
			"Compare (3/4)"
		);
		expect(compare.findAll("thead th").map((th) => th.text())).toEqual([
			"Property",
			"Tarvos (UV-351e)",
			"GC-231a",
			"PG-027b",
		]);
		expect(
			compare
				.findAll("button[aria-label^='Remove']")
				.map((b) => b.attributes("aria-label"))
		).toEqual([
			"Remove Tarvos (UV-351e) from compare",
			"Remove GC-231a from compare",
			"Remove PG-027b from compare",
		]);
		expect(compare.text()).toContain(planet_search.compare.hint);
	});

	it("shows one row per property with each planet's value", async () => {
		const { compare } = await mountCompare([tarvos, gc, pg]);

		expect(table(compare)).toEqual({
			"Extra building materials": [
				"AEF, BL, INS",
				"MCG, TSH",
				"MCG, HSE, INS",
			],
			// (1 + fertility * 10/33) * 100
			"Fertility (%)": ["—", "110", "90"],
			"HE /day": ["12.2", "1.3", "—"],
			"Other resources": [
				"—",
				"FEO 40.4, AMM 4.8",
				"HAL 17.0, SIO 37.7, LIO 32.9",
			],
			COGC: ["Electronics", "—", "Metallurgy"],
			Infrastructure: ["LM, COGC, WAR, ADM", "—", "LM, COGC, WAR, ADM"],
			"AI1 / CI1 / IC1 / NC1": [
				"1 / — / — / 3",
				"2 / — / — / 5",
				"— / — / — / —",
			],
			"Jumps to CX NC1": ["3", "5", "—"],
		});
	});

	it("drops a COGC program that has ended", async () => {
		const { compare } = await mountCompare([tarvos, pg], {
			ctx: ctx(1791300000000),
		});

		expect(table(compare).COGC).toEqual(["Electronics", "—"]);
	});

	it("colours numbers best to worst and bolds the best", async () => {
		const { compare } = await mountCompare([tarvos, gc, pg]);
		const cells = (label: string) =>
			row(compare, label)
				.findAll("td")
				.map((td) => ({
					rank: rank(td.attributes("style")),
					bold: td.classes("font-bold"),
				}));

		// a missing value is worst, the others scale from 40% up
		expect(cells("Fertility (%)")).toEqual([
			{ rank: 0, bold: false },
			{ rank: 100, bold: true },
			{ rank: 40, bold: false },
		]);
		expect(cells("HE /day")).toEqual([
			{ rank: 100, bold: true },
			{ rank: 40, bold: false },
			{ rank: 0, bold: false },
		]);
		// fewer jumps is better
		expect(cells("Jumps to CX NC1")).toEqual([
			{ rank: 100, bold: true },
			{ rank: 40, bold: false },
			{ rank: 0, bold: false },
		]);
		// text rows are not ranked
		expect(cells("COGC").every((c) => c.rank === null && !c.bold)).toBe(
			true
		);
	});

	it("scales a full row from 0 to 100", async () => {
		const { compare } = await mountCompare([tarvos, gc]);

		expect(
			row(compare, "Jumps to CX NC1")
				.findAll("td")
				.map((td) => rank(td.attributes("style")))
		).toEqual([100, 0]);
	});

	it("tints only the text rows that differ between planets", async () => {
		const { compare } = await mountCompare([tarvos, pg]);
		const tinted = compare
			.findAll("tbody tr")
			.filter((tr) => tr.classes("bg-blue-400/10"))
			.map((tr) => tr.find("th").text());

		// Infrastructure is the same, ranked rows are never tinted
		expect(tinted).toEqual([
			"Extra building materials",
			"Other resources",
			"COGC",
			"AI1 / CI1 / IC1 / NC1",
		]);
	});

	it("neither ranks nor tints a single planet", async () => {
		const { compare } = await mountCompare([gc]);

		expect(compare.findAll("td[style]")).toHaveLength(0);
		expect(compare.findAll("td.font-bold")).toHaveLength(0);
		expect(compare.findAll("tr.bg-blue-400\\/10")).toHaveLength(0);
		expect(table(compare)["Fertility (%)"]).toEqual(["110"]);
	});

	it("emits unpin with the planet's natural id", async () => {
		const { compare } = await mountCompare([tarvos, gc]);
		await compare
			.find("button[aria-label='Remove Tarvos (UV-351e) from compare']")
			.trigger("click");

		expect(compare.emitted("unpin")).toEqual([["UV-351e"]]);
	});

	it("follows the pinned planets", async () => {
		const { compare, setProps } = await mountCompare([tarvos, gc, pg]);
		await setProps({ planets: [gc] });

		expect(compare.find("button[aria-expanded]").text()).toContain(
			"Compare (1/4)"
		);
		expect(compare.findAll("thead th").map((th) => th.text())).toEqual([
			"Property",
			"GC-231a",
		]);
		expect(table(compare)["HE /day"]).toEqual(["1.3"]);
	});

	it("shows the pin hint and no table without planets", async () => {
		const { compare } = await mountCompare([]);

		expect(compare.find("button[aria-expanded]").text()).toContain(
			"Compare (0/4)"
		);
		expect(compare.find("table").exists()).toBe(false);
		expect(compare.findAll("button")).toHaveLength(1);
		expect(compare.text()).toContain(planet_search.compare.hint_empty);
	});

	it("collapses and expands the table", async () => {
		const { compare } = await mountCompare([tarvos, gc]);
		const toggle = compare.find("button[aria-expanded]");

		await toggle.trigger("click");
		expect(toggle.attributes("aria-expanded")).toBe("false");
		expect(compare.find("table").exists()).toBe(false);
		// the chips stay to unpin from
		expect(compare.findAll("button[aria-label^='Remove']")).toHaveLength(2);

		await toggle.trigger("click");
		expect(toggle.attributes("aria-expanded")).toBe("true");
		expect(compare.find("table").exists()).toBe(true);
	});
});
