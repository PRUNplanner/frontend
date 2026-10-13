import { describe, it, expect } from "vitest";
import { defineComponent, h, ref } from "vue";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { mountComponent } from "@/tests/mountComponent";

const OPTIONS = [
	{ label: "Alpha", value: "a" },
	{ label: "Beta", value: "b" },
	{ label: "Gamma", value: 3 },
	{ label: "alphabet", value: "ab" },
];

const body = () => new DOMWrapper(document.body);

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
// option rows in the teleported dropdown
const shown = () =>
	body()
		.findAll(".pselect-list .grow")
		.map((e) => e.text());
const isOpen = (wrapper: VueWrapper) =>
	wrapper.find('[role="combobox"]').attributes("aria-expanded") === "true";

/**
 * Mounts with the emitted value written back as the prop, like a v-model
 * parent. `picked` holds every `update:value` payload.
 */
async function mountSelect(
	value: Array<string | number | undefined> = [],
	props: Record<string, unknown> = {}
) {
	const picked: unknown[][] = [];
	let sync: (v: unknown[]) => Promise<void> = async () => {};
	const mounted = await mountComponent(PSelectMultiple, {
		value: [...value],
		options: OPTIONS.map((o) => ({ ...o })),
		searchable: true,
		...props,
		"onUpdate:value": (v: unknown[]) => {
			picked.push([...v]);
			void sync(v);
		},
	});
	sync = (v) => mounted.setProps({ value: v });
	return { ...mounted, picked };
}

async function key(wrapper: VueWrapper, name: string) {
	await wrapper.find('[role="combobox"]').trigger("keydown", { key: name });
	await flushPromises();
}

async function openByClick(wrapper: VueWrapper) {
	await wrapper.find(".cursor-pointer").trigger("click");
	await flushPromises();
}

async function clickOption(label: string) {
	const row = body()
		.findAll(".pselect-list .grow")
		.find((e) => e.text() === label);
	expect(row, `option ${label}`).toBeDefined();
	await row!.trigger("click");
	await flushPromises();
}

describe("PSelectMultiple", () => {
	it("shows selected values as tags in value order, skipping unknown values", async () => {
		const { wrapper } = await mountSelect(["b", "zzz", 3]);
		const tags = wrapper.findAll(".flex-wrap > div").map((t) => t.text());
		expect(tags).toEqual(["Beta", "Gamma"]);
		expect(wrapper.text()).not.toContain("common.ui.select.select_options");
	});

	it("resolves tag labels of group children", async () => {
		const { wrapper } = await mountSelect(["c2"], {
			options: [
				{
					label: "Group",
					value: "G",
					children: [
						{ label: "Child one", value: "c1" },
						{ label: "Child two", value: "c2" },
					],
				},
			],
		});
		expect(wrapper.find(".flex-wrap").text()).toBe("Child two");
	});

	it("adds and removes values by clicking options", async () => {
		const { wrapper, picked } = await mountSelect(["b"]);
		await openByClick(wrapper);
		expect(shown()).toEqual(["Alpha", "Beta", "Gamma", "alphabet"]);

		await clickOption("Gamma");
		await clickOption("Alpha");
		await clickOption("Beta");
		expect(picked).toEqual([
			["b", 3],
			["b", 3, "a"],
			[3, "a"],
		]);
		// selecting keeps the dropdown open
		expect(isOpen(wrapper)).toBe(true);
	});

	it("refuses to add beyond maxItems", async () => {
		const { wrapper, picked } = await mountSelect(["a"], { maxItems: 2 });
		await openByClick(wrapper);

		await clickOption("Beta");
		await clickOption("Gamma");
		expect(picked).toEqual([["a", "b"]]);
	});

	it("filters options case-insensitively while typing", async () => {
		const { wrapper } = await mountSelect();
		await openByClick(wrapper);
		const input = body().find(".pselect-list input");

		await input.setValue("ALPHA");
		await flushPromises();
		expect(shown()).toEqual(["Alpha", "alphabet"]);

		await input.setValue("et");
		await flushPromises();
		expect(shown()).toEqual(["Beta", "alphabet"]);

		await input.setValue("xyz");
		await flushPromises();
		expect(shown()).toEqual([]);
		expect(body().text()).toContain("common.ui.select.no_results");

		await input.setValue("");
		await flushPromises();
		expect(shown()).toEqual(["Alpha", "Beta", "Gamma", "alphabet"]);
	});

	it("opens with Enter, Space and ArrowDown, but not other keys", async () => {
		for (const name of ["Enter", " ", "ArrowDown"]) {
			const { wrapper } = await mountSelect();
			await key(wrapper, "a");
			expect(isOpen(wrapper)).toBe(false);
			await key(wrapper, name);
			expect(isOpen(wrapper), name).toBe(true);
			wrapper.unmount();
		}
	});

	it("moves with arrow keys, clamps at both ends and toggles with Enter", async () => {
		const { wrapper, picked } = await mountSelect();
		await key(wrapper, "ArrowDown"); // opens, highlight on the first option

		await key(wrapper, "Enter");
		await key(wrapper, "ArrowDown");
		await key(wrapper, "ArrowDown");
		await key(wrapper, "Enter");
		for (let i = 0; i < 5; i++) await key(wrapper, "ArrowDown");
		await key(wrapper, "Enter"); // clamped to the last option
		for (let i = 0; i < 5; i++) await key(wrapper, "ArrowUp");
		await key(wrapper, "Enter"); // clamped to the first, deselects it

		expect(picked).toEqual([["a"], ["a", 3], ["a", 3, "ab"], [3, "ab"]]);
	});

	it("picks the highlighted entry of the filtered list from the search input", async () => {
		const { wrapper, picked } = await mountSelect();
		await key(wrapper, "Enter");
		const input = body().find(".pselect-list input");
		await input.setValue("alpha");
		await flushPromises();

		await input.trigger("keydown", { key: "ArrowDown" });
		await input.trigger("keydown", { key: "Enter" });
		await flushPromises();
		expect(picked).toEqual([["ab"]]);
	});

	it("closes on Escape and returns focus to the select", async () => {
		const { wrapper } = await mountSelect([], { searchable: false });
		// focus only lands on elements in the document
		document.body.appendChild(wrapper.element);
		const combobox = wrapper.find('[role="combobox"]');
		await key(wrapper, "Enter");
		expect(isOpen(wrapper)).toBe(true);

		await key(wrapper, "Escape");
		expect(isOpen(wrapper)).toBe(false);
		expect(shown()).toEqual([]);
		expect(document.activeElement).toBe(combobox.element);
	});

	it("takes Esc as the top layer while open and releases it however it closes", async () => {
		const { wrapper } = await mountSelect([], { searchable: false });

		// an open list keeps Esc from the modal or drawer around it
		await key(wrapper, "Enter");
		expect(escClaimed()).toBe(true);
		await flushPromises();
		expect(escClaimed()).toBe(false);

		await openByClick(wrapper);
		document.body.click();
		await flushPromises();
		expect(escClaimed()).toBe(false);
	});

	it("focuses the search input when a searchable select opens", async () => {
		const { wrapper } = await mountSelect();
		document.body.appendChild(wrapper.element);
		await key(wrapper, "Enter");
		expect(document.activeElement).toBe(
			body().find(".pselect-list input").element
		);
	});

	it("clears all values and the search", async () => {
		const { wrapper, picked } = await mountSelect(["a", "b"], {
			clearable: true,
		});
		await openByClick(wrapper);
		const input = body().find(".pselect-list input");
		await input.setValue("gam");
		await flushPromises();
		expect(shown()).toEqual(["Gamma"]);

		await wrapper.find(".text-muted.w-4").trigger("click");
		await flushPromises();
		expect(picked).toEqual([[]]);
		expect(shown()).toEqual(["Alpha", "Beta", "Gamma", "alphabet"]);
		expect(wrapper.text()).toContain("common.ui.select.select_options");
		// nothing left to clear
		expect(wrapper.find(".text-muted.w-4").exists()).toBe(false);
	});

	it("hides the clear button when not clearable", async () => {
		const { wrapper } = await mountSelect(["a"], { clearable: false });
		expect(wrapper.find(".text-muted.w-4").exists()).toBe(false);
	});

	it("removes a single value through its tag without opening", async () => {
		const { wrapper, picked } = await mountSelect(["a", 3, "b"]);
		const gammaTag = wrapper
			.findAll(".flex-wrap > div")
			.find((t) => t.text() === "Gamma")!;
		await gammaTag.find("svg").trigger("click");
		await flushPromises();

		expect(picked).toEqual([["a", "b"]]);
		expect(isOpen(wrapper)).toBe(false);
	});

	it("ignores clicks, keys and tag removal when disabled", async () => {
		const { wrapper, picked } = await mountSelect(["a"], {
			disabled: true,
		});
		await openByClick(wrapper);
		await key(wrapper, "Enter");
		expect(isOpen(wrapper)).toBe(false);

		await wrapper.find(".flex-wrap svg").trigger("click");
		await flushPromises();
		expect(picked).toEqual([]);
	});

	it("closes and resets the search on a click outside, not inside", async () => {
		const { wrapper } = await mountSelect();
		await openByClick(wrapper);
		const input = body().find(".pselect-list input");
		await input.setValue("beta");
		await flushPromises();

		// inside the teleported dropdown
		await input.trigger("click");
		await flushPromises();
		expect(isOpen(wrapper)).toBe(true);

		document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();
		expect(isOpen(wrapper)).toBe(false);

		await openByClick(wrapper);
		expect(shown()).toEqual(["Alpha", "Beta", "Gamma", "alphabet"]);
	});

	it("toggles closed when clicked again", async () => {
		const { wrapper } = await mountSelect();
		await openByClick(wrapper);
		expect(isOpen(wrapper)).toBe(true);
		await openByClick(wrapper);
		expect(isOpen(wrapper)).toBe(false);
		expect(escClaimed()).toBe(false);
	});

	it("keeps only one select open at a time", async () => {
		const Two = defineComponent({
			setup() {
				const show = ref(true);
				return () =>
					h("div", [
						h(PSelectMultiple, {
							class: "first",
							value: [],
							options: OPTIONS,
						}),
						show.value
							? h(PSelectMultiple, {
									class: "second",
									value: [],
									options: OPTIONS,
								})
							: null,
						h("button", { onClick: () => (show.value = false) }),
					]);
			},
		});
		// a click on the other select reaches the document
		const { wrapper } = await mountComponent(Two, {}, { attach: true });
		const first = wrapper.find(".first");
		const second = wrapper.find(".second");
		const expanded = (w: typeof first) => w.attributes("aria-expanded");

		await first.find(".cursor-pointer").trigger("click");
		await flushPromises();
		expect(expanded(first)).toBe("true");

		await second.find(".cursor-pointer").trigger("click");
		await flushPromises();
		expect(expanded(first)).toBe("false");
		expect(expanded(second)).toBe("true");
		expect(body().findAll(".pselect-list")).toHaveLength(1);

		// unmounting the open select releases its layer
		await wrapper.find("button").trigger("click");
		await flushPromises();
		expect(escClaimed()).toBe(false);
	});

	it("removes a value at maxItems", async () => {
		const { wrapper, picked } = await mountSelect(["a", "b"], {
			maxItems: 2,
		});
		await openByClick(wrapper);

		await clickOption("Alpha");
		expect(picked).toEqual([["b"]]);
	});

	it("hides the clear button when disabled", async () => {
		const { wrapper } = await mountSelect(["a"], { disabled: true });
		expect(wrapper.find(".text-muted.w-4").exists()).toBe(false);
	});

	it("never changes the parent's array in place", async () => {
		const value = ["a"];
		const { wrapper } = await mountComponent(PSelectMultiple, {
			value,
			options: OPTIONS,
			"onUpdate:value": () => {},
		});
		await openByClick(wrapper);
		await clickOption("Beta");
		await clickOption("Alpha");
		await wrapper.find(".flex-wrap svg").trigger("click");
		await flushPromises();

		expect(value).toEqual(["a"]);
	});

	it("highlights the keyboard position and resets it on search", async () => {
		const { wrapper } = await mountSelect();
		const highlighted = () => body().find(".pselect-list .bg-selected");
		await key(wrapper, "Enter");
		expect(highlighted().text()).toBe("Alpha");

		await key(wrapper, "ArrowDown");
		await key(wrapper, "ArrowDown");
		expect(highlighted().text()).toBe("Gamma");

		await body().find(".pselect-list input").setValue("alpha");
		await flushPromises();
		expect(highlighted().text()).toBe("Alpha");
	});

	it("filters and picks group children, not the group", async () => {
		const { wrapper, picked } = await mountSelect([], {
			options: [
				{
					label: "Metals",
					value: "G",
					children: [
						{ label: "Xenon", value: "xe" },
						{ label: "Yttrium", value: "y" },
					],
				},
			],
		});
		await key(wrapper, "Enter");
		const input = body().find(".pselect-list input");

		await input.setValue("zzz");
		await flushPromises();
		expect(body().text()).toContain("common.ui.select.no_results");
		expect(body().text()).not.toContain("Xenon");

		await input.setValue("ytt");
		await flushPromises();
		expect(body().text()).toContain("Yttrium");
		expect(body().text()).not.toContain("Xenon");

		await input.trigger("keydown", { key: "Enter" });
		await flushPromises();
		expect(picked).toEqual([["y"]]);
	});
});
