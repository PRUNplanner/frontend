import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanetSearchFilterPanel from "@/features/planet_search/components/PlanetSearchFilterPanel.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	defaultFilter,
	facetCounts,
	filterPlanets,
	indexMaterials,
	SEARCH_EXTRAS,
} from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type { PlanetSearchFilter } from "@/features/planet_search/planetSearch.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";

// test data
import fixture from "@/tests/test_data/api_data_planet_search_index.json";

const ctx = { now: 0, refJumps: () => undefined };

// keys render as keys, only the Any button shows its count
vi.mock("vue-i18n", async (original) => ({
	...(await original<typeof import("vue-i18n")>()),
	useI18n: () => ({
		t: (key: string, params?: Record<string, unknown>) =>
			key === "planet_search.filters.any" ? `Any · ${params?.n}` : key,
	}),
}));

vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: ["ticker"],
		render(this: { ticker: string }) {
			return h("span", this.ticker);
		},
	},
}));

const empires: PlanEmpireElement[] = [
	{
		uuid: "00000000-0000-4000-8000-000000000001",
		empire_name: "Main",
		empire_faction: "NONE",
		empire_permits_used: 0,
		empire_permits_total: 0,
		plans: Array.from({ length: 32 }, (_, i) => ({
			uuid: `00000000-0000-4000-8000-0000000001${String(i).padStart(2, "0")}`,
			plan_name: i === 7 ? "Ironreach" : `Base ${i}`,
			planet_natural_id: `AB-${String(i).padStart(3, "0")}a`,
		})),
	} as unknown as PlanEmpireElement,
];

async function mountPanel(
	filter: Partial<PlanetSearchFilter> = {},
	index: PlanetSearchIndexEntry[] = []
) {
	const f = { ...defaultFilter(), ...filter };
	const facets = facetCounts(index, f, ctx, indexMaterials([]), []);
	const { component } = await mountComponent(PlanetSearchFilterPanel, {
		filter: f,
		facets,
		materials: ["FEO", "H2O"],
		maxDaily: { FEO: 44.1 },
		empires,
		empireUuid: empires[0].uuid,
		showPlans: true,
		planetNames: { "AB-003a": "Montem" },
	});
	return component as VueWrapper;
}

const lastFilter = (panel: VueWrapper) =>
	panel.emitted("update:filter")!.at(-1)![0] as PlanetSearchFilter;

const buttonByText = (panel: VueWrapper, text: string) =>
	panel.findAll("button").find((b) => b.text().startsWith(text))!;

describe("PlanetSearchFilterPanel", () => {
	it("toggles conditions, extras, cogc, infrastructure and exchanges", async () => {
		const panel = await mountPanel();

		await buttonByText(panel, "planet_search.conditions.fertile").trigger("click");
		expect(lastFilter(panel).fertile).toBe(true);

		await buttonByText(panel, "planet_search.conditions.gaseous").trigger("click");
		expect(lastFilter(panel).surface).toEqual(["rocky", "gaseous"]);

		await buttonByText(panel, "MGC").trigger("click");
		expect(lastFilter(panel).acceptedExtras).toEqual(["MGC"]);

		await buttonByText(panel, "game.cogc_program.WORKFORCE_PIONEERS").trigger("click");
		expect(lastFilter(panel).cogc).toEqual(["WORKFORCE_PIONEERS"]);

		await buttonByText(panel, "WAR").trigger("click");
		expect(lastFilter(panel).infrastructure).toEqual(["WAR"]);

		await buttonByText(panel, "NC1").trigger("click");
		expect(lastFilter(panel).references).toEqual([
			{ kind: "cx", code: "NC1" },
		]);

		// the only surface can't be switched off
		expect(buttonByText(panel, "planet_search.conditions.rocky").attributes("disabled")).toBeDefined();
	});

	it("Any buttons widen their section, show the count and are disabled when wide", async () => {
		const index = fixture as PlanetSearchIndexEntry[];
		const narrow: Partial<PlanetSearchFilter> = {
			fertile: true,
			cogc: ["WORKFORCE_PIONEERS"],
			infrastructure: ["WAR"],
		};
		const panel = await mountPanel(narrow, index);
		const any = panel.findAll(
			'button[aria-label="planet_search.filters.any_label"]'
		);
		expect(any).toHaveLength(4);
		const f = { ...defaultFilter(), ...narrow };
		const count = (patch: Partial<PlanetSearchFilter>) =>
			filterPlanets(index, { ...f, ...patch }, ctx).length;

		const widened: Partial<PlanetSearchFilter>[] = [
			{ surface: ["rocky", "gaseous"], fertile: false },
			{ acceptedExtras: [...SEARCH_EXTRAS] },
			{ cogc: [] },
			{ infrastructure: [] },
		];
		for (const [i, patch] of widened.entries()) {
			expect(any[i].text()).toBe(`Any · ${count(patch)}`);
			expect(any[i].attributes("disabled")).toBeUndefined();
			expect(any[i].attributes("aria-pressed")).toBe("false");
			await any[i].trigger("click");
			expect(lastFilter(panel)).toEqual({ ...f, ...patch });
		}

		// cogc and infrastructure are wide by default
		const wide = (await mountPanel()).findAll(
			'button[aria-label="planet_search.filters.any_label"]'
		);
		expect(wide.map((b) => b.attributes("disabled") !== undefined)).toEqual([
			false,
			false,
			true,
			true,
		]);
		expect(wide[2].attributes("aria-pressed")).toBe("true");
	});

	it("edits material groups", async () => {
		const panel = await mountPanel({
			materialGroups: [{ op: "any", materials: ["FEO", "H2O"] }],
			minDaily: { FEO: 15, H2O: 2 },
		});
		expect(panel.text()).toContain("planet_search.materials.max");

		await buttonByText(panel, "planet_search.materials.all_of").trigger("click");
		expect(lastFilter(panel).materialGroups[0].op).toBe("all");

		await buttonByText(panel, "planet_search.materials.any_group").trigger("click");
		expect(lastFilter(panel).groupsOp).toBe("any");

		await panel
			.findAll('button[aria-label="planet_search.materials.remove_material"]')[1]!
			.trigger("click");
		expect(lastFilter(panel).materialGroups[0].materials).toEqual(["FEO"]);
		expect(lastFilter(panel).minDaily).toEqual({ FEO: 15 });

		await buttonByText(panel, "planet_search.materials.add_group").trigger("click");
		expect(lastFilter(panel).materialGroups).toHaveLength(2);

		await panel
			.find('button[aria-label="planet_search.materials.remove_group_label"]')
			.trigger("click");
		expect(lastFilter(panel).materialGroups).toEqual([
			{ op: "any", materials: [] },
		]);
	});

	it("filters and picks plans", async () => {
		const panel = await mountPanel();
		const planRows = () =>
			panel.findAll(".max-h-\\[200px\\] .pcheckbox");
		expect(planRows()).toHaveLength(32);

		await panel
			.find('input[aria-label="planet_search.distance.plan_filter"]')
			.setValue("iron");
		expect(planRows()).toHaveLength(1);

		await planRows()[0].find("input").setValue(true);
		expect(lastFilter(panel).references).toEqual([
			{ kind: "plan", planUuid: empires[0].plans[7].uuid },
		]);

		await panel
			.find('input[aria-label="planet_search.distance.plan_filter"]')
			.setValue("montem");
		expect(planRows()).toHaveLength(1);

		await panel
			.find('input[aria-label="planet_search.distance.plan_filter"]')
			.setValue("nothing");
		expect(panel.text()).toContain("planet_search.distance.no_plans");
	});
});
