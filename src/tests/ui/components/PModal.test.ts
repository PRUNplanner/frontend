import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
} from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import { createI18n } from "vue-i18n";

import PModal from "@/ui/components/PModal.vue";
import PSelect from "@/ui/components/PSelect.vue";

enableAutoUnmount(afterEach);

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });
const body = () => new DOMWrapper(document.body);
const dialogs = () => body().findAll("[role=dialog]");
const html = document.documentElement;

let app: HTMLElement;
beforeEach(() => {
	app = document.createElement("div");
	app.id = "app";
	document.body.appendChild(app);
});
afterEach(() => app.remove());

// an opener per modal on the page (#app), each modal with an input and an action
function mountModals(count: number, props: Record<string, unknown> = {}) {
	const shows: Ref<boolean>[] = Array.from({ length: count }, () =>
		ref(false)
	);
	const wrapper = mount(
		defineComponent({
			setup: () => () =>
				shows.flatMap((show, i) => [
					h(
						"button",
						{
							id: `opener-${i}`,
							onClick: () => (show.value = true),
						},
						"open"
					),
					h(
						PModal,
						{
							show: show.value,
							"onUpdate:show": (v: boolean) => (show.value = v),
							title: `Modal ${i}`,
							...props,
						},
						{
							default: () => h("input", { id: `field-${i}` }),
							action: () => h("button", { id: `ok-${i}` }, "OK"),
						}
					),
				]),
		}),
		{ attachTo: app, global: { plugins: [i18n] } }
	);
	return { wrapper, shows };
}

async function open(index = 0) {
	const opener = document.getElementById(`opener-${index}`)!;
	opener.focus();
	opener.click();
	await flushPromises();
}

async function key(name: string, shiftKey = false) {
	(document.activeElement ?? document.body).dispatchEvent(
		new KeyboardEvent("keydown", {
			key: name,
			shiftKey,
			bubbles: true,
			cancelable: true,
		})
	);
	await flushPromises();
}

// the element mask clicks land on: everything around the panel
const mask = () => dialogs().at(-1)!.element.parentElement!;

describe("PModal", () => {
	it("opens labelled, focuses the content and closes with Esc", async () => {
		const { shows } = await mountModals(1);
		await open();

		const dialog = dialogs()[0];
		expect(dialog.attributes("aria-modal")).toBe("true");
		const titleId = dialog.attributes("aria-labelledby")!;
		expect(document.getElementById(titleId)!.textContent?.trim()).toBe(
			"Modal 0"
		);
		expect(document.activeElement?.id).toBe("field-0");

		await key("Escape");
		expect(shows[0].value).toBe(false);
		expect(dialogs()).toHaveLength(0);
		expect(document.activeElement?.id).toBe("opener-0");
	});

	it("closes with the X and the mask, not with a drag out of the panel", async () => {
		const { shows } = await mountModals(1);

		await open();
		await body()
			.find('button[aria-label="common.ui.close"]')
			.trigger("click");
		expect(shows[0].value).toBe(false);

		await open();
		dialogs()[0].element.dispatchEvent(
			new MouseEvent("mousedown", { bubbles: true })
		);
		mask().dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();
		expect(shows[0].value).toBe(true);

		mask().dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		mask().dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();
		expect(shows[0].value).toBe(false);
	});

	it("keeps the mask open when maskClosable is off", async () => {
		const { shows } = await mountModals(1, { maskClosable: false });
		await open();

		mask().dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		mask().dispatchEvent(new MouseEvent("click", { bubbles: true }));
		await flushPromises();
		expect(shows[0].value).toBe(true);
	});

	// e.g. the save conflict dialog, an async component rendered already open
	it("takes a width in px or CSS and keeps 16 px of the mask on each side", async () => {
		mount(PModal, {
			props: { show: true, title: "px", width: 446 },
			attachTo: app,
			global: { plugins: [i18n] },
		});
		mount(PModal, {
			props: { show: true, title: "css", width: "40rem" },
			attachTo: app,
			global: { plugins: [i18n] },
		});
		await flushPromises();
		const [px, css] = [...document.querySelectorAll<HTMLElement>("[role=dialog]")];

		expect(px.style.width).toBe("446px");
		expect(css.style.width).toBe("40rem");
		expect(px.classList).toContain("max-w-[calc(100vw-32px)]");
	});

	it("focuses the content when mounted open", async () => {
		mount(PModal, {
			props: { show: true, title: "Open" },
			slots: { default: () => h("input", { id: "mounted-open" }) },
			attachTo: app,
			global: { plugins: [i18n] },
		});
		await flushPromises();

		expect(document.activeElement?.id).toBe("mounted-open");
	});

	it("focuses the panel itself without autoFocus", async () => {
		await mountModals(1, { autoFocus: false });
		await open();

		expect(document.activeElement).toBe(dialogs()[0].element);
	});

	it("wraps Tab inside the panel", async () => {
		await mountModals(1);
		await open();

		document.getElementById("ok-0")!.focus();
		await key("Tab");
		expect(document.activeElement?.getAttribute("aria-label")).toBe(
			"common.ui.close"
		);

		await key("Tab", true);
		expect(document.activeElement?.id).toBe("ok-0");

		// focus that escaped is pulled back
		document.getElementById("opener-0")!.focus();
		await key("Tab");
		expect(dialogs()[0].element.contains(document.activeElement)).toBe(
			true
		);
	});

	it("closes an open PSelect list first on Esc", async () => {
		const show = ref(true);
		mount(PModal, {
			props: {
				show: true,
				"onUpdate:show": (v: boolean) => (show.value = v),
				title: "Select",
			},
			slots: {
				default: () =>
					h(PSelect, {
						value: null,
						options: [{ label: "A", value: "a" }],
						ariaLabel: "Pick",
					}),
			},
			attachTo: app,
			global: { plugins: [i18n] },
		});
		await flushPromises();
		const combobox = body().find<HTMLElement>("[role=combobox]");
		combobox.element.focus();
		await combobox.trigger("keydown", { key: "ArrowDown" });
		await flushPromises();
		expect(body().find("[role=listbox]").exists()).toBe(true);

		await key("Escape");
		expect(body().find("[role=listbox]").exists()).toBe(false);
		expect(show.value).toBe(true);
		expect(document.activeElement).toBe(combobox.element);

		await key("Escape");
		expect(show.value).toBe(false);
	});

	it("stacks: Esc closes the top one, lock and inert last until both close", async () => {
		const { shows } = await mountModals(2);
		await open(0);
		expect(html.style.overflow).toBe("hidden");
		expect(app.hasAttribute("inert")).toBe(true);

		// the second opener sits behind the first modal; open it directly
		shows[1].value = true;
		await flushPromises();
		const [first, second] = dialogs();
		const z = (el: DOMWrapper<Element>) =>
			Number(
				(el.element.parentElement!.parentElement as HTMLElement).style
					.zIndex
			);
		expect(z(second)).toBeGreaterThan(z(first));

		await key("Escape");
		expect(shows.map((s) => s.value)).toEqual([true, false]);
		expect(html.style.overflow).toBe("hidden");
		expect(app.hasAttribute("inert")).toBe(true);

		await key("Escape");
		expect(shows.map((s) => s.value)).toEqual([false, false]);
		expect(html.style.overflow).toBe("");
		expect(app.hasAttribute("inert")).toBe(false);
	});

	it("releases the lock when unmounted while open", async () => {
		const { wrapper } = await mountModals(1);
		await open();

		wrapper.unmount();
		expect(html.style.overflow).toBe("");
		expect(app.hasAttribute("inert")).toBe(false);
	});
});
