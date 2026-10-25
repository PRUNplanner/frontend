import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanetSearchMatrix from "@/features/planet_search/components/PlanetSearchMatrix.vue";
import PlanetSearchList from "@/features/planet_search/components/PlanetSearchList.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";
import { environmentExtras } from "@/features/planet_search/environmentExtras.util";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: ["ticker", "enablePopover", "amount", "max"],
		render(this: { ticker: string; amount?: number; max?: number }) {
			return h(
				"span",
				{
					class: "tile",
					"data-amount": this.amount,
					"data-max": this.max,
				},
				this.ticker
			);
		},
	},
}));
// logged in: "+" is the plan link, the row's first button is the pin
vi.mock("@/stores/userStore", () => ({
	useUserStore: () => ({ isLoggedIn: true }),
}));
vi.mock("@/database/services/useMaterialData", () => ({
	useMaterialData: () => ({ getMaterialClass: () => "" }),
}));

const index = fixture as PlanetSearchIndexEntry[];
// a planet with several extra building materials
const planet = index.find((p) => environmentExtras(p).length >= 3)!;

const props = {
	planets: [planet],
	filter: defaultFilter(),
	ctx: { now: 0, refJumps: () => undefined },
	maxDaily: {},
	sorts: [{ key: "name", dir: "asc" }],
	pins: [],
	showPins: true,
	hiddenColumns: [],
	refName: () => "ref",
};

describe("PlanetSearchMatrix", () => {
	it("shows the extras as tiles with their reason, under an icon header", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...props,
			hiddenMaterials: [],
		});
		const matrix = component as VueWrapper;

		const header = matrix
			.findAll("th")
			.find((th) => th.text() === "planet_search.results.extras")!;
		expect(header.find("svg").exists()).toBe(true);
		expect(header.attributes("title")).toBe("planet_search.results.extras");
		expect(header.find(".sr-only").text()).toBe(
			"planet_search.results.extras"
		);

		const extras = environmentExtras(planet);
		const tiles = matrix.findAll(
			"tbody span[title^='planet_search.reasons.']"
		);
		expect(tiles.map((s) => s.attributes("title"))).toEqual(
			extras.map((e) => `planet_search.reasons.${e.reason}`)
		);
		expect(tiles.map((s) => s.find(".tile").text())).toEqual(
			extras.map((e) => e.ticker)
		);
		expect(
			tiles.every(
				(s) =>
					s
						.findComponent({ name: "MaterialTile" })
						.props("enablePopover") === false
			)
		).toBe(true);
	});
});

function makePlanet(
	patch: Partial<PlanetSearchIndexEntry>
): PlanetSearchIndexEntry {
	return {
		...structuredClone(index[0]),
		planet_natural_id: "AA-001a",
		planet_name: "Alpha",
		system_id: "sys-a",
		fertility: -1,
		has_localmarket: false,
		has_chamberofcommerce: false,
		has_warehouse: false,
		has_administrationcenter: false,
		has_shipyard: false,
		cogc_programs: [],
		resources: [],
		...patch,
	};
}

function resource(ticker: string, daily: number, max = daily) {
	return {
		material_ticker: ticker,
		resource_type: "MINERAL" as const,
		daily_extraction: daily,
		max_daily_extraction: max,
	};
}

describe("PlanetSearchMatrix grid", () => {
	const alpha = makePlanet({
		fertility: 0,
		has_localmarket: true,
		has_shipyard: true,
		cogc_programs: [
			{
				program_type: "ADVERTISING_AGRICULTURE",
				start_epochms: 0,
				end_epochms: 200,
			},
		],
		resources: [resource("FE", 10), resource("HE", 3)],
	});
	// no name: falls back to the natural id
	const beta = makePlanet({
		planet_natural_id: "BB-002b",
		planet_name: "",
		system_id: "sys-b",
		resources: [resource("FE", 2)],
	});
	// name equals the natural id: shown once
	const gamma = makePlanet({
		planet_natural_id: "CC-003c",
		planet_name: "CC-003c",
		system_id: "sys-c",
	});
	const grid = {
		...props,
		planets: [alpha, beta, gamma],
		hiddenMaterials: [] as string[],
		maxDaily: { FE: 20 },
		ctx: {
			now: 100,
			refJumps: (ref: { kind: string }) =>
				ref.kind === "plan"
					? new Map([["sys-a", 4]])
					: new Map([
							["sys-a", 0],
							["sys-b", 7],
						]),
		},
	};
	const filterOf = (materials: string[]) => {
		const filter = defaultFilter();
		filter.materialGroups = [{ op: "any", materials }];
		return filter;
	};

	it("orders filtered materials first, then the others, with a divider", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["HE", "ZZ"]),
		});
		const heads = (component as VueWrapper).findAll("thead th[title]");
		// ZZ is filtered but found nowhere: still a column, 0/3
		const mat = heads.filter((th) =>
			th.attributes("title")!.includes("material_count")
		);
		expect(
			mat.map((th) => th.find("button").text().replace(/\s+/g, " "))
		).toEqual(["HE1/3", "ZZ0/3", "FE2/3"]);
		expect(mat.map((th) => th.classes("bg-blue-950!"))).toEqual([
			true,
			true,
			false,
		]);
		// divider only after the last filtered column
		expect(mat.map((th) => th.classes("border-r-2!"))).toEqual([
			false,
			true,
			false,
		]);
	});

	it("draws no divider when every found material is filtered", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["FE", "HE"]),
		});
		const mat = (component as VueWrapper)
			.findAll("thead th[title]")
			.filter((th) => th.attributes("title")!.includes("material_count"));
		expect(mat).toHaveLength(2);
		expect(mat.some((th) => th.classes("border-r-2!"))).toBe(false);
	});

	it("hides the hidden materials only among the others", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["HE"]),
			hiddenMaterials: ["FE", "HE"],
		});
		const labels = (component as VueWrapper)
			.findAll("thead th[title] button")
			.map((b) => b.text());
		// HE is filtered, so it stays; FE is hidden
		expect(labels.some((l) => l.startsWith("HE"))).toBe(true);
		expect(labels.some((l) => l.startsWith("FE"))).toBe(false);
	});

	it("renders planet names, fertility, cells and their heat", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["FE"]),
		});
		const rows = (component as VueWrapper).findAll("tbody tr");
		expect(rows).toHaveLength(3);
		const cells = rows.map((r) => r.findAll("td"));

		// alpha: name and id; beta: id only; gamma: id once
		expect(cells[0][1].text().replace(/\s+/g, " ")).toBe("Alpha AA-001a");
		expect(cells[1][1].text()).toBe("BB-002b");
		expect(cells[1][1].find("span").exists()).toBe(false);
		expect(cells[2][1].text()).toBe("CC-003c");
		expect(cells[2][1].find("span").exists()).toBe(false);

		// fertility 0 is 100 %, an infertile planet a dash
		expect(cells[0][2].text()).toBe("100");
		expect(cells[0][2].classes()).toContain("text-positive");
		expect(cells[1][2].text()).toBe("—");
		expect(cells[1][2].classes()).toContain("text-muted");

		// plots unknown until the backend has refreshed them
		expect(cells[0][3].text()).toBe("planet_search.plots.unknown");

		// FE 10 of max 20 is half: light text; FE 2 of 20 below 60 %
		expect(cells[0][4].text()).toBe("10.0");
		expect(cells[0][4].find("span").attributes("title")).toBe(
			"planet_search.results.cell"
		);
		expect(cells[0][4].find("span").classes()).toContain("text-white");
		expect(cells[0][4].classes()).toContain("font-bold");
		// a planet without the material shows a dot
		expect(cells[2][4].text()).toBe("·");
		expect(cells[2][4].find("span").attributes("title")).toBe(
			"planet_search.results.not_present"
		);
	});

	it("uses dark text on a hot cell and caps the share at 100 %", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["FE"]),
			// 10 of 12 is above 60 %, HE has no max: divides by 1 and caps
			maxDaily: { FE: 12 },
		});
		const rows = (component as VueWrapper).findAll("tbody tr");
		const hot = rows[0].findAll("td")[4].find("span");
		expect(hot.classes()).toContain("text-black");
		const capped = rows[0].findAll("td")[5].find("span");
		expect(capped.text()).toBe("3.0");
		expect(capped.classes()).toContain("text-black");
	});

	it("shows jumps to the picked references, a dash when unreachable", async () => {
		const filter = filterOf(["FE"]);
		filter.references = [
			{ kind: "plan", planUuid: "plan-1" },
			{ kind: "cx", code: "CI1" },
		];
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter,
			refName: () => "My plan",
		});
		const m = component as VueWrapper;
		const head = m.findAll("thead th").map((th) => th.text());
		expect(head).toContain("My plan");
		// CI1 is picked: highlighted in the header
		const ci1 = m
			.findAll("thead th button")
			.find((b) => b.text() === "CI1")!;
		expect(ci1.classes()).toContain("text-positive");
		const ai1 = m
			.findAll("thead th button")
			.find((b) => b.text() === "AI1")!;
		expect(ai1.classes()).not.toContain("text-positive");

		const rows = m.findAll("tbody tr").map((r) => r.findAll("td"));
		// columns: actions, planet, fert, plots, FE, HE, plan, AI1, CI1, IC1, NC1, ...
		const jumps = (i: number) => rows.map((r) => r[i].text());
		expect(jumps(6)).toEqual(["4", "—", "—"]);
		expect(rows[1][6].find("span").attributes("title")).toBe(
			"planet_search.results.unreachable"
		);
		// AI1 (sys-a 0, sys-b 7, sys-c unknown)
		expect(jumps(7)).toEqual(["0", "7", "—"]);
		expect(rows[0][8].classes()).toContain("text-positive");
		expect(rows[0][7].classes()).not.toContain("text-positive");
	});

	it("hides optional columns by name", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["FE"]),
			hiddenColumns: ["fert", "AI1", "NC1", "extras", "cogc"],
			showPins: false,
		});
		const m = component as VueWrapper;
		const head = m.findAll("thead th").map((th) => th.text());
		expect(head).not.toContain("planet_search.results.fert");
		expect(head).not.toContain("AI1");
		expect(head).toContain("CI1");
		expect(head).not.toContain("planet_search.results.cogc_infra");
		// no pin column: narrow action cell
		expect(m.find("thead th").classes()).toContain("w-[44px]");
		expect(m.find("tbody tr td").classes()).toContain("w-[44px]");
		// actions, planet, plots, FE, HE, CI1, IC1
		expect(m.find("tbody tr").findAll("td")).toHaveLength(7);
	});

	it("lists the infrastructure and the running COGC program", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["FE"]),
		});
		const rows = (component as VueWrapper).findAll("tbody tr");
		const last = (i: number) =>
			rows[i].findAll("td").at(-1)!.text().replace(/\s+/g, " ");
		expect(last(0)).toBe(
			"game.cogc_program.ADVERTISING_AGRICULTURE · LM · SHY"
		);
		expect(last(1)).toBe(
			"planet_search.results.no_cogc · planet_search.results.no_infrastructure"
		);
	});

	it("marks pinned planets and emits pin and sort", async () => {
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			filter: filterOf(["FE"]),
			pins: ["BB-002b"],
		});
		const m = component as VueWrapper;
		const pins = m
			.findAll("tbody tr")
			.map((r) => r.find("button").attributes("aria-pressed"));
		expect(pins).toEqual(["false", "true", "false"]);

		await m.findAll("tbody tr")[1].find("button").trigger("click");
		expect(component.emitted("pin")).toEqual([["BB-002b"]]);

		await m
			.findAll("thead th button")
			.find((b) => b.text().startsWith("FE"))!
			.trigger("click");
		expect(component.emitted("sort")).toEqual([
			[[{ key: "mat:FE", dir: "desc" }]],
		]);
	});

	it("shows a loading sentinel while rows are still to come", async () => {
		const many = Array.from({ length: 101 }, (_, i) =>
			makePlanet({ planet_natural_id: `XX-${i}`, planet_name: `P${i}` })
		);
		const { component } = await mountComponent(PlanetSearchMatrix, {
			...grid,
			planets: many,
			filter: filterOf([]),
		});
		const m = component as VueWrapper;
		expect(m.findAll("tbody tr")).toHaveLength(100);
		expect(m.text()).toContain("planet_search.results.loading_more");
	});
});

describe("PlanetSearchList", () => {
	it("keeps one flexible column, also with Other resources hidden", async () => {
		const { component, setProps } = await mountComponent(
			PlanetSearchList,
			props
		);
		const list = component as VueWrapper;
		const flexible = () =>
			list
				.findAll("thead th")
				.filter((th) => !th.classes().some((c) => /^w-/.test(c)));

		expect(flexible().map((th) => th.text())).toEqual([
			"planet_search.results.other",
		]);

		await setProps({ hiddenColumns: ["other"] });
		expect(flexible().map((th) => th.text())).toEqual([""]);
		expect(list.findAll("thead th")).toHaveLength(
			list.find("tbody tr").findAll("td").length
		);
	});
});

describe("PlanetSearchList rows", () => {
	const alpha = makePlanet({
		fertility: 0,
		has_localmarket: true,
		cogc_programs: [
			{
				program_type: "ADVERTISING_AGRICULTURE",
				start_epochms: 0,
				end_epochms: 200,
			},
		],
		resources: [
			resource("HE", 3, 6),
			resource("FE", 10, 20),
			resource("AL", 1, 2),
		],
	});
	const beta = makePlanet({
		planet_natural_id: "BB-002b",
		planet_name: "",
		system_id: "sys-b",
	});
	const gamma = makePlanet({
		planet_natural_id: "CC-003c",
		planet_name: "CC-003c",
		system_id: "sys-c",
	});
	const filter = defaultFilter();
	filter.materialGroups = [{ op: "any", materials: ["FE"] }];
	filter.references = [
		{ kind: "plan", planUuid: "plan-1" },
		{ kind: "cx", code: "NC1" },
	];
	const list = {
		...props,
		planets: [alpha, beta, gamma],
		filter,
		maxDaily: { FE: 20 },
		refName: () => "My plan",
		ctx: {
			now: 100,
			refJumps: (ref: { kind: string }) =>
				ref.kind === "plan"
					? new Map([["sys-a", 4]])
					: new Map([["sys-a", 1]]),
		},
	};

	it("shows filtered materials with their amounts, a faded tile when absent", async () => {
		const { component } = await mountComponent(PlanetSearchList, list);
		const rows = (component as VueWrapper).findAll("tbody tr");
		const cells = rows.map((r) => r.findAll("td"));

		// planet: name plus id, id alone, id once
		expect(cells[0][1].findAll("div").map((d) => d.text())).toEqual([
			"Alpha",
			"AA-001a",
		]);
		expect(cells[1][1].text()).toBe("BB-002b");
		expect(cells[2][1].findAll("div")).toHaveLength(1);

		expect(cells[0][2].text()).toBe("100");
		expect(cells[1][2].text()).toBe("—");
		expect(cells[1][2].classes()).toContain("text-muted");
		// plots unknown until the backend has refreshed them
		expect(cells[0][3].text()).toBe("planet_search.plots.unknown");

		const present = cells[0][4].find(".tile");
		expect(present.attributes("data-amount")).toBe("10");
		expect(present.attributes("data-max")).toBe("20");
		const absent = cells[1][4].find("span[title]");
		expect(absent.attributes("title")).toBe(
			"planet_search.results.not_present"
		);
		expect(absent.classes()).toContain("opacity-35");
		expect(absent.find(".tile").attributes("data-amount")).toBe("0");
		expect(absent.find(".tile").attributes("data-max")).toBe("20");
	});

	it("lists the other resources alphabetically, without the filtered ones", async () => {
		const { component } = await mountComponent(PlanetSearchList, list);
		const others = (component as VueWrapper)
			.findAll("tbody tr")[0]
			.findAll("td")[5]
			.findAll(".tile");
		expect(others.map((t) => t.text())).toEqual(["AL", "HE"]);
		expect(others.map((t) => t.attributes("data-max"))).toEqual(["2", "6"]);
	});

	it("shows COGC with infrastructure and the jumps to the references", async () => {
		const { component } = await mountComponent(PlanetSearchList, list);
		const m = component as VueWrapper;
		const rows = m.findAll("tbody tr").map((r) => r.findAll("td"));

		// ..., extras, cogc, plan, AI1, CI1, IC1, NC1
		expect(rows[0][7].findAll("div").map((d) => d.text())).toEqual([
			"game.cogc_program.ADVERTISING_AGRICULTURE",
			"LM",
		]);
		expect(rows[1][7].findAll("div").map((d) => d.text())).toEqual([
			"planet_search.results.no_cogc",
			"planet_search.results.no_infrastructure",
		]);
		expect(rows.map((r) => r[8].text())).toEqual(["4", "—", "—"]);
		expect(rows[1][8].find("span").attributes("title")).toBe(
			"planet_search.results.unreachable"
		);
		// only NC1 is a picked reference
		expect(rows.map((r) => r.at(-1)!.text())).toEqual(["1", "—", "—"]);
		expect(rows[0].at(-1)!.classes()).toContain("text-positive");
		expect(rows[0].at(-2)!.classes()).not.toContain("text-positive");
		const headers = m.findAll("thead th button");
		expect(
			headers.find((b) => b.text().startsWith("NC1"))!.classes()
		).toContain("text-positive");
		expect(
			headers.find((b) => b.text().startsWith("IC1"))!.classes()
		).not.toContain("text-positive");
	});

	it("hides columns, keeping an empty cell for the flexible one", async () => {
		const { component } = await mountComponent(PlanetSearchList, {
			...list,
			hiddenColumns: [
				"fert",
				"plots",
				"other",
				"extras",
				"cogc",
				"AI1",
				"CI1",
				"IC1",
			],
			showPins: false,
		});
		const m = component as VueWrapper;
		expect(m.find("thead th").classes()).toContain("w-[44px]");
		const body = m.find("tbody tr").findAll("td");
		// actions, planet, FE, empty flexible, plan, NC1
		expect(body).toHaveLength(6);
		expect(body[3].attributes("aria-hidden")).toBe("true");
		expect(body[3].text()).toBe("");
	});

	it("emits pin and sort and flags pinned planets", async () => {
		const { component } = await mountComponent(PlanetSearchList, {
			...list,
			pins: ["CC-003c"],
		});
		const m = component as VueWrapper;
		const pressed = m
			.findAll("tbody tr")
			.map((r) => r.find("button").attributes("aria-pressed"));
		expect(pressed).toEqual(["false", "false", "true"]);

		await m.findAll("tbody tr")[2].find("button").trigger("click");
		expect(component.emitted("pin")).toEqual([["CC-003c"]]);

		await m
			.findAll("thead th button")
			.find((b) => b.text().startsWith("FE"))!
			.trigger("click");
		expect(component.emitted("sort")).toEqual([
			[[{ key: "mat:FE", dir: "desc" }]],
		]);
	});

	it("shows a loading sentinel while rows are still to come", async () => {
		const many = Array.from({ length: 101 }, (_, i) =>
			makePlanet({ planet_natural_id: `XX-${i}`, planet_name: `P${i}` })
		);
		const { component } = await mountComponent(PlanetSearchList, {
			...list,
			planets: many,
		});
		const m = component as VueWrapper;
		expect(m.findAll("tbody tr")).toHaveLength(100);
		expect(m.text()).toContain("planet_search.results.loading_more");
	});
});

describe("planets that can't be settled", () => {
	// every plot taken, no ghost sites; the other one has free plots
	const full = makePlanet({
		plots_total: 10,
		plots_used: 10,
		ghost_sites: 0,
		supports_ghost_sites: false,
	});
	const open = makePlanet({
		planet_natural_id: "BB-002b",
		system_id: "sys-b",
		plots_total: 10,
		plots_used: 4,
	});

	it.each([
		["list", PlanetSearchList],
		["matrix", PlanetSearchMatrix],
	] as const)("%s marks them next to the name, plots column hidden", async (_, view) => {
		const { component } = await mountComponent(view, {
			...props,
			planets: [full, open],
			hiddenMaterials: [],
			hiddenColumns: ["plots"],
		});
		const rows = (component as VueWrapper).findAll("tbody tr");
		const icon = (i: number) => rows[i].findAll("td")[1].find("[data-testid='planet-full']");
		expect(icon(0).exists()).toBe(true);
		expect(icon(1).exists()).toBe(false);
		// the column is off by default here
		expect((component as VueWrapper).find("[data-testid='planet-plots']").exists()).toBe(false);
	});
});
