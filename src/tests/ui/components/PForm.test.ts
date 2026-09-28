import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";

import PForm from "@/ui/components/PForm.vue";
import PButton from "@/ui/components/PButton.vue";

// jsdom has no implicit submission (Enter in an input), so the submit
// button stands in for it; Enter itself is checked in the e2e stack.
function mountForm(asForm: boolean, htmlType?: "button" | "submit") {
	return mount(PForm, {
		props: { asForm },
		attachTo: document.body,
		slots: {
			default: () => [
				h("input", { type: "text" }),
				h(PButton, { htmlType }, () => "Go"),
			],
		},
	});
}

describe("PForm", () => {
	it("renders a div by default", () => {
		const wrapper = mountForm(false);
		expect(wrapper.find("form").exists()).toBe(false);
	});

	it("as-form emits submit from a submit button", async () => {
		const wrapper = mountForm(true, "submit");
		await wrapper.find("button").trigger("click");
		expect(wrapper.emitted("submit")).toHaveLength(1);
	});

	it("as-form emits submit on the form's submit event", async () => {
		const wrapper = mountForm(true);
		await wrapper.find("form").trigger("submit");
		expect(wrapper.emitted("submit")).toHaveLength(1);
	});

	it("a default PButton never submits", async () => {
		const wrapper = mountForm(true);
		const button = wrapper.find("button");
		expect(button.attributes("type")).toBe("button");
		await button.trigger("click");
		expect(wrapper.emitted("submit")).toBeUndefined();
	});
});
