import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PNotice from "@/ui/components/PNotice.vue";

describe("PNotice", () => {
	it.each([
		["error", "alert", "border-l-negative"],
		["warning", "status", "border-l-warning"],
		["info", "status", "border-l-link"],
	] as const)("%s is a %s with its colour bar", (type, role, bar) => {
		const wrapper = mount(PNotice, {
			props: { type },
			slots: { default: "Saved elsewhere" },
		});

		expect(wrapper.attributes("role")).toBe(role);
		expect(wrapper.classes()).toContain(bar);
		expect(wrapper.text()).toBe("Saved elsewhere");
		expect(wrapper.find("svg").exists()).toBe(true);
	});

	it("shows an action", () => {
		const wrapper = mount(PNotice, {
			slots: { default: "Saved elsewhere", action: "<button>Reload</button>" },
		});

		expect(wrapper.find("button").text()).toBe("Reload");
	});
});
