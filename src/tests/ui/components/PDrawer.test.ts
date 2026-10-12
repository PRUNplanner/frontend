import { afterEach, describe, expect, it } from "vitest";
import {
	DOMWrapper,
	enableAutoUnmount,
	flushPromises,
	mount,
} from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import PDrawer from "@/ui/components/PDrawer.vue";

enableAutoUnmount(afterEach);

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });
const body = () => new DOMWrapper(document.body);
const panel = () => body().find<HTMLElement>("[role=dialog]");

function mountDrawer(
	props: Record<string, unknown> = {},
	slots: Record<string, () => unknown> = {}
) {
	const show = ref(true);
	mount(
		defineComponent({
			setup: () => () =>
				h(
					PDrawer,
					{
						show: show.value,
						"onUpdate:show": (v: boolean) => (show.value = v),
						...props,
					},
					{ default: () => h("input"), ...slots }
				),
		}),
		{ attachTo: document.body, global: { plugins: [i18n] } }
	);
	return show;
}

describe("PDrawer", () => {
	it("is 600 px from the right by default, leaving 48 px of the mask on small screens", async () => {
		mountDrawer({ title: "Market" });
		await flushPromises();

		expect(panel().element.style.width).toBe("600px");
		expect(panel().classes()).toEqual(
			expect.arrayContaining(["right-0", "max-w-[calc(100vw-48px)]"])
		);
		const label = panel().attributes("aria-labelledby")!;
		expect(document.getElementById(label)!.textContent).toBe("Market");
	});

	it("takes a CSS width, the left side and a header slot", async () => {
		mountDrawer(
			{ title: "ignored", width: "100%", placement: "left" },
			{ header: () => "Filters" }
		);
		await flushPromises();

		expect(panel().element.style.width).toBe("100%");
		expect(panel().classes()).toContain("left-0");
		expect(panel().find("[data-layer-header]").text()).toBe("Filters");
	});

	it("closes with the X, Esc and the mask", async () => {
		const show = mountDrawer({ title: "Market" });
		await flushPromises();
		await panel()
			.find('button[aria-label="common.ui.close"]')
			.trigger("click");
		expect(show.value).toBe(false);

		show.value = true;
		await flushPromises();
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
		);
		expect(show.value).toBe(false);

		show.value = true;
		await flushPromises();
		const mask = panel().element.previousElementSibling!;
		mask.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		mask.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(show.value).toBe(false);
	});

	it("has no header without a title, X or header slot", async () => {
		mountDrawer({ closable: false, "aria-label": "Filters" });
		await flushPromises();

		expect(panel().find("[data-layer-header]").exists()).toBe(false);
		expect(panel().attributes("aria-labelledby")).toBeUndefined();
		expect(panel().attributes("aria-label")).toBe("Filters");
	});
});
