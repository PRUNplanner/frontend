import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PCheckbox from "@/ui/components/PCheckbox.vue";

describe("PCheckbox", () => {
	it("emits the new state and takes its label from the slot", async () => {
		const wrapper = mount(PCheckbox, {
			props: { checked: false },
			slots: { default: "Active" },
		});
		await wrapper.find("input").setValue(true);

		expect(wrapper.emitted("update:checked")).toEqual([[true]]);
		expect(wrapper.find("label").text()).toBe("Active");
	});

	it("shows some, not all, with indeterminate", () => {
		const wrapper = mount(PCheckbox, {
			props: { checked: false, indeterminate: true, ariaLabel: "All" },
		});
		const input = wrapper.find("input").element as HTMLInputElement;

		expect(input.indeterminate).toBe(true);
		expect(wrapper.find("rect").exists()).toBe(true);
		expect(wrapper.find("path").exists()).toBe(false);
	});

	it("has a 16 px box at md and 14 px at sm", () => {
		const md = mount(PCheckbox, { props: { ariaLabel: "md" } });
		const sm = mount(PCheckbox, { props: { ariaLabel: "sm", size: "sm" } });

		expect(md.find("input").classes()).toContain("size-4");
		expect(sm.find("input").classes()).toContain("size-3.5");
	});

	it("makes the label the touch target", () => {
		const wrapper = mount(PCheckbox, { props: { ariaLabel: "x" } });

		expect(wrapper.find("label").classes()).toContain("touch-target");
	});

	it("doesn't change when disabled", async () => {
		const wrapper = mount(PCheckbox, {
			props: { checked: false, disabled: true, ariaLabel: "x" },
		});

		expect(wrapper.find("input").attributes("disabled")).toBeDefined();
	});
});
