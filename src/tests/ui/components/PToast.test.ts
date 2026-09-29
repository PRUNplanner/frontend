import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PToast from "@/ui/components/PToast.vue";

describe("PToast", () => {
	it("is a status with the brand accent and no icon", () => {
		const wrapper = mount(PToast, { props: { text: "Building removed" } });

		expect(wrapper.attributes("role")).toBe("status");
		expect(wrapper.classes()).toContain("border-l-prunplanner");
		expect(wrapper.text()).toBe("Building removed");
		expect(wrapper.find(".picon").exists()).toBe(false);
		expect(wrapper.find("button").exists()).toBe(false);
	});

	it("is an alert with the negative accent and an icon for errors", () => {
		const wrapper = mount(PToast, {
			props: { type: "error", text: "Save failed" },
		});

		expect(wrapper.attributes("role")).toBe("alert");
		expect(wrapper.classes()).toContain("border-l-negative");
		expect(wrapper.find(".picon").exists()).toBe(true);
	});

	it("emits its one action", async () => {
		const wrapper = mount(PToast, {
			props: { text: "Building removed", actionLabel: "Undo" },
		});

		await wrapper.find("button").trigger("click");

		expect(wrapper.find("button").text()).toBe("Undo");
		expect(wrapper.emitted("action")).toHaveLength(1);
	});
});
