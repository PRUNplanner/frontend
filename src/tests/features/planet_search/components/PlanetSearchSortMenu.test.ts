import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import PlanetSearchSortMenu from "@/features/planet_search/components/PlanetSearchSortMenu.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";
import { PSelect } from "@/ui";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";

const results = [
	{ resources: [{ material_ticker: "AR" }, { material_ticker: "FEO" }] },
] as PlanetSearchIndexEntry[];

const body = <T extends Element>(selector: string) =>
	[...document.body.querySelectorAll<T>(selector)];

async function openMenu(props: Record<string, unknown> = {}) {
	const { component } = await mountComponent(PlanetSearchSortMenu, {
		sorts: [
			{ key: "ref:cx:NC1", dir: "asc" },
			{ key: "mat:FEO", dir: "desc" },
		],
		view: "matrix",
		results,
		filter: defaultFilter(),
		hiddenColumns: ["fert", "AI1"],
		hiddenMaterials: ["AR"],
		defaultSort: { key: "name", dir: "asc" },
		refName: (r: { kind: string; code?: string }) =>
			r.kind === "cx" ? r.code : "ref",
		...props,
	});
	const menu = component as VueWrapper;
	await menu.find("button").trigger("click");
	await flushPromises();
	return menu;
}

describe("PlanetSearchSortMenu", () => {
	it("sets the direction and removes keys", async () => {
		const menu = await openMenu();

		// one ▲/▼ pair per key, then the remove buttons
		body<HTMLButtonElement>('button[aria-label="planet_search.sort.asc"]')[1].click();
		expect(menu.emitted("sort")![0]).toEqual([
			[
				{ key: "ref:cx:NC1", dir: "asc" },
				{ key: "mat:FEO", dir: "asc" },
			],
		]);

		body<HTMLButtonElement>('button[aria-label="planet_search.sort.remove"]')[0].click();
		expect(menu.emitted("sort")![1]).toEqual([[{ key: "mat:FEO", dir: "desc" }]]);

		expect(body(".pselect").length).toBe(1);
	});

	it("offers only shown columns that aren't sorted yet", async () => {
		const menu = await openMenu();
		const options = (
			menu.findComponent(PSelect).props("options") as { label: string }[]
		).map((o) => o.label);
		// no fert, AI1 or the hidden AR; NC1 and FEO are already in the chain
		expect(options).toEqual(["planet_search.results.planet", "CI1", "IC1"]);
	});

	it("stays open while picking columns, closes on a click away", async () => {
		const menu = await openMenu();
		const open = () =>
			body("h3").some((h) => h.textContent === "planet_search.sort.title");
		expect(open()).toBe(true);

		// pick in the teleported "then by" list
		const select = body<HTMLElement>(".pselect")[0];
		select.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
		await flushPromises();
		const option = body<HTMLElement>("[data-pselect-dropdown] .grow")
			.find((o) => o.textContent?.trim() === "CI1")!;
		option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		option.click();
		await flushPromises();
		expect(menu.emitted("sort")!.at(-1)![0]).toContainEqual({ key: "ref:cx:CI1", dir: "asc" });
		expect(open()).toBe(true);

		document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		await flushPromises();
		expect(open()).toBe(false);
	});

	it("removes the last key and shows the default order", async () => {
		const menu = await openMenu({ sorts: [{ key: "mat:FEO", dir: "desc" }] });
		body<HTMLButtonElement>('button[aria-label="planet_search.sort.remove"]')[0].click();
		expect(menu.emitted("sort")![0]).toEqual([[]]);

		const empty = await openMenu({ sorts: [] });
		expect(document.body.textContent).toContain("planet_search.sort.default");
		expect(empty.findComponent(PSelect).exists()).toBe(true);
	});

	it("the trigger toggles, Escape spares an open dropdown", async () => {
		const menu = await openMenu();
		const open = () =>
			body("h3").some((h) => h.textContent === "planet_search.sort.title");
		const trigger = menu.find("button");

		await trigger.trigger("click");
		expect(open()).toBe(false);
		await trigger.trigger("click");
		await flushPromises();
		expect(open()).toBe(true);

		const select = () => body<HTMLElement>(".pselect")[0];
		const key = (k: string) =>
			select().dispatchEvent(
				new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })
			);

		// list open: Escape only closes the list
		key("Enter");
		await flushPromises();
		expect(body("[data-pselect-dropdown]")).toHaveLength(1);
		key("Escape");
		await flushPromises();
		expect(body("[data-pselect-dropdown]")).toHaveLength(0);
		expect(open()).toBe(true);

		// no list: Escape closes the menu
		key("Escape");
		await flushPromises();
		expect(open()).toBe(false);
	});
});
