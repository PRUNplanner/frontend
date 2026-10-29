import { describe, it, expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import PlanetSearchFilterPanel from "@/features/planet_search/components/PlanetSearchFilterPanel.vue";
import { PInput, PInputNumber, PSelect } from "@/ui";
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
const openAuth = vi.hoisted(() => vi.fn());
vi.mock("@/features/account/useAuthPanel", () => ({
	useAuthPanel: () => ({ open: openAuth }),
}));
vi.mock("vue-i18n", async (original) => ({
	...(await original<typeof import("vue-i18n")>()),
	useI18n: () => ({
		t: (key: string, params?: Record<string, unknown>) =>
			key === "planet_search.filters.any" ? `Any · ${params?.n}` : key,
	}),
}));

vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);

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
		// bound like the page: the filter only changes through the prop
		"onUpdate:filter": () => {},
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

		await buttonByText(panel, "planet_search.conditions.fertile").trigger(
			"click"
		);
		expect(lastFilter(panel).fertile).toBe(true);

		await buttonByText(panel, "planet_search.conditions.gaseous").trigger(
			"click"
		);
		expect(lastFilter(panel).surface).toEqual(["rocky", "gaseous"]);

		await buttonByText(panel, "MGC").trigger("click");
		expect(lastFilter(panel).acceptedExtras).toEqual(["MGC"]);

		await buttonByText(
			panel,
			"game.cogc_program.WORKFORCE_PIONEERS"
		).trigger("click");
		expect(lastFilter(panel).cogc).toEqual(["WORKFORCE_PIONEERS"]);

		await buttonByText(panel, "WAR").trigger("click");
		expect(lastFilter(panel).infrastructure).toEqual(["WAR"]);

		await buttonByText(panel, "NC1").trigger("click");
		expect(lastFilter(panel).references).toEqual([
			{ kind: "cx", code: "NC1" },
		]);

		// the only surface can't be switched off
		expect(
			buttonByText(panel, "planet_search.conditions.rocky").attributes(
				"disabled"
			)
		).toBeDefined();
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
		expect(wide.map((b) => b.attributes("disabled") !== undefined)).toEqual(
			[false, false, true, true]
		);
		expect(wide[2].attributes("aria-pressed")).toBe("true");
	});

	it("edits material groups", async () => {
		const panel = await mountPanel({
			materialGroups: [{ op: "any", materials: ["FEO", "H2O"] }],
			minDaily: { FEO: 15, H2O: 2 },
		});
		expect(panel.text()).toContain("planet_search.materials.max");

		await buttonByText(panel, "planet_search.materials.all_of").trigger(
			"click"
		);
		expect(lastFilter(panel).materialGroups[0].op).toBe("all");

		await buttonByText(panel, "planet_search.materials.any_group").trigger(
			"click"
		);
		expect(lastFilter(panel).groupsOp).toBe("any");

		await panel
			.findAll(
				'button[aria-label="planet_search.materials.remove_material"]'
			)[1]!
			.trigger("click");
		expect(lastFilter(panel).materialGroups[0].materials).toEqual(["FEO"]);
		expect(lastFilter(panel).minDaily).toEqual({ FEO: 15 });

		await buttonByText(panel, "planet_search.materials.add_group").trigger(
			"click"
		);
		expect(lastFilter(panel).materialGroups).toHaveLength(2);

		await panel
			.find(
				'button[aria-label="planet_search.materials.remove_group_label"]'
			)
			.trigger("click");
		expect(lastFilter(panel).materialGroups).toEqual([
			{ op: "any", materials: [] },
		]);
	});

	it("filters and picks plans", async () => {
		const panel = await mountPanel();
		const planRows = () => panel.findAll(".max-h-\\[200px\\] .pcheckbox");
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

async function mountWith(props: Record<string, unknown>) {
	const filter = { ...defaultFilter(), ...(props.filter as object) };
	const { component } = await mountComponent(PlanetSearchFilterPanel, {
		facets: facetCounts([], filter, ctx, indexMaterials([]), []),
		materials: ["FEO", "H2O"],
		maxDaily: { FEO: 44.1 },
		empires,
		empireUuid: empires[0].uuid,
		showPlans: true,
		planetNames: {},
		...props,
		filter,
		"onUpdate:filter": () => {},
	});
	return component as VueWrapper;
}

const selectByLabel = (panel: VueWrapper, label: string) =>
	panel
		.findAllComponents(PSelect)
		.find((s) => s.attributes("aria-label") === label)!;

describe("PlanetSearchFilterPanel materials", () => {
	const twoGroups: Partial<PlanetSearchFilter> = {
		materialGroups: [
			{ op: "any", materials: ["FEO"] },
			{ op: "all", materials: ["H2O", "FEO"] },
		],
		minDaily: { FEO: 3, H2O: 1 },
	};

	it("sets, replaces and clears the minimum of a material", async () => {
		const panel = await mountWith({ filter: twoGroups });
		const inputs = panel.findAllComponents(PInputNumber);
		// FEO of group 1, H2O and FEO of group 2
		expect(inputs.map((i) => i.props("value"))).toEqual([3, 1, 3]);

		inputs[1].vm.$emit("update:value", 12.5);
		expect(lastFilter(panel).minDaily).toEqual({ FEO: 3, H2O: 12.5 });

		// empty field and zero both drop the minimum
		inputs[1].vm.$emit("update:value", null);
		expect(lastFilter(panel).minDaily).toEqual({ FEO: 3 });
		inputs[0].vm.$emit("update:value", 0);
		expect(lastFilter(panel).minDaily).toEqual({ H2O: 1 });
	});

	it("shows the minimum as 0 for a material without one", async () => {
		const panel = await mountWith({
			filter: { materialGroups: [{ op: "any", materials: ["H2O"] }] },
		});
		expect(panel.findComponent(PInputNumber).props("value")).toBe(0);
	});

	it("joins groups and materials with the group operator", async () => {
		const panel = await mountWith({ filter: twoGroups });
		// the group separator follows groupsOp (default all), the material
		// separator the group's own op (all in the second)
		expect(panel.find("div.uppercase").text()).toBe(
			"planet_search.materials.and"
		);
		expect(panel.find("div.text-xs.text-muted").text()).toBe(
			"planet_search.materials.and"
		);
		const either = await mountWith({
			filter: { ...twoGroups, groupsOp: "any" },
		});
		expect(either.find("div.uppercase").text()).toBe(
			"planet_search.materials.or"
		);
	});

	it("uses 'or' between the materials of an any-group", async () => {
		const panel = await mountWith({
			filter: {
				materialGroups: [{ op: "any", materials: ["FEO", "H2O"] }],
			},
		});
		expect(panel.find("div.text-xs.text-muted").text()).toBe(
			"planet_search.materials.or"
		);
	});

	it("edits only the group it belongs to", async () => {
		const panel = await mountWith({ filter: twoGroups });
		const second = panel.findAll('[role="group"]')[2];
		expect(second.attributes("aria-label")).toBe(
			"planet_search.materials.group_op_label"
		);
		await second
			.findAll("button")
			.find((b) => b.text() === "planet_search.materials.any_of")!
			.trigger("click");
		expect(lastFilter(panel).materialGroups).toEqual([
			{ op: "any", materials: ["FEO"] },
			{ op: "any", materials: ["H2O", "FEO"] },
		]);
	});

	it("drops the minimum with the last use of a removed material", async () => {
		const panel = await mountWith({ filter: twoGroups });
		// H2O only lives in the second group
		await panel
			.findAll(
				'button[aria-label="planet_search.materials.remove_material"]'
			)[1]
			.trigger("click");
		const next = lastFilter(panel);
		expect(next.materialGroups[1].materials).toEqual(["FEO"]);
		expect(next.minDaily).toEqual({ FEO: 3 });
	});

	it("offers nothing for a group the facets don't know yet", async () => {
		const filter = { ...defaultFilter(), ...twoGroups };
		const facets = facetCounts([], filter, ctx, [], []);
		// a group was just added, the counts follow with the next search
		facets.materials = [{ FEO: 4 }];
		const panel = await mountWith({ filter: twoGroups, facets });

		const adds = panel
			.findAllComponents(PSelect)
			.filter(
				(s) =>
					s.attributes("aria-label") ===
					"planet_search.materials.add_material_label"
			);
		expect(adds[0].props("options")).toHaveLength(1);
		expect(adds[1].props("options")).toEqual([]);
	});

	it("offers the materials found in that group's facets and adds a pick", async () => {
		const filter = { ...defaultFilter(), ...twoGroups };
		const facets = facetCounts([], filter, ctx, [], []);
		facets.materials = [{ FEO: 4 }, { H2O: 9, FEO: 2 }];
		const panel = await mountWith({
			filter: twoGroups,
			facets,
			materials: ["FEO", "H2O", "ZZZ"],
		});

		const adds = panel
			.findAllComponents(PSelect)
			.filter(
				(s) =>
					s.attributes("aria-label") ===
					"planet_search.materials.add_material_label"
			);
		expect(adds).toHaveLength(2);
		// ZZZ has no count in any group: not offered
		expect(adds[0].props("options")).toEqual([
			{ label: "planet_search.materials.option", value: "FEO" },
		]);
		expect(adds[1].props("options")).toEqual([
			{ label: "planet_search.materials.option", value: "FEO" },
			{ label: "planet_search.materials.option", value: "H2O" },
		]);

		adds[0].vm.$emit("update:value", "FEO");
		// already in the group: unchanged
		expect(lastFilter(panel).materialGroups[0].materials).toEqual(["FEO"]);

		const fresh = await mountWith({
			filter: {
				materialGroups: [{ op: "any", materials: [] }],
			},
			facets: { ...facets, materials: [{ H2O: 1 }] },
		});
		const add = fresh
			.findAllComponents(PSelect)
			.find(
				(s) =>
					s.attributes("aria-label") ===
					"planet_search.materials.add_material_label"
			)!;
		add.vm.$emit("update:value", "H2O");
		expect(lastFilter(fresh).materialGroups[0].materials).toEqual(["H2O"]);
	});

	it("ignores a cleared add select", async () => {
		const panel = await mountWith({});
		const add = panel
			.findAllComponents(PSelect)
			.find(
				(s) =>
					s.attributes("aria-label") ===
					"planet_search.materials.add_material_label"
			)!;
		add.vm.$emit("update:value", null);
		add.vm.$emit("update:value", 7);
		expect(panel.emitted("update:filter")).toBeUndefined();
	});
});

describe("PlanetSearchFilterPanel distance", () => {
	const planUuid = empires[0].plans[2].uuid;

	it("switches the empire", async () => {
		const panel = await mountWith({});
		selectByLabel(panel, "planet_search.distance.empire").vm.$emit(
			"update:value",
			"other-empire"
		);
		expect(panel.emitted("update:empire")).toEqual([["other-empire"]]);
	});

	it("hides the plans without a login, keeping the exchanges", async () => {
		const panel = await mountWith({ showPlans: false });
		expect(panel.text()).not.toContain("planet_search.distance.empire");
		expect(panel.findComponent(PInput).exists()).toBe(false);
		expect(buttonByText(panel, "AI1").exists()).toBe(true);

		// a login line instead, which keeps the visitor on the search
		const line = panel.find("[data-distance-login]");
		expect(line.text()).toContain("planet_search.distance.login_prompt");
		await buttonByText(panel, "planet_search.distance.login").trigger(
			"click"
		);
		expect(openAuth).toHaveBeenCalledWith("login", "planet_search_distance");
	});

	it("shows no login line with a login", async () => {
		const panel = await mountWith({});
		expect(panel.find("[data-distance-login]").exists()).toBe(false);
	});

	it("tells when there is no empire", async () => {
		const panel = await mountWith({ empires: [] });
		expect(panel.text()).toContain("planet_search.distance.no_empires");
		expect(panel.findComponent(PInput).exists()).toBe(false);
	});

	it("shows picked plans as chips that remove them", async () => {
		const panel = await mountWith({
			filter: { references: [{ kind: "plan", planUuid }] },
		});
		const chip = panel.find("span.rounded.border-blue-300\\/60");
		expect(chip.text()).toContain("Base 2");
		await chip
			.find('button[aria-label="planet_search.distance.remove_plan"]')
			.trigger("click");
		expect(lastFilter(panel).references).toEqual([]);
	});

	it("unticks a picked plan and hides its count", async () => {
		const panel = await mountWith({
			filter: { references: [{ kind: "plan", planUuid }] },
		});
		const row = panel.findAll(".max-h-\\[200px\\] > div")[2];
		expect(row.find("input").element.checked).toBe(true);
		// a picked plan has no count next to it
		expect(row.find("span.text-muted").exists()).toBe(false);
		expect(
			panel
				.findAll(".max-h-\\[200px\\] > div")[3]
				.find("span.text-muted")
				.exists()
		).toBe(true);
		await row.find("input").setValue(false);
		expect(lastFilter(panel).references).toEqual([]);
	});

	it("falls back to no plans for an unknown empire", async () => {
		const panel = await mountWith({ empireUuid: "unknown" });
		expect(panel.text()).toContain("planet_search.distance.no_plans");
		expect(panel.findAll(".max-h-\\[200px\\] .pcheckbox")).toHaveLength(0);
	});

	it("matches plans by planet id and treats a cleared query as no filter", async () => {
		const panel = await mountWith({});
		const rows = () => panel.findAll(".max-h-\\[200px\\] .pcheckbox");
		const query = panel.findComponent(PInput);

		query.vm.$emit("update:value", "ab-005");
		await panel.vm.$nextTick();
		expect(rows()).toHaveLength(1);

		query.vm.$emit("update:value", null);
		await panel.vm.$nextTick();
		expect(rows()).toHaveLength(32);
	});

	it("toggles an exchange off and sets the maximum jumps", async () => {
		const panel = await mountWith({
			filter: { references: [{ kind: "cx", code: "AI1" }] },
		});
		const ai1 = buttonByText(panel, "AI1");
		expect(ai1.attributes("aria-pressed")).toBe("true");
		await ai1.trigger("click");
		expect(lastFilter(panel).references).toEqual([]);

		await panel.find('input[type="range"]').setValue(17);
		expect(lastFilter(panel).maxJumps).toBe(17);
	});
});

describe("PlanetSearchFilterPanel conditions", () => {
	it("allows switching a surface off while the other one stays on", async () => {
		const panel = await mountWith({
			filter: { surface: ["rocky", "gaseous"] },
		});
		const rocky = buttonByText(panel, "planet_search.conditions.rocky");
		expect(rocky.attributes("disabled")).toBeUndefined();
		await rocky.trigger("click");
		expect(lastFilter(panel).surface).toEqual(["gaseous"]);
		// the counts show only for what is off
		expect(rocky.find("span.text-muted").exists()).toBe(false);
	});

	it("shows counts for unticked options only", async () => {
		const panel = await mountWith({
			filter: {
				fertile: true,
				cogc: ["WORKFORCE_PIONEERS"],
				infrastructure: ["WAR"],
				acceptedExtras: ["MGC"],
			},
		});
		const hasCount = (text: string) =>
			buttonByText(panel, text).find("span.text-muted").exists();
		expect(hasCount("planet_search.conditions.fertile")).toBe(false);
		expect(hasCount("game.cogc_program.WORKFORCE_PIONEERS")).toBe(false);
		expect(hasCount("game.cogc_program.WORKFORCE_SETTLERS")).toBe(true);
		expect(hasCount("WAR")).toBe(false);
		expect(hasCount("LM")).toBe(true);
		expect(hasCount("MGC")).toBe(false);
		expect(hasCount("BL")).toBe(true);
	});

	it("unticks options again", async () => {
		const panel = await mountWith({
			filter: {
				fertile: true,
				cogc: ["WORKFORCE_PIONEERS"],
				infrastructure: ["WAR"],
				acceptedExtras: ["MGC"],
			},
		});
		await buttonByText(panel, "planet_search.conditions.fertile").trigger(
			"click"
		);
		expect(lastFilter(panel).fertile).toBe(false);
		await buttonByText(panel, "MGC").trigger("click");
		expect(lastFilter(panel).acceptedExtras).toEqual([]);
		await buttonByText(panel, "WAR").trigger("click");
		expect(lastFilter(panel).infrastructure).toEqual([]);
	});
});
