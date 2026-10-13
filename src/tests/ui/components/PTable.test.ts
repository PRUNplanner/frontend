import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PTable from "@/ui/components/PTable.vue";

describe("PTable", () => {
	it("renders its rows in a scrollable box", () => {
		const wrapper = mount(PTable, {
			slots: { default: "<tbody><tr><td>AL</td></tr></tbody>" },
		});

		expect(wrapper.classes()).toContain("overflow-x-auto");
		expect(wrapper.find("table td").text()).toBe("AL");
		expect(wrapper.find("table").classes()).not.toContain("ptable-striped");
	});

	it("stripes on request", () => {
		const wrapper = mount(PTable, { props: { striped: true } });

		expect(wrapper.find("table").classes()).toContain("ptable-striped");
	});
});
