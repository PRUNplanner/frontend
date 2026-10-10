import { describe, it, expect } from "vitest";
import { defineComponent, h, ref } from "vue";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { currentlyOpenId } from "@/ui/stateCurrentOpen";
import { mountComponent } from "@/tests/mountComponent";

const OPTIONS = [
	{ label: "Alpha", value: "a" },
	{ label: "Beta", value: "b" },
	{ label: "Gamma", value: 3 },
	{ label: "alphabet", value: "ab" },
];

const body = () => new DOMWrapper(document.body);
// option rows in the teleported dropdown
const shown = () =>
	body()
		.findAll(".z-5000 .grow")
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
		// a fresh array: the component mutates its prop in place
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
		.findAll(".z-5000 .grow")
		.find((e) => e.text() === label);
	expect(row, `option ${label}`).toBeDefined();
	await row!.trigger("click");
	await flushPromises();
}

describe("PSelectMultiple", () => {
	it("shows selected values as tags in value order, skipping unknown values", async () => {
		const { wrapper } = await mountSelect(["b", "zzz", 3]);
		const tags = wrapper
			.findAll(".flex-wrap > div")
			.map((t) => t.text());
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
		const input = body().find(".z-5000 input");

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

		expect(picked).toEqual([
			["a"],
			["a", 3],
			["a", 3, "ab"],
			[3, "ab"],
		]);
	});

	it("picks the highlighted entry of the filtered list from the search input", async () => {
		const { wrapper, picked } = await mountSelect();
		await key(wrapper, "Enter");
		const input = body().find(".z-5000 input");
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

	it("focuses the search input when a searchable select opens", async () => {
		const { wrapper } = await mountSelect();
		document.body.appendChild(wrapper.element);
		await key(wrapper, "Enter");
		expect(document.activeElement).toBe(
			body().find(".z-5000 input").element
		);
	});

	it("clears all values and the search", async () => {
		const { wrapper, picked } = await mountSelect(["a", "b"]);
		await openByClick(wrapper);
		const input = body().find(".z-5000 input");
		await input.setValue("gam");
		await flushPromises();
		expect(shown()).toEqual(["Gamma"]);

		await wrapper.find(".text-white\\/60").trigger("click");
		await flushPromises();
		expect(picked).toEqual([[]]);
		expect(shown()).toEqual(["Alpha", "Beta", "Gamma", "alphabet"]);
		expect(wrapper.text()).toContain("common.ui.select.select_options");
		// nothing left to clear
		expect(wrapper.find(".text-white\\/60").exists()).toBe(false);
	});

	it("hides the clear button when not clearable", async () => {
		const { wrapper } = await mountSelect(["a"], { clearable: false });
		expect(wrapper.find(".text-white\\/60").exists()).toBe(false);
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
		const input = body().find(".z-5000 input");
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
		expect(currentlyOpenId.value).toBeNull();
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
		const { wrapper } = await mountComponent(Two);
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
		expect(body().findAll(".z-5000")).toHaveLength(1);

		// unmounting the open select frees the slot
		await wrapper.find("button").trigger("click");
		await flushPromises();
		expect(currentlyOpenId.value).toBeNull();
	});
});
