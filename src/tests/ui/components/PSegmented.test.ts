import { describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";

import PSegmented from "@/ui/components/PSegmented.vue";

const OPTIONS = [
	{ value: "exchange", label: "Per exchange" },
	{ value: "combined", label: "Combined" },
];

describe("PSegmented", () => {
	it("a labelled group of pressed buttons, one tab stop each", () => {
		const wrapper = mount(PSegmented, {
			props: { value: "exchange", options: OPTIONS, label: "Index view" },
		});
		expect(wrapper.attributes("role")).toBe("group");
		expect(wrapper.attributes("aria-label")).toBe("Index view");
		const buttons = wrapper.findAll("button");
		expect(buttons.map((b) => b.text())).toEqual([
			"Per exchange",
			"Combined",
		]);
		expect(buttons.map((b) => b.attributes("aria-pressed"))).toEqual([
			"true",
			"false",
		]);
		buttons.forEach((b) => {
			expect(b.attributes("type")).toBe("button");
			expect(b.attributes("tabindex")).toBeUndefined();
			expect(b.classes()).toContain("touch-target");
		});
	});

	it("v-model: a click picks the option", async () => {
		const wrapper: VueWrapper = mount(PSegmented, {
			props: {
				value: "exchange",
				options: OPTIONS,
				label: "Index view",
				"onUpdate:value": (v: string | number) => {
					void wrapper.setProps({ value: v });
				},
			},
		});
		await wrapper.findAll("button")[1].trigger("click");
		expect(wrapper.emitted("update:value")).toEqual([["combined"]]);
		expect(
			wrapper.findAll("button").map((b) => b.attributes("aria-pressed"))
		).toEqual(["false", "true"]);
	});

	it("sizes, and block fills the width (on phones only with 'phone')", () => {
		const props = { value: "exchange", options: OPTIONS, label: "x" };
		const md = mount(PSegmented, { props });
		expect(md.classes()).toContain("inline-flex");
		expect(md.find("button").classes()).toContain("h-7");

		const sm = mount(PSegmented, { props: { ...props, size: "sm" } });
		expect(sm.find("button").classes()).toContain("h-6");

		const block = mount(PSegmented, { props: { ...props, block: true } });
		expect(block.classes()).toEqual(expect.arrayContaining(["flex", "w-full"]));
		expect(block.find("button").classes()).toContain("flex-1");

		const phone = mount(PSegmented, { props: { ...props, block: "phone" } });
		expect(phone.classes()).toEqual(
			expect.arrayContaining(["w-full", "sm:inline-flex", "sm:w-auto"])
		);
		expect(phone.find("button").classes()).toContain("sm:flex-none");
	});
});
