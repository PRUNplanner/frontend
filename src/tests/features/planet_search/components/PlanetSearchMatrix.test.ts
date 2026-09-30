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
		props: ["ticker", "enablePopover"],
		render(this: { ticker: string }) {
			return h("span", { class: "tile" }, this.ticker);
		},
	},
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
		expect(header.find(".sr-only").text()).toBe("planet_search.results.extras");

		const extras = environmentExtras(planet);
		const tiles = matrix.findAll("tbody span[title^='planet_search.reasons.']");
		expect(tiles.map((s) => s.attributes("title"))).toEqual(
			extras.map((e) => `planet_search.reasons.${e.reason}`)
		);
		expect(tiles.map((s) => s.find(".tile").text())).toEqual(
			extras.map((e) => e.ticker)
		);
		expect(
			tiles.every(
				(s) =>
					s.findComponent({ name: "MaterialTile" }).props("enablePopover") ===
					false
			)
		).toBe(true);
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
			list.findAll("thead th").filter((th) => !th.classes().some((c) => /^w-/.test(c)));

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
