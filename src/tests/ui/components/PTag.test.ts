import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";

import PTag from "@/ui/components/PTag.vue";

const i18n = createI18n({
	legacy: false,
	locale: "en_US",
	messages: {
		en_US: { common: { ui: { tag: { remove: "Remove {label}" } } } },
	},
});

describe("PTag", () => {
	it("shows its value in its colour", () => {
		const wrapper = mount(PTag, {
			props: { value: "AI1", type: "error" },
			global: { plugins: [i18n] },
		});

		expect(wrapper.text()).toBe("AI1");
		expect(wrapper.classes()).toContain("bg-negative");
		expect(wrapper.find("button").exists()).toBe(false);
	});

	it("is removed with a real, named button", async () => {
		const wrapper = mount(PTag, {
			props: { value: "AI1", closable: true },
			global: { plugins: [i18n] },
		});
		const button = wrapper.find("button");

		expect(button.attributes("type")).toBe("button");
		// 24 px hit area on a mouse, visibly 44 px on touch screens
		expect(button.classes()).toEqual(
			expect.arrayContaining(["touch-target", "pointer-coarse:size-11"])
		);
		expect(button.attributes("aria-label")).toBe("Remove AI1");
		// Enter and Space on a focused <button> fire click
		await button.trigger("click");
		expect(wrapper.emitted("close")).toHaveLength(1);
	});
});
