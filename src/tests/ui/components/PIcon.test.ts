import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PIcon from "@/ui/components/PIcon.vue";

describe("PIcon", () => {
	it("is 1em by default and wraps its icon", () => {
		const wrapper = mount(PIcon, { slots: { default: "<svg />" } });

		expect(wrapper.attributes("style")).toContain("width: 1em");
		expect(wrapper.find("svg").exists()).toBe(true);
	});

	it("takes a size in px and a colour", () => {
		const style = mount(PIcon, { props: { size: 20, color: "red" } }).attributes(
			"style"
		);

		expect(style).toContain("width: 20px");
		expect(style).toContain("height: 20px");
		expect(style).toContain("color: red");
	});
});
