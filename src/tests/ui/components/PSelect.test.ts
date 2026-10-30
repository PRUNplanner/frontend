import { describe, it, expect, vi } from "vitest";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent } from "@/tests/mountComponent";

const GROUPED = [
	{
		label: "Popular",
		value: "POPULAR",
		children: [
			{
				label: "CHP (Chemical plant)",
				value: "POPULAR#CHP",
				badge: "58 %",
			},
		],
	},
	{
		label: "All",
		value: "ALL",
		children: [
			{ label: "AML (Alloy smelter)", value: "AML" },
			{ label: "CHP (Chemical plant)", value: "CHP" },
		],
	},
];

const body = () => new DOMWrapper(document.body);
const listOpen = () => body().find(".pselect-list").exists();
// an Esc on the page: claimed (prevented) only while a layer, e.g. the list, is open
function escClaimed(): boolean {
	const event = new KeyboardEvent("keydown", {
		key: "Escape",
		bubbles: true,
		cancelable: true,
	});
	document.body.dispatchEvent(event);
	return event.defaultPrevented;
}

const highlighted = () => body().find(".pselect-list .bg-selected");

async function mountSelect(options: unknown[]) {
	const picked: unknown[] = [];
	const mounted = await mountComponent(PSelect, {
		value: undefined,
		options,
		searchable: true,
		"onUpdate:value": (v: unknown) => picked.push(v),
	});
	return { ...mounted, picked };
}

async function key(wrapper: VueWrapper, name: string) {
	await wrapper.find('[role="combobox"]').trigger("keydown", { key: name });
	await flushPromises();
}

describe("PSelect", () => {
	it("moves through group children, not headers, and picks with Enter", async () => {
		const { wrapper, picked } = await mountSelect(GROUPED);

		await key(wrapper, "ArrowDown");
		expect(highlighted().text()).toContain("CHP");
		expect(highlighted().text()).toContain("58 %");

		await key(wrapper, "ArrowDown");
		expect(highlighted().text()).toContain("AML");
		await key(wrapper, "ArrowDown");
		await key(wrapper, "ArrowDown");
		// stops at the last entry
		expect(highlighted().text()).toContain("CHP (Chemical plant)");
		expect(highlighted().text()).not.toContain("58 %");

		await key(wrapper, "Enter");
		expect(picked).toEqual(["CHP"]);
	});

	it("searches by label, not badge, in both groups", async () => {
		const { wrapper, picked } = await mountSelect(GROUPED);
		await key(wrapper, "ArrowDown");

		await wrapper.find("input").setValue("chp");
		await flushPromises();
		const entries = body()
			.findAll(".pselect-list .pl-3.grow")
			.map((e) => e.text());
		expect(entries).toEqual([
			"CHP (Chemical plant)",
			"CHP (Chemical plant)",
		]);

		await wrapper.find("input").setValue("58");
		await flushPromises();
		expect(body().text()).toContain("common.ui.select.no_results");

		await wrapper.find("input").setValue("chp");
		await flushPromises();
		await key(wrapper, "ArrowDown");
		await key(wrapper, "Enter");
		expect(picked).toEqual(["CHP"]);
	});

	it("keeps keyboard picking for flat options", async () => {
		const { wrapper, picked } = await mountSelect([
			{ label: "A", value: "a" },
			{ label: "B", value: "b" },
		]);

		await key(wrapper, "ArrowDown");
		expect(highlighted().text()).toBe("A");
		await key(wrapper, "ArrowDown");
		await key(wrapper, "Enter");
		expect(picked).toEqual(["b"]);
	});

	it("lists an exact ticker first, then prefixes, then other matches", async () => {
		const { wrapper, picked } = await mountSelect([
			{ label: "CLF (Textile Manufacturing)", value: "CLF" },
			{ label: "EXTX (Prefix)", value: "EXTX" },
			{ label: "EXT (Extractor)", value: "EXT" },
		]);
		await key(wrapper, "ArrowDown");

		await wrapper.find("input").setValue("EXT");
		await flushPromises();
		const entries = body()
			.findAll('.pselect-list [role="option"]')
			.map((e) => e.text());
		expect(entries).toEqual([
			"EXT (Extractor)",
			"EXTX (Prefix)",
			"CLF (Textile Manufacturing)",
		]);

		await key(wrapper, "Enter");
		expect(picked).toEqual(["EXT"]);
	});

	it("puts the group with the best match first", async () => {
		const { wrapper } = await mountSelect([
			{
				label: "Popular",
				value: "POPULAR",
				children: [
					{ label: "CLF (Textile Manufacturing)", value: "P#CLF" },
				],
			},
			{
				label: "All",
				value: "ALL",
				children: [
					{ label: "CLF (Textile Manufacturing)", value: "CLF" },
					{ label: "EXT (Extractor)", value: "EXT" },
				],
			},
		]);
		await key(wrapper, "ArrowDown");

		await wrapper.find("input").setValue("ext");
		await flushPromises();
		const entries = body()
			.findAll(".pselect-list .pl-3.grow")
			.map((e) => e.text());
		expect(entries).toEqual([
			"EXT (Extractor)",
			"CLF (Textile Manufacturing)",
			"CLF (Textile Manufacturing)",
		]);
	});

	it("takes Esc as the top layer while open and releases it however it closes", async () => {
		const { wrapper } = await mountSelect([
			{ label: "A", value: "a" },
			{ label: "B", value: "b" },
		]);
		// focus only lands on elements in the document
		document.body.appendChild(wrapper.element);

		// an open list keeps Esc from the modal or drawer around it
		await key(wrapper, "ArrowDown");
		expect(listOpen()).toBe(true);
		expect(escClaimed()).toBe(true);
		await flushPromises();
		expect(listOpen()).toBe(false);
		expect(document.activeElement).toBe(
			wrapper.find('[role="combobox"]').element
		);
		expect(escClaimed()).toBe(false);

		await key(wrapper, "ArrowDown");
		await key(wrapper, "Enter");
		expect(listOpen()).toBe(false);
		expect(escClaimed()).toBe(false);

		await key(wrapper, "ArrowDown");
		document.body.click();
		await flushPromises();
		expect(listOpen()).toBe(false);
		expect(escClaimed()).toBe(false);
	});

	it("is a combobox controlling a listbox of options", async () => {
		const { wrapper } = await mountSelect(GROUPED);
		const combobox = wrapper.find('[role="combobox"]');
		expect(combobox.attributes("aria-controls")).toBeUndefined();

		await key(wrapper, "ArrowDown");
		const listbox = body().find("[role=listbox]");
		const options = listbox.findAll("[role=option]");

		expect(combobox.attributes("aria-expanded")).toBe("true");
		expect(combobox.attributes("aria-controls")).toBe(
			listbox.attributes("id")
		);
		expect(options.map((o) => o.text().replace(/\s+/g, " "))).toEqual([
			"CHP (Chemical plant)58 %",
			"AML (Alloy smelter)",
			"CHP (Chemical plant)",
		]);
		// groups are labelled by their header, not options themselves
		expect(listbox.findAll("[role=group]")).toHaveLength(2);
		expect(combobox.attributes("aria-activedescendant")).toBe(
			options[0].attributes("id")
		);

		await key(wrapper, "ArrowDown");
		expect(combobox.attributes("aria-activedescendant")).toBe(
			options[1].attributes("id")
		);
		expect(options.map((o) => o.attributes("aria-selected"))).toEqual([
			"false",
			"false",
			"false",
		]);
	});

	it("opens the list at least as wide as the select", async () => {
		const width = vi
			.spyOn(HTMLElement.prototype, "offsetWidth", "get")
			.mockReturnValue(240);
		const { wrapper } = await mountSelect([{ label: "A", value: "a" }]);

		await key(wrapper, "ArrowDown");
		const list = body().find(".pselect-list");
		expect((list.element as HTMLElement).style.minWidth).toBe("240px");
		width.mockRestore();
	});

	it("renders and moves through options with repeated or missing values", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const options = [
			{ label: "A", value: "x" },
			{ label: "B", value: "x" },
			{ label: "C", value: undefined },
			{ label: "D", value: undefined },
			{
				label: "Group",
				value: "g",
				children: [
					{ label: "E", value: "x" },
					{ label: "F", value: "x" },
				],
			},
		];
		const { wrapper, setProps } = await mountSelect(options);

		const seen: string[] = [];
		for (let i = 0; i < 6; i++) {
			await key(wrapper, "ArrowDown");
			seen.push(highlighted().text());
		}
		expect(seen).toEqual(["A", "B", "C", "D", "E", "F"]);

		// an update of the open list patches by key
		await setProps({ options: [...options].reverse() });
		expect(
			body()
				.findAll(".pselect-list .grow")
				.map((o) => o.text())
		).toEqual(["E", "F", "D", "C", "B", "A"]);
		expect(warn.mock.calls.flat().join(" ")).not.toContain(
			"Duplicate keys"
		);
		warn.mockRestore();
	});
});
