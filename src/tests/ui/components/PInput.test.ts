import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";

import PInput from "@/ui/components/PInput.vue";

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });
const global = { plugins: [i18n] };

describe("PInput", () => {
	it("emits typed text", async () => {
		const wrapper = mount(PInput, {
			props: { value: "", ariaLabel: "Name" },
			global,
		});
		await wrapper.find("input").setValue("Moria");

		expect(wrapper.emitted("update:value")).toEqual([["Moria"]]);
	});

	it("marks an error as invalid, a warning only by its ring", () => {
		const error = mount(PInput, {
			props: { value: "", ariaLabel: "x", status: "error" },
			global,
		});
		const warning = mount(PInput, {
			props: { value: "", ariaLabel: "x", status: "warning" },
			global,
		});

		expect(error.find("input").attributes("aria-invalid")).toBe("true");
		expect(error.find(".inset-ring-negative").exists()).toBe(true);
		expect(
			warning.find("input").attributes("aria-invalid")
		).toBeUndefined();
		expect(warning.find(".inset-ring-warning").exists()).toBe(true);
	});

	it("shows a prefix before the text", () => {
		const wrapper = mount(PInput, {
			props: { value: "", ariaLabel: "Search" },
			slots: { prefix: "<svg class='icon' />" },
			global,
		});
		const box = wrapper.find(".rounded-control");

		expect(
			box.element.firstElementChild!.querySelector(".icon")
		).not.toBeNull();
		expect(box.find("input").exists()).toBe(true);
	});

	it("gives a textarea no fixed height", () => {
		const wrapper = mount(PInput, {
			props: { value: "", ariaLabel: "Notes", type: "textarea" },
			global,
		});

		expect(wrapper.find(".rounded-control").classes()).not.toContain("h-7");
		expect(wrapper.find("textarea").exists()).toBe(true);
	});
});
