import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { h, ref } from "vue";
import { createI18n } from "vue-i18n";

import { PButton, PModal, PTooltip } from "@/ui";

enableAutoUnmount(afterEach);
afterEach(() => (document.body.innerHTML = ""));

// the kit calls useI18n, keys render as-is
const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });

const panel = () => document.body.querySelector<HTMLElement>("[role=tooltip]");
const shown = () => panel()?.textContent === "Help";

function mountTooltip(trigger: () => ReturnType<typeof h>, disabled = false) {
	return mount(
		{
			render: () =>
				h(
					PTooltip,
					{ disabled },
					{ trigger, default: () => "Help" }
				),
		},
		{ attachTo: document.body }
	);
}

describe("PTooltip", () => {
	it("opens on hover and closes 150 ms after leaving", async () => {
		vi.useFakeTimers();
		const wrapper = mountTooltip(() => h("span", "i"));
		const trigger = wrapper.find(".ptooltip");

		await trigger.trigger("mouseenter");
		expect(shown()).toBe(true);

		await trigger.trigger("mouseleave");
		vi.advanceTimersByTime(149);
		await flushPromises();
		expect(shown()).toBe(true);
		vi.advanceTimersByTime(1);
		await flushPromises();
		expect(shown()).toBe(false);
		vi.useRealTimers();
	});

	it("opens on keyboard focus, closes on blur and is announced", async () => {
		const wrapper = mountTooltip(() => h("button", "Save"));
		const button = wrapper.find("button");
		expect(wrapper.find(".ptooltip").attributes("tabindex")).toBeUndefined();
		// closed tooltips add nothing to the page
		expect(panel()).toBeNull();

		await button.trigger("focusin");
		expect(shown()).toBe(true);
		expect(button.attributes("aria-describedby")).toBe(panel()!.id);
		await button.trigger("focusout", { relatedTarget: document.body });
		expect(shown()).toBe(false);
		expect(button.attributes("aria-describedby")).toBeUndefined();
	});

	it("makes a trigger without a focusable element focusable", async () => {
		const wrapper = mountTooltip(() => h("span", "i"));
		await flushPromises();
		const trigger = wrapper.find(".ptooltip");

		expect(trigger.attributes("tabindex")).toBe("0");
		await trigger.trigger("focusin");
		expect(trigger.attributes("aria-describedby")).toBe(panel()!.id);
	});

	it("closes on Esc before a modal around it sees the key", async () => {
		const show = ref(true);
		mount(
			{
				render: () =>
					h(
						PModal,
						{
							show: show.value,
							"onUpdate:show": (v: boolean) => (show.value = v),
						},
						() =>
							h(PTooltip, null, {
								trigger: () => h("button", "Save"),
								default: () => "Help",
							})
					),
			},
			{ attachTo: document.body, global: { plugins: [i18n] } }
		);
		await flushPromises();
		const button = document.body.querySelector<HTMLButtonElement>(
			"[role=dialog] .ptooltip button"
		)!;
		button.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await flushPromises();
		expect(shown()).toBe(true);

		button.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
			})
		);
		await flushPromises();
		expect(shown()).toBe(false);
		expect(show.value).toBe(true);

		button.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
			})
		);
		await flushPromises();
		expect(show.value).toBe(false);
	});

	it("toggles on a tap on a non-interactive trigger, closes on a tap elsewhere", async () => {
		const wrapper = mountTooltip(() => h("span", "i"));
		const trigger = wrapper.find(".ptooltip");

		// a tap: touchstart, then the compatibility mouseenter, focus and click
		await trigger.trigger("touchstart");
		await trigger.trigger("mouseenter");
		await trigger.trigger("focusin");
		expect(shown()).toBe(false);
		await trigger.trigger("click");
		expect(shown()).toBe(true);

		document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
		await flushPromises();
		expect(shown()).toBe(false);
	});

	it("runs a tapped control inside the trigger and shows no tooltip", async () => {
		const onClick = vi.fn();
		const wrapper = mountTooltip(() =>
			h(PButton, { type: "secondary", onClick }, () => "Save")
		);
		const button = wrapper.find("button");

		await button.trigger("touchstart");
		await button.trigger("focusin");
		await button.trigger("click");

		expect(onClick).toHaveBeenCalledOnce();
		expect(shown()).toBe(false);
	});

	it("does nothing while disabled: no tab stop, no description", async () => {
		const wrapper = mountTooltip(() => h("span", "i"), true);
		const trigger = wrapper.find(".ptooltip");

		await trigger.trigger("mouseenter");
		expect(panel()).toBeNull();
		expect(trigger.attributes("tabindex")).toBeUndefined();
		expect(trigger.attributes("aria-describedby")).toBeUndefined();
	});
});
