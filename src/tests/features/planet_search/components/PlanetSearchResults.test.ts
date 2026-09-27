import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import {
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";

import PlanetSearchResults from "@/features/planet_search/components/PlanetSearchResults.vue";
import type { Planet } from "@/features/api/schemas/gameData.schemas";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// jumps from a market or the checked system to each planet's system
const JUMPS = vi.hoisted((): Record<string, Record<string, number>> => ({
	"sys-a": { AI1: 3, CI1: 5, IC1: 7, NC1: 2, CHECK: 4 },
	// unreachable without a colony ship
	"sys-b": { AI1: -1, CI1: -1, IC1: -1, NC1: -1, CHECK: -1 },
	"sys-c": { AI1: 1, CI1: 0, IC1: 12, NC1: 9, CHECK: 10 },
	"sys-d": { AI1: 6, CI1: 6, IC1: 6, NC1: 6, CHECK: 0 },
}));
vi.mock("@/features/pathfinding/usePathfinder", () => ({
	usePathfinder: () => ({
		systemidAI1: "AI1",
		systemidCI1: "CI1",
		systemidIC1: "IC1",
		systemidNC1: "NC1",
		getPathBetweenLength: (source: string, target: string) =>
			JUMPS[target][source],
		getSystemName: (id: string) => (id === "CHECK" ? "Moria" : null),
	}),
}));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String, amount: Number, max: Number },
		render(this: { ticker: string }) {
			return h("span", { class: "tile" }, this.ticker);
		},
	},
}));
vi.mock("@/features/government/components/PlanetPOPRButton.vue", () => ({
	default: {
		name: "PlanetPOPRButton",
		props: { planetNaturalId: String, buttonSize: String },
		render: () => h("button"),
	},
}));

const resource = (ticker: string, daily: number, max: number) => ({
	material_ticker: ticker,
	daily_extraction: daily,
	max_daily_extraction: max,
	resource_type: "MINERAL",
	factor: 0.1,
});

function planet(p: Partial<Planet>): Planet {
	return {
		planet_id: "0",
		planet_natural_id: "AA-000a",
		planet_name: "AA-000a",
		system_id: "sys-a",
		has_localmarket: false,
		has_chamberofcommerce: false,
		has_warehouse: false,
		has_administrationcenter: false,
		has_shipyard: false,
		// normal gravity, pressure and temperature
		pressure: 1,
		surface: true,
		gravity: 1,
		temperature: 20,
		fertility: -1,
		faction_code: null,
		faction_name: null,
		cogc_program_status: null,
		active_cogc_program_type: null,
		resources: [],
		cogc_programs: [],
		...p,
	} as Planet;
}

const PLANETS: Planet[] = [
	planet({
		planet_natural_id: "OT-580b",
		planet_name: "Montem",
		fertility: 0,
		has_shipyard: true,
		has_localmarket: true,
		active_cogc_program_type: "ADVERTISING_AGRICULTURE",
		resources: [
			resource("LST", 3, 6),
			resource("FEO", 10, 20),
			resource("H2O", 5, 10),
		],
	}),
	planet({
		planet_natural_id: "AB-123c",
		planet_name: "AB-123c",
		system_id: "sys-b",
		surface: false,
		gravity: 0.1,
		pressure: 3,
		temperature: -50,
		resources: [resource("FEO", 2, 20)],
	}),
	planet({
		planet_natural_id: "XY-999z",
		planet_name: "Promitor",
		system_id: "sys-c",
		fertility: 0.33,
		gravity: 3,
		pressure: 0.1,
		temperature: 100,
		has_warehouse: true,
		has_chamberofcommerce: true,
		has_administrationcenter: true,
		active_cogc_program_type: "WORKFORCE_PIONEERS",
		resources: [resource("FEO", 15, 20)],
	}),
];

async function mountResults(props: Record<string, unknown> = {}) {
	return mountComponent(PlanetSearchResults, {
		results: PLANETS,
		searchMaterials: ["FEO"],
		...props,
	});
}

const planetIds = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => r.planetName);

const tiles = (wrapper: VueWrapper, column: string) =>
	wrapper
		.findAll(`tbody td[data-col-key="${column}"]`)
		.map((td) => td.findAll(".tile").map((t) => t.text()));

async function sortBy(wrapper: VueWrapper, column: string) {
	await wrapper.find(`th[data-col-key="${column}"]`).trigger("click");
	await flushPromises();
}

describe("PlanetSearchResults", () => {
	it("renders the planets", async () => {
		const { wrapper } = await mountResults();

		expect(
			tableRows(wrapper).map((r) => [
				r.planetName,
				r.fertility,
				r.cogcProgram,
				r.infrastructures,
				r.distanceAI1,
				r.distanceCI1,
				r.distanceIC1,
				r.distanceNC1,
			])
		).toEqual([
			// no fertility bonus: 1 + 0 * 10 / 33
			[
				"Montem (OT-580b)",
				"100.00 %",
				"Agriculture",
				"LM, SHY",
				"3",
				"5",
				"7",
				"2",
			],
			// infertile, no COGC program, unreachable
			["AB-123c", "—", "—", "", "∞", "∞", "∞", "∞"],
			// 1 + 0.33 * 10 / 33 = 1.1
			[
				"Promitor (XY-999z)",
				"110.00 %",
				"Pioneers",
				"ADM, COGC, WAR",
				"1",
				"0",
				"12",
				"9",
			],
		]);
	});

	it("links each planet to a new plan and its POPR", async () => {
		const { wrapper } = await mountResults();

		expect(
			wrapper.findAllComponents(RouterLinkStub).map((l) => l.props("to"))
		).toEqual(["/plan/OT-580b", "/plan/AB-123c", "/plan/XY-999z"]);
		expect(
			wrapper
				.findAllComponents({ name: "PlanetPOPRButton" })
				.map((b) => b.props())
		).toEqual([
			{ planetNaturalId: "OT-580b", buttonSize: "sm" },
			{ planetNaturalId: "AB-123c", buttonSize: "sm" },
			{ planetNaturalId: "XY-999z", buttonSize: "sm" },
		]);
	});

	it("shows the environment as material tiles", async () => {
		const { wrapper } = await mountResults();

		// surface, gravity, temperature, pressure
		expect(tiles(wrapper, "environment")).toEqual([
			["MCG"],
			["AEF", "MGC", "INS", "HSE"],
			["MCG", "BL", "TSH", "SEA"],
		]);
	});

	it("splits searched from additional resources", async () => {
		const { wrapper } = await mountResults();

		expect(wrapper.find('th[data-col-key="Search#FEO"]').text()).toContain(
			"FEO"
		);
		expect(tiles(wrapper, "Search#FEO")).toEqual([
			["FEO"],
			["FEO"],
			["FEO"],
		]);
		// additional resources sorted by ticker
		expect(tiles(wrapper, "additionalResources")).toEqual([
			["H2O", "LST"],
			[],
			[],
		]);

		const feo = wrapper
			.findAllComponents({ name: "MaterialTile" })
			.filter((t) => t.props("ticker") === "FEO")
			.map((t) => [t.props("amount"), t.props("max")]);
		expect(feo).toEqual([
			[10, 20],
			[2, 20],
			[15, 20],
		]);
	});

	it("has a column per searched material", async () => {
		const { wrapper } = await mountResults({
			searchMaterials: [],
		});

		expect(wrapper.find('th[data-col-key^="Search#"]').exists()).toBe(
			false
		);
		expect(tiles(wrapper, "additionalResources")[0]).toEqual([
			"FEO",
			"H2O",
			"LST",
		]);
	});

	it("filters by minimum richness", async () => {
		const { wrapper } = await mountResults({
			searchMaterialRichness: { FEO: 50 },
		});

		// 10 / 20 = 50 % stays, 2 / 20 = 10 % goes, 15 / 20 = 75 %
		expect(planetIds(wrapper)).toEqual([
			"Montem (OT-580b)",
			"Promitor (XY-999z)",
		]);
	});

	it("checks the distance to a system", async () => {
		const { wrapper } = await mountResults({
			searchSystem: "CHECK",
			searchSystemDistance: 4,
		});

		expect(
			wrapper.find('th[data-col-key="checkDistance"]').text()
		).toContain("planet_search.results.columns.distance Moria");
		// 4 of at most 4 jumps stays, unreachable and 10 jumps go
		expect(tableRows(wrapper)).toHaveLength(1);
		expect(tableRows(wrapper).at(0)).toMatchObject({
			planetName: "Montem (OT-580b)",
			checkDistance: "4",
		});
	});

	it("keeps planets in the checked system", async () => {
		const { wrapper } = await mountResults({
			results: [
				planet({
					planet_natural_id: "CH-001a",
					planet_name: "CH-001a",
					system_id: "sys-d",
					resources: [resource("FEO", 1, 2)],
				}),
			],
			searchSystem: "CHECK",
			searchSystemDistance: 1,
		});

		expect(tableRows(wrapper)).toEqual([
			expect.objectContaining({
				planetName: "CH-001a",
				checkDistance: "0",
			}),
		]);
	});

	it("hides the distance column without a known system", async () => {
		const { wrapper } = await mountResults({
			searchSystem: "unknown",
			searchSystemDistance: 5,
		});

		expect(wrapper.find('th[data-col-key="checkDistance"]').exists()).toBe(
			false
		);

		const { wrapper: noSystem } = await mountResults();
		expect(noSystem.find('th[data-col-key="checkDistance"]').exists()).toBe(
			false
		);
	});

	it("sorts unreachable planets as the farthest", async () => {
		const { wrapper } = await mountResults();

		// descending first: ∞, 3, 1
		await sortBy(wrapper, "distanceAI1");
		expect(planetIds(wrapper)).toEqual([
			"AB-123c",
			"Montem (OT-580b)",
			"Promitor (XY-999z)",
		]);

		await sortBy(wrapper, "distanceAI1");
		expect(planetIds(wrapper)).toEqual([
			"Promitor (XY-999z)",
			"Montem (OT-580b)",
			"AB-123c",
		]);
	});

	it.each(["distanceCI1", "distanceIC1", "distanceNC1"])(
		"sorts by %s",
		async (column) => {
			const { wrapper } = await mountResults();

			await sortBy(wrapper, column);
			await sortBy(wrapper, column);

			// ascending, unreachable last
			expect(tableRows(wrapper).map((r) => r[column])).toEqual(
				tableRows(wrapper)
					.map((r) => r[column])
					.sort((a, b) =>
						a === "∞" ? 1 : b === "∞" ? -1 : Number(a) - Number(b)
					)
			);
			expect(tableRows(wrapper).at(-1)![column]).toBe("∞");
		}
	);

	it("sorts by daily extraction of a searched material", async () => {
		const { wrapper } = await mountResults();

		// descending: 15, 10, 2
		await sortBy(wrapper, "Search#FEO");
		expect(planetIds(wrapper)).toEqual([
			"Promitor (XY-999z)",
			"Montem (OT-580b)",
			"AB-123c",
		]);
	});

	it("follows new results", async () => {
		const { wrapper, setProps } = await mountResults();

		await setProps({ results: [PLANETS[1]] });
		expect(planetIds(wrapper)).toEqual(["AB-123c"]);

		await setProps({ results: [] });
		expect(tableRows(wrapper)).toEqual([]);
	});
});
