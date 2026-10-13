import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import type { Component } from "vue";

import {
	PButton,
	PInput,
	PInputNumber,
	PSelect,
	PSelectMultiple,
} from "@/ui";

const i18n = createI18n({ legacy: false, locale: "en_US", messages: {} });

// jsdom has no layout: each control's box carries the height class of its size
const controls: [string, Component, Record<string, unknown>, string][] = [
	["PButton", PButton, { ariaLabel: "x" }, "button"],
	["PInput", PInput, { value: "", ariaLabel: "x" }, ".rounded-control"],
	["PInputNumber", PInputNumber, { value: 1, ariaLabel: "x" }, ".rounded-control"],
	["PSelect", PSelect, { value: null, options: [], ariaLabel: "x" }, ".rounded-control.cursor-pointer"],
	[
		"PSelectMultiple",
		PSelectMultiple,
		{ value: [], options: [], ariaLabel: "x" },
		".rounded-control.cursor-pointer",
	],
];

describe("kit control heights", () => {
	it.each(controls)("%s is 28 px at md and 24 px at sm", (_, c, props, box) => {
		const height = (size: string) =>
			mount(c, { props: { ...props, size }, global: { plugins: [i18n] } })
				.find(box)
				.classes()
				.find((k) => /^(min-)?h-[67]$/.test(k));

		expect(height("md")).toMatch(/h-7$/);
		expect(height("sm")).toMatch(/h-6$/);
	});

	it.each(controls.slice(1))(
		"%s is 44 px tall on a touch screen",
		(_, c, props, box) => {
			const classes = mount(c, { props, global: { plugins: [i18n] } })
				.find(box)
				.classes();
			expect(classes.some((k) => /^pointer-coarse:(min-)?h-11$/.test(k))).toBe(
				true
			);
		}
	);

	it("gives buttons an invisible 44 px hit area on touch", () => {
		const button = mount(PButton, { slots: { default: "Save" } });
		expect(button.find("button").classes()).toContain("touch-target");
	});
});
