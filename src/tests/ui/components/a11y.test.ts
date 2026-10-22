import { afterEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { type Component, h } from "vue";
import { createI18n } from "vue-i18n";
import axe from "axe-core";

import {
	PButton,
	PCheckbox,
	PDrawer,
	PForm,
	PFormItem,
	PInput,
	PInputNumber,
	PModal,
	PSegmented,
	PSelect,
} from "@/ui";
import PToast from "@/ui/components/PToast.vue";
import PMeter from "@/ui/charts/PMeter.vue";

enableAutoUnmount(afterEach);

// the kit calls useI18n, keys render as-is
const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });

function mountA11y(render: () => ReturnType<typeof h>) {
	return mount({ render } as Component, {
		attachTo: document.body,
		global: { plugins: [i18n] },
	});
}

// jsdom has no layout, so colour contrast is left to the e2e UI audit
async function violations(el: Element) {
	const result = await axe.run(el, {
		rules: { "color-contrast": { enabled: false } },
	});
	return result.violations.map(
		(v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`
	);
}

describe("UI kit accessibility", () => {
	it("PModal and PDrawer: named dialogs with a named close button", async () => {
		mountA11y(() =>
			h("div", [
				h(PModal, { show: true, title: "Save as" }, () =>
					h("p", "Body")
				),
				h(PDrawer, { show: true, title: "Market" }, () =>
					h("p", "Body")
				),
			])
		);
		await flushPromises();

		const dialogs = document.querySelectorAll("[role=dialog]");
		expect(dialogs).toHaveLength(2);
		for (const dialog of dialogs)
			expect(await violations(dialog)).toEqual([]);
	});

	it("PToast: info with an action and error with an icon pass", async () => {
		const wrapper = mountA11y(() =>
			h("div", [
				h(PToast, { text: "Building removed", actionLabel: "Undo" }),
				h(PToast, { type: "error", text: "Save failed" }),
			])
		);
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("PMeter: a named image, also when over", async () => {
		const wrapper = mountA11y(() =>
			h("div", [
				h(PMeter, { value: 404, max: 750, label: "Area" }),
				h(PMeter, { value: 760, max: 750, label: "Area" }),
			])
		);
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("PSegmented: a named group of pressed buttons", async () => {
		const wrapper = mountA11y(() =>
			h(PSegmented, {
				value: "a",
				label: "View",
				options: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
				],
			})
		);
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("the axe check catches an unlabelled input", async () => {
		// axe accepts a placeholder as a name, so there is none here
		const wrapper = mountA11y(() =>
			h(PInput, { value: "", placeholder: "" })
		);
		expect(await violations(wrapper.element)).toEqual([
			expect.stringMatching(/^label: /),
		]);
	});

	it("PButton: icon-only with aria-label passes, without it warns", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const wrapper = mountA11y(() =>
			h("div", [
				h(PButton, { "aria-label": "Delete" }, { icon: () => "x" }),
				h(PButton, null, () => "Save"),
			])
		);
		expect(await violations(wrapper.element)).toEqual([]);
		expect(warn).not.toHaveBeenCalled();

		mountA11y(() => h(PButton, null, { icon: () => "x" }));
		expect(warn).toHaveBeenCalledWith(
			"PButton: icon-only button needs an aria-label"
		);
		warn.mockRestore();
	});

	it("PFormItem labels its PInput with label[for]", async () => {
		const wrapper = mountA11y(() =>
			h(PForm, null, () => [
				h(PFormItem, { label: "Username" }, () =>
					h(PInput, { value: "", autocomplete: "username" })
				),
				h(PFormItem, { label: "Password" }, () =>
					h(PInput, { value: "", type: "password" })
				),
			])
		);
		const labels = wrapper.findAll("label");
		const inputs = wrapper.findAll("input");
		expect(labels).toHaveLength(2);
		inputs.forEach((input, i) => {
			expect(input.attributes("id")).toBeTruthy();
			expect(labels[i]!.attributes("for")).toBe(input.attributes("id"));
		});
		expect(inputs[0]!.attributes("autocomplete")).toBe("username");
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("PInput with its own aria-label doesn't take the form item id", () => {
		const wrapper = mountA11y(() =>
			h(PForm, null, () =>
				h(PFormItem, { label: "Distance" }, () =>
					h(PInput, { value: "", ariaLabel: "Other" })
				)
			)
		);
		expect(wrapper.find("input").attributes("id")).toBeUndefined();
		expect(wrapper.find("input").attributes("aria-label")).toBe("Other");
	});

	it("PInputNumber: labelled, arrow keys step, buttons stay out of the tab order", async () => {
		const onUpdate = vi.fn();
		const wrapper = mountA11y(() =>
			h(PForm, null, () =>
				h(PFormItem, { label: "Amount" }, () =>
					h(PInputNumber, {
						value: 2,
						showButtons: true,
						"onUpdate:value": onUpdate,
					})
				)
			)
		);
		const input = wrapper.find("input");
		expect(wrapper.find("label").attributes("for")).toBe(
			input.attributes("id")
		);
		await input.trigger("keydown", { key: "ArrowUp" });
		expect(onUpdate).toHaveBeenLastCalledWith(3);
		await input.trigger("keydown", { key: "ArrowDown" });
		expect(onUpdate).toHaveBeenLastCalledWith(1);

		const buttons = wrapper.findAll("button");
		expect(buttons).toHaveLength(2);
		buttons.forEach((b) => {
			expect(b.attributes("tabindex")).toBe("-1");
			expect(b.attributes("aria-label")).toBeTruthy();
		});
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("PCheckbox: named by aria-label, slot text or PFormItem", async () => {
		const wrapper = mountA11y(() =>
			h(PForm, null, () => [
				h(PCheckbox, {
					checked: false,
					ariaLabel: "Plan A in Empire B",
				}),
				h(PCheckbox, { checked: true }, () => "Rocky"),
				h(PFormItem, { label: "Positive ROI" }, () =>
					h(PCheckbox, { checked: false })
				),
			])
		);
		const last = wrapper.findAll("input").at(-1)!;
		expect(wrapper.find("label[for]").attributes("for")).toBe(
			last.attributes("id")
		);
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("PSelect: combobox labelled by PFormItem, opens with Enter, closes with Escape", async () => {
		const wrapper = mountA11y(() =>
			h(PForm, null, () =>
				h(PFormItem, { label: "Exchange" }, () =>
					h(PSelect, {
						value: "a",
						options: [
							{ label: "A", value: "a" },
							{ label: "B", value: "b" },
						],
					})
				)
			)
		);
		const combo = wrapper.find("[role=combobox]");
		const label = wrapper.find("label");
		expect(combo.attributes("aria-labelledby")).toBe(
			label.attributes("id")
		);
		expect(combo.attributes("tabindex")).toBe("0");
		expect(combo.attributes("aria-expanded")).toBe("false");

		await combo.trigger("keydown", { key: "Enter" });
		await flushPromises();
		expect(combo.attributes("aria-expanded")).toBe("true");

		await combo.trigger("keydown", { key: "Escape" });
		await flushPromises();
		expect(document.activeElement).toBe(combo.element);
		expect(combo.attributes("aria-expanded")).toBe("false");
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("PSelect outside a form takes aria-label", async () => {
		const wrapper = mountA11y(() =>
			h(PSelect, { value: null, options: [], ariaLabel: "Language" })
		);
		expect(wrapper.find("[role=combobox]").attributes("aria-label")).toBe(
			"Language"
		);
		expect(await violations(wrapper.element)).toEqual([]);
	});

	it("the kit page passes in its open states", async () => {
		const { default: KitView } = await import("@/views/dev/KitView.vue");
		const { createHead } = await import("@unhead/vue/client");
		const wrapper = mount(KitView, {
			attachTo: document.body,
			global: { plugins: [i18n, createHead()] },
		});
		await flushPromises();

		// a searchable select with its list open, and a tooltip on a button
		await wrapper
			.find('[aria-label="Material, searchable"]')
			.trigger("keydown", { key: "ArrowDown" });
		wrapper
			.find(".ptooltip button")
			.element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await flushPromises();
		expect(document.body.querySelector("[role=listbox]")).not.toBeNull();
		expect(
			document.body.querySelector<HTMLElement>("[role=tooltip]:not([style*='display: none'])")
		).not.toBeNull();

		// landmarks come from the app layout; layers teleport outside them
		const result = await axe.run(document.body, {
			rules: {
				"color-contrast": { enabled: false },
				region: { enabled: false },
			},
		});
		expect(
			result.violations.map(
				(v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`
			)
		).toEqual([]);
	});
});
