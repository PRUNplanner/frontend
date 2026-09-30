import { describe, it, expect } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import PlanetSearchSortMenu from "@/features/planet_search/components/PlanetSearchSortMenu.vue";
import { mountComponent } from "@/tests/mountComponent";
import { defaultFilter } from "@/features/planet_search/planetSearch.engine";
import { PSelect } from "@/ui";
import { NPopover } from "naive-ui";

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
		const popover = () => menu.findComponent(NPopover);
		const clickAt = async (target: Element) => {
			popover().vm.$emit("clickoutside", { target } as unknown as MouseEvent);
			await flushPromises();
		};
		expect(popover().props("show")).toBe(true);

		// a click inside the teleported "then by" dropdown
		menu.findComponent(PSelect).vm.$emit("update:value", "name");
		const dropdown = document.createElement("div");
		dropdown.setAttribute("data-pselect-dropdown", "");
		document.body.appendChild(dropdown);
		await clickAt(dropdown);
		expect(menu.emitted("sort")!.at(-1)![0]).toContainEqual({ key: "name", dir: "asc" });
		expect(popover().props("show")).toBe(true);

		// the picked option is already gone from the page when the click lands
		const option = document.createElement("div");
		await clickAt(option);
		expect(popover().props("show")).toBe(true);
		dropdown.remove();

		await clickAt(document.body);
		expect(popover().props("show")).toBe(false);
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
		const popover = () => menu.findComponent(NPopover);
		const trigger = menu.find("button");

		// clicking the trigger while open: its outside-click is ignored, the click closes
		popover().vm.$emit("clickoutside", { target: trigger.element } as unknown as MouseEvent);
		await flushPromises();
		expect(popover().props("show")).toBe(true);
		await trigger.trigger("click");
		expect(popover().props("show")).toBe(false);
		await trigger.trigger("click");
		expect(popover().props("show")).toBe(true);

		const panel = body<HTMLElement>(".n-popover").find((p) =>
			p.textContent?.includes("planet_search.sort.title")
		)!;
		const escape = () =>
			panel
				.querySelector(".pselect")!
				.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

		// dropdown open: Escape is left to the dropdown
		const dropdown = document.createElement("div");
		dropdown.setAttribute("data-pselect-dropdown", "");
		document.body.appendChild(dropdown);
		escape();
		await flushPromises();
		expect(popover().props("show")).toBe(true);
		dropdown.remove();

		// no dropdown: Escape closes the menu
		escape();
		await flushPromises();
		expect(popover().props("show")).toBe(false);
	});
});
