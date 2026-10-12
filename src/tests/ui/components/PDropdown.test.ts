import { afterEach, describe, expect, it, vi } from "vitest";
import {
	DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
} from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

import { createI18n } from "vue-i18n";

import PDropdown from "@/ui/components/PDropdown.vue";
import PModal from "@/ui/components/PModal.vue";
import type { PDropdownOption } from "@/ui/ui.types";

enableAutoUnmount(afterEach);

const OPTIONS: PDropdownOption[] = [
	{ key: "clone", label: "Clone", icon: () => h("svg") },
	{ key: "share", label: "Share" },
	{ type: "divider" },
	{ key: "reload", label: "Reload", hint: "Discards changes" },
	{ key: "delete", label: "Delete", danger: true },
];

const body = () => new DOMWrapper(document.body);
const menu = () => body().find<HTMLElement>("[role=menu]");
const items = () => body().findAll<HTMLElement>("[role=menuitem]");
const activeLabel = () => {
	const id = menu().attributes("aria-activedescendant");
	return id ? document.getElementById(id)!.textContent!.trim() : undefined;
};
const key = (k: string, target: Element = menu().element) =>
	target.dispatchEvent(
		new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })
	);

function mountDropdown(props: Record<string, unknown> = {}) {
	const show = ref(false);
	const onSelect = vi.fn();
	const wrapper = mount(
		defineComponent({
			setup: () => () =>
				h("div", [
					h(
						PDropdown,
						{
							show: show.value,
							"onUpdate:show": (v: boolean) => (show.value = v),
							onSelect,
							options: OPTIONS,
							...props,
						},
						props.anchor
							? undefined
							: () => h("button", { id: "trigger" }, "More")
					),
					h("p", { id: "outside" }, "page"),
				]),
		}),
		{ attachTo: document.body }
	);
	const trigger = () => wrapper.find<HTMLElement>("#trigger");
	return { wrapper, show, onSelect, trigger };
}

describe("PDropdown", () => {
	afterEach(() => vi.useRealTimers());

	it("renders items, a divider, an icon column, a hint and a danger item", async () => {
		const { show } = mountDropdown();
		show.value = true;
		await flushPromises();

		expect(items().map((i) => i.text())).toEqual([
			"Clone",
			"Share",
			"ReloadDiscards changes",
			"Delete",
		]);
		expect(body().find("[role=separator]").exists()).toBe(true);
		// one icon makes room for icons in every row
		expect(items()[1].find("span").classes()).toContain("w-9");
		expect(items()[3].classes()).toContain("text-negative");
		expect(items()[0].classes()).toContain("h-[34px]");
		expect(items()[2].classes()).not.toContain("h-[34px]");
	});

	it("opens on click with the menu focused and nothing highlighted", async () => {
		const { trigger } = mountDropdown();
		trigger().element.focus();
		await trigger().trigger("click");
		await flushPromises();

		expect(trigger().attributes("aria-expanded")).toBe("true");
		expect(document.activeElement).toBe(menu().element);
		expect(activeLabel()).toBeUndefined();
	});

	it("moves with the arrows, Home and End, selects with Enter and returns focus", async () => {
		const { trigger, show, onSelect } = mountDropdown();
		trigger().element.focus();
		key("ArrowDown", trigger().element);
		await flushPromises();
		expect(show.value).toBe(true);
		expect(activeLabel()).toBe("Clone");

		key("ArrowDown");
		await flushPromises();
		expect(activeLabel()).toBe("Share");
		key("End");
		await flushPromises();
		expect(activeLabel()).toBe("Delete");
		key("ArrowDown");
		await flushPromises();
		expect(activeLabel()).toBe("Clone");
		key("ArrowUp");
		await flushPromises();
		expect(activeLabel()).toBe("Delete");
		key("Home");
		key("ArrowDown");
		await flushPromises();

		key("Enter");
		await flushPromises();
		expect(onSelect).toHaveBeenCalledWith("share");
		expect(show.value).toBe(false);
		expect(document.activeElement).toBe(trigger().element);
	});

	it("closes on Esc with the focus back on the trigger", async () => {
		const { trigger, show } = mountDropdown();
		trigger().element.focus();
		await trigger().trigger("click");
		await flushPromises();

		key("Escape");
		await flushPromises();
		expect(show.value).toBe(false);
		expect(document.activeElement).toBe(trigger().element);
	});

	it("a pick that opens a modal gets the focus back after the modal", async () => {
		const modal = ref(false);
		const wrapper = mount(
			{
				setup: () => () =>
					h("div", [
						// before the menu, so its update runs first
						h(
							PModal,
							{
								show: modal.value,
								"onUpdate:show": (v: boolean) => (modal.value = v),
								title: "Save as",
							},
							() => h("input")
						),
						h(
							PDropdown,
							{ options: OPTIONS, onSelect: () => (modal.value = true) },
							() => h("button", { id: "trigger" }, "More")
						),
					]),
			},
			{
				attachTo: document.body,
				global: {
					plugins: [
						createI18n({ legacy: false, locale: "en_US", messages: {} }),
					],
				},
			}
		);
		const trigger = wrapper.find<HTMLElement>("#trigger").element;
		trigger.focus();
		key("ArrowDown", trigger);
		await flushPromises();
		key("Enter");
		await flushPromises();
		expect(modal.value).toBe(true);

		key("Escape", document.activeElement!);
		await flushPromises();
		expect(modal.value).toBe(false);
		expect(document.activeElement).toBe(trigger);
	});

	it("selects on click and highlights on hover", async () => {
		const { show, onSelect } = mountDropdown();
		show.value = true;
		await flushPromises();

		await items()[3].trigger("mouseenter");
		expect(items()[3].classes()).toContain("before:bg-white/8");
		await items()[3].trigger("click");
		expect(onSelect).toHaveBeenCalledWith("delete");
		expect(show.value).toBe(false);
	});

	it("hover: opens on enter, click and focus, closes after leaving", async () => {
		vi.useFakeTimers();
		const { trigger, show, onSelect } = mountDropdown({ trigger: "hover" });

		await trigger().trigger("mouseover");
		expect(show.value).toBe(true);
		await flushPromises();
		// a hover doesn't take the focus
		expect(document.activeElement).not.toBe(menu().element);

		await trigger().trigger("mouseout");
		await menu().trigger("mouseenter");
		vi.advanceTimersByTime(200);
		expect(show.value).toBe(true);
		await menu().trigger("mouseleave");
		vi.advanceTimersByTime(100);
		expect(show.value).toBe(false);
		await flushPromises();

		await trigger().trigger("click");
		expect(show.value).toBe(true);
		show.value = false;
		await flushPromises();

		trigger().element.focus();
		await flushPromises();
		expect(show.value).toBe(true);

		// a keyboard pick returns the focus without opening it again
		key("ArrowDown", trigger().element);
		await flushPromises();
		key("Enter");
		await flushPromises();
		expect(onSelect).toHaveBeenCalledWith("clone");
		expect(document.activeElement).toBe(trigger().element);
		expect(show.value).toBe(false);
	});

	it("manual with an anchor: no trigger, closes on a click outside", async () => {
		const anchor = document.createElement("button");
		document.body.appendChild(anchor);
		const { wrapper, show } = mountDropdown({ trigger: "manual", anchor });
		show.value = true;
		await flushPromises();
		expect(menu().exists()).toBe(true);

		wrapper
			.find("#outside")
			.element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		await flushPromises();
		expect(show.value).toBe(false);
		anchor.remove();
	});
});
