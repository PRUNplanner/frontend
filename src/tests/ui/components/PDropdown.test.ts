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
import PPopover from "@/ui/components/PPopover.vue";
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
		new KeyboardEvent("keydown", {
			key: k,
			bubbles: true,
			cancelable: true,
		})
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
								"onUpdate:show": (v: boolean) =>
									(modal.value = v),
								title: "Save as",
							},
							() => h("input")
						),
						h(
							PDropdown,
							{
								options: OPTIONS,
								onSelect: () => (modal.value = true),
							},
							() => h("button", { id: "trigger" }, "More")
						),
					]),
			},
			{
				attachTo: document.body,
				global: {
					plugins: [
						createI18n({
							legacy: false,
							locale: "en_US",
							messages: {},
						}),
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
		expect(items()[3].classes()).toContain("before:bg-hover");
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
			.element.dispatchEvent(
				new MouseEvent("mousedown", { bubbles: true })
			);
		await flushPromises();
		expect(show.value).toBe(false);
		anchor.remove();
	});
});

describe("PDropdown items with a state", () => {
	const STATEFUL: PDropdownOption[] = [
		{ type: "group", label: "Width" },
		{
			key: "narrower",
			label: "Narrower",
			disabled: true,
			hint: "At its minimum",
		},
		{ key: "wider", label: "Wider" },
		{ key: "pin", label: "Keep in view", checked: true },
		{ key: "fit", label: "Fit content", checked: false },
	];

	it("heads a group, checks an on/off item and says why one is disabled", async () => {
		const { show } = mountDropdown({ options: STATEFUL });
		show.value = true;
		await flushPromises();

		expect(menu().find("[role=presentation]").text()).toBe("Width");
		const all = body().findAll("[role=menuitem], [role=menuitemcheckbox]");
		expect(all.map((i) => i.attributes("role"))).toEqual([
			"menuitem",
			"menuitem",
			"menuitemcheckbox",
			"menuitemcheckbox",
		]);
		expect(all[0].attributes("aria-disabled")).toBe("true");
		expect(all[0].text()).toContain("At its minimum");
		expect(all[2].attributes("aria-checked")).toBe("true");
		expect(all[2].find("svg").exists()).toBe(true);
		expect(all[3].attributes("aria-checked")).toBe("false");
	});

	it("keeps a disabled item from being picked, by click or key", async () => {
		const { show, onSelect } = mountDropdown({ options: STATEFUL });
		show.value = true;
		await flushPromises();

		await body().find("[aria-disabled=true]").trigger("click");
		key("ArrowDown");
		key("Enter");
		await flushPromises();
		expect(onSelect).not.toHaveBeenCalled();
		expect(show.value).toBe(true);

		key("ArrowDown");
		key("Enter");
		await flushPromises();
		expect(onSelect).toHaveBeenCalledWith("wider");
	});
});

describe("PDropdown rows of buttons", () => {
	const ROWS: PDropdownOption[] = [
		{
			type: "buttons",
			label: "Width · 3 of 12 columns",
			buttons: [
				{ key: "narrower", label: "Narrower", text: "−" },
				{
					key: "wider",
					label: "Wider",
					text: "+",
					disabled: true,
					hint: "Reaches the right edge",
				},
			],
		},
		{
			type: "buttons",
			label: "Height",
			buttons: [
				{
					key: "fit",
					label: "Fit content",
					text: "Fit",
					checked: true,
				},
				{
					key: "cap",
					label: "At most 480 px",
					text: "≤ 480",
					checked: false,
				},
			],
		},
		{ key: "pin", label: "Pin to top", tip: "Stays at the top" },
	];
	const button = (k: string) => body().find<HTMLElement>(`[data-key="${k}"]`);

	it("groups each row, names its buttons and shows the hovered one's reason", async () => {
		const { show } = mountDropdown({ options: ROWS });
		show.value = true;
		await flushPromises();

		const rows = body().findAll("[role=group]");
		expect(rows.map((r) => r.attributes("aria-label"))).toEqual([
			"Width · 3 of 12 columns",
			"Height",
		]);
		expect(button("wider").attributes()).toMatchObject({
			role: "menuitem",
			"aria-disabled": "true",
			"aria-label": "Wider. Reaches the right edge",
		});
		expect(button("fit").attributes()).toMatchObject({
			role: "menuitemradio",
			"aria-checked": "true",
		});
		expect(rows[0].text()).toContain("Width · 3 of 12 columns");
		await button("wider").trigger("mouseenter");
		expect(rows[0].text()).toContain("Reaches the right edge");
		await button("narrower").trigger("mouseenter");
		expect(rows[0].text()).toContain("Narrower");
		// the plain item's explanation is a tooltip, not a second line
		expect(body().find("[role=menuitem][title]").attributes("title")).toBe(
			"Stays at the top"
		);
	});

	it("a button picks and keeps the menu open; an item closes it", async () => {
		const { show, onSelect } = mountDropdown({ options: ROWS });
		show.value = true;
		await flushPromises();

		await button("narrower").trigger("click");
		await button("wider").trigger("click");
		expect(onSelect.mock.calls).toEqual([["narrower"]]);
		expect(show.value).toBe(true);

		// the arrows go through the buttons, then the items: the fourth is ≤ 480
		key("ArrowRight");
		key("ArrowRight");
		key("ArrowRight");
		key("ArrowRight");
		key("Enter");
		await flushPromises();
		expect(onSelect).toHaveBeenLastCalledWith("cap");
		expect(show.value).toBe(true);
		key("ArrowLeft");
		key("End");
		key("Enter");
		await flushPromises();
		expect(onSelect).toHaveBeenLastCalledWith("pin");
		expect(show.value).toBe(false);
	});
});

describe("PDropdown near the window's edge", () => {
	afterEach(() => vi.restoreAllMocks());

	async function openAt(top: number, height: number) {
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(
			height
		);
		const m = mountDropdown({ placement: "bottom-end" });
		vi.spyOn(m.trigger().element, "getBoundingClientRect").mockReturnValue(
			new DOMRect(0, top, 40, 30)
		);
		m.show.value = true;
		await flushPromises();
		return m;
	}
	const placed = (m: ReturnType<typeof mountDropdown>) =>
		m.wrapper.findComponent(PPopover).props("placement");

	it("opens downward when it fits", async () => {
		const m = await openAt(100, 300);
		expect(placed(m)).toBe("bottom-end");
		expect(menu().attributes("style")).toBeUndefined();
	});

	it("opens upward when only the room above fits it", async () => {
		// 768 px window: 24 px below the button, 686 above
		const m = await openAt(700, 300);
		expect(placed(m)).toBe("top-end");
		expect(menu().attributes("style")).toBeUndefined();

		// closed, it starts from the asked side again
		m.show.value = false;
		await flushPromises();
		expect(placed(m)).toBe("bottom-end");
	});

	it("fitting neither side, takes the larger one and scrolls inside", async () => {
		// 424 px below, 286 above
		const m = await openAt(300, 600);
		expect(placed(m)).toBe("bottom-end");
		expect(menu().attributes("style")).toContain("max-height: 424px");
	});
});
