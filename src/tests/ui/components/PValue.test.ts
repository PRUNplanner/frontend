import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PValue from "@/ui/components/PValue.vue";

describe("PValue", () => {
	it.each([
		[1234.5, "+1,234.50", "text-positive"],
		[-2.6, "-2.60", "text-negative"],
		[0, "0.00", undefined],
		[-0.001, "0.00", undefined],
	])("%s renders %s", (value, text, cls) => {
		const wrapper = mount(PValue, { props: { value } });
		expect(wrapper.text()).toBe(text);
		expect(wrapper.classes()).toEqual(cls ? [cls] : []);
	});

	it("respects decimals", () => {
		const wrapper = mount(PValue, { props: { value: 3, decimals: 0 } });
		expect(wrapper.text()).toBe("+3");
	});

	it("shows an arrow only for non-zero values", () => {
		expect(
			mount(PValue, { props: { value: -1, arrow: true } }).text()
		).toBe("▼ -1.00");
		expect(mount(PValue, { props: { value: 0, arrow: true } }).text()).toBe(
			"0.00"
		);
	});

	it("keeps the dash for non-finite values", () => {
		const wrapper = mount(PValue, { props: { value: Infinity } });
		expect(wrapper.text()).toBe("—");
		expect(wrapper.classes()).toEqual([]);
	});
});
