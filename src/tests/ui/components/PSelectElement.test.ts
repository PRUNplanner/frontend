import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PSelectElement from "@/ui/components/PSelectElement.vue";

const GROUP = {
	label: "Metals",
	value: "METALS",
	children: [
		{ label: "Aluminium", value: "AL", badge: "AL" },
		{ label: "Iron", value: "FE" },
	],
};

describe("PSelectElement", () => {
	it("is an option with an id from its list and index", async () => {
		const wrapper = mount(PSelectElement, {
			props: {
				option: { label: "Moria", value: "NC1" },
				selectedValue: "NC1",
				listId: "l",
				firstIndex: 4,
				highlightedIndex: 0,
			},
		});

		expect(wrapper.attributes("role")).toBe("option");
		expect(wrapper.attributes("id")).toBe("l-4");
		expect(wrapper.attributes("aria-selected")).toBe("true");
		expect(wrapper.classes()).toContain("bg-selected");

		await wrapper.trigger("click");
		expect(wrapper.emitted("click")).toEqual([["NC1"]]);
	});

	it("is a labelled group of child options, the header no option", async () => {
		const wrapper = mount(PSelectElement, {
			props: {
				option: GROUP,
				selectedValue: ["FE"],
				listId: "l",
				firstIndex: 2,
				highlightedIndex: 1,
			},
		});
		const options = wrapper.findAll("[role=option]");

		expect(wrapper.attributes("role")).toBe("group");
		expect(
			wrapper.find(`#${wrapper.attributes("aria-labelledby")}`).text()
		).toBe("Metals");
		expect(options.map((o) => o.attributes("id"))).toEqual(["l-2", "l-3"]);
		expect(options.map((o) => o.attributes("aria-selected"))).toEqual([
			"false",
			"true",
		]);
		expect(options[1].classes()).toContain("bg-selected");
		expect(options[0].text()).toContain("AL");

		await options[0].trigger("click");
		expect(wrapper.emitted("click")).toEqual([["AL"]]);
	});
});
