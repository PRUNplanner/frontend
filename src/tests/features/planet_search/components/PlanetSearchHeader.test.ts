import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import PlanetSearchHeader from "@/features/planet_search/components/PlanetSearchHeader.vue";
import PlanetSearchResultsBar from "@/features/planet_search/components/PlanetSearchResultsBar.vue";
import PlanetSearchColumnsMenu from "@/features/planet_search/components/PlanetSearchColumnsMenu.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	activeChips,
	defaultFilter,
} from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { PlanetSearchFilter } from "@/features/planet_search/planetSearch.schemas";

const filter: PlanetSearchFilter = {
	...defaultFilter(),
	fertile: true,
	infrastructure: ["LM"],
};
const saved = [
	{ id: "1", name: "Water", filter: defaultFilter(), view: "list" as const },
];
const refName = () => "ref";

const button = (w: VueWrapper, text: string) =>
	w.findAll("button").find((b) => b.text() === text)!;
const bodyButton = (text: string) =>
	[...document.body.querySelectorAll("button")].find(
		(b) => b.textContent?.trim() === text
	)!;

describe("PlanetSearchHeader", () => {
	it("opens the save field prefilled from the chips", async () => {
		const { component } = await mountComponent(PlanetSearchHeader, {
			filter,
			chips: activeChips(filter),
			saved,
			refName,
		});
		const header = component as VueWrapper;

		await button(header, "planet_search.header.save").trigger("click");
		const input = header.find('input[aria-label="planet_search.header.save_name"]');
		expect((input.element as HTMLInputElement).value).toBe(
			"LM · planet_search.chips.fertile"
		);

		await input.setValue("My search");
		await header.find("form").trigger("submit");
		expect(header.emitted("save")![0]).toEqual(["My search"]);
		expect(header.find("form").exists()).toBe(false);
	});

	it("manages saved searches", async () => {
		const { component } = await mountComponent(PlanetSearchHeader, {
			filter,
			chips: [],
			saved,
			refName,
		});
		const header = component as VueWrapper;

		await button(header, "planet_search.header.manage").trigger("click");
		await flushPromises();

		const rename = document.body.querySelector<HTMLInputElement>(
			'input[aria-label="planet_search.header.rename_label"]'
		)!;
		rename.value = "Wet";
		rename.dispatchEvent(new Event("input"));
		expect(header.emitted("rename")![0]).toEqual([saved[0], "Wet"]);

		bodyButton("planet_search.header.delete").click();
		expect(header.emitted("delete")![0]).toEqual([saved[0]]);

		bodyButton("planet_search.header.load").click();
		expect(header.emitted("load")![0]).toEqual([saved[0]]);

		await button(header, "planet_search.header.copy_link").trigger("click");
		await button(header, "planet_search.header.reset").trigger("click");
		expect(header.emitted("copy")).toHaveLength(1);
		expect(header.emitted("reset")).toHaveLength(1);
	});
});

describe("PlanetSearchHeader actions", () => {
	it("keeps saved searches, save, copy and reset in one group", async () => {
		const { component } = await mountComponent(PlanetSearchHeader, {
			filter,
			chips: [],
			saved,
			refName,
		});
		const header = component as VueWrapper;
		const group = header.find(".ml-auto");

		expect(
			header
				.find('input[aria-label="planet_search.header.search_label"]')
				.exists()
		).toBe(true);
		expect(group.text()).toContain("planet_search.header.saved");
		for (const key of ["manage", "save", "copy_link", "reset"])
			expect(button(group as VueWrapper, `planet_search.header.${key}`)).toBeDefined();

		await button(group as VueWrapper, "planet_search.header.copy_link").trigger("click");
		expect(header.emitted("copy")).toHaveLength(1);
		await button(group as VueWrapper, "planet_search.header.reset").trigger("click");
		expect(header.emitted("reset")).toHaveLength(1);
	});
});

describe("PlanetSearchResultsBar", () => {
	it("shows the name note and applies its relaxations", async () => {
		const relaxed = { ...defaultFilter(), text: "KI-", fertile: true };
		const all = { ...defaultFilter(), text: "KI-" };
		const { component, setProps } = await mountComponent(
			PlanetSearchResultsBar,
			{
				view: "list",
				hiddenColumns: [],
				hiddenMaterials: [],
				count: 1,
				total: 10,
				results: [],
				filter,
				chips: [],
				hints: [],
				nameNote: {
					text: "3 more planets",
					hints: [{ label: "Include gaseous (+2)", filter: relaxed }],
					showAll: { label: "Show all 4", filter: all },
				},
				isDesktop: true,
				sorts: [{ key: "name", dir: "asc" }],
				defaultSort: { key: "name", dir: "asc" },
				refName,
			}
		);
		const bar = component as VueWrapper;
		const note = () => bar.find('[role="status"]');

		expect(note().text()).toContain("3 more planets");
		expect(note().findAll("button")).toHaveLength(2);
		await button(bar, "Include gaseous (+2)").trigger("click");
		expect(bar.emitted("update:filter")![0]).toEqual([relaxed]);
		await button(bar, "Show all 4").trigger("click");
		expect(bar.emitted("update:filter")![1]).toEqual([all]);

		// the region stays for the next announcement, empty
		await setProps({ nameNote: null });
		expect(note().exists()).toBe(true);
		expect(note().text()).toBe("");
	});

	it("removes the right constraint and applies hints", async () => {
		const chips = activeChips(filter);
		const hint = { label: "hint", filter: defaultFilter() };
		const { component } = await mountComponent(PlanetSearchResultsBar, {
			view: "list",
			hiddenColumns: [],
			hiddenMaterials: [],
			count: 0,
			total: 10,
			results: [],
			filter,
			chips,
			hints: [hint],
			nameNote: null,
			isDesktop: true,
			sorts: [{ key: "name", dir: "asc" }],
			defaultSort: { key: "name", dir: "asc" },
			refName,
		});
		const bar = component as VueWrapper;

		const removes = bar.findAll('button[aria-label="planet_search.chips.remove"]');
		expect(removes).toHaveLength(2);
		await removes[0].trigger("click");
		expect(bar.emitted("update:filter")![0]).toEqual([chips[0].remove]);
		expect((chips[0].remove as PlanetSearchFilter).infrastructure).toEqual([]);

		await button(bar, "hint").trigger("click");
		expect(bar.emitted("update:filter")![1]).toEqual([hint.filter]);

		await button(bar, "planet_search.results.matrix").trigger("click");
		expect(bar.emitted("update:view")![0]).toEqual(["matrix"]);
	});
});

describe("PlanetSearchColumnsMenu", () => {
	it("toggles columns and found materials", async () => {
		const results = [
			{ resources: [{ material_ticker: "AR" }, { material_ticker: "FEO" }] },
			{ resources: [{ material_ticker: "O" }] },
		] as PlanetSearchIndexEntry[];
		const { component } = await mountComponent(PlanetSearchColumnsMenu, {
			view: "matrix",
			results,
			filter: {
				...defaultFilter(),
				materialGroups: [{ op: "any", materials: ["FEO"] }],
			},
			hiddenColumns: [],
			hiddenMaterials: [],
		});
		const menu = component as VueWrapper;

		await menu.find("button").trigger("click");
		await flushPromises();

		// 7 columns (no "other" in the matrix) and the 2 unfiltered materials
		const boxes = [...document.body.querySelectorAll<HTMLInputElement>(".pcheckbox input")];
		expect(boxes).toHaveLength(9);

		boxes[0].click();
		expect(menu.emitted("update:hiddenColumns")![0]).toEqual([["fert"]]);

		bodyButton("planet_search.columns.none").click();
		expect(menu.emitted("update:hiddenMaterials")![0]).toEqual([["AR", "O"]]);

		bodyButton("planet_search.columns.reset").click();
		expect(menu.emitted("update:hiddenColumns")!.at(-1)).toEqual([[]]);
	});
});
