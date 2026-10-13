import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import { createI18n } from "vue-i18n";

import { PForm, PFormItem, PInput, PInputNumber, PSelect } from "@/ui";

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });

function mountItem(
	control: () => ReturnType<typeof h>,
	error?: string,
	info?: string
) {
	return mount(
		{
			render: () =>
				h(PForm, null, () =>
					h(
						PFormItem,
						{ label: "Name", error },
						{
							default: control,
							...(info ? { info: () => info } : {}),
						}
					)
				),
		},
		{ global: { plugins: [i18n] } }
	);
}

describe("PFormItem", () => {
	it("labels its input", () => {
		const wrapper = mountItem(() => h(PInput, { value: "" }));
		const input = wrapper.find("input");

		expect(wrapper.find("label").attributes("for")).toBe(input.attributes("id"));
		expect(input.attributes("aria-invalid")).toBeUndefined();
		expect(input.attributes("aria-describedby")).toBeUndefined();
	});

	it.each([
		["PInput", () => h(PInput, { value: "" }), "input"],
		["PInputNumber", () => h(PInputNumber, { value: 1 }), "input"],
		["PSelect", () => h(PSelect, { value: null, options: [] }), "[role=combobox]"],
	])(
		"shows an error under %s, marks it invalid and describes it",
		(_, control, selector) => {
			const wrapper = mountItem(control, "Name is taken");
			const field = wrapper.find(selector);
			const message = wrapper.find(".text-negative");

			expect(message.text()).toBe("Name is taken");
			expect(field.attributes("aria-invalid")).toBe("true");
			expect(field.attributes("aria-describedby")).toBe(
				message.attributes("id")
			);
			expect(wrapper.find(".inset-ring-negative").exists()).toBe(true);
		}
	);

	it("describes the field with its info too", () => {
		const wrapper = mountItem(
			() => h(PInput, { value: "" }),
			"Name is taken",
			"Up to 30 letters"
		);
		const ids = wrapper.find("input").attributes("aria-describedby")!.split(" ");

		expect(ids).toHaveLength(2);
		expect(wrapper.find(`[id="${ids[1]}"]`).text()).toBe(
			"Up to 30 letters"
		);
	});
});
