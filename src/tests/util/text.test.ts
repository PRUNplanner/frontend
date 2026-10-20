import { describe, expect, it } from "vitest";
import { capitalizeString, formatMaterialName } from "@/util/text";

describe("Util: text", () => {
	describe("capitalizeString", () => {
		it("capitalize single", () => {
			const result = capitalizeString("foo");
			expect(result).toStrictEqual("Foo");
		});

		it("capitalize multiple", () => {
			const result = capitalizeString("foo moo");
			expect(result).toStrictEqual("Foo Moo");
		});
	});

	describe("formatMaterialName", () => {
		it.each([
			["workstationBlank", "Workstation Blank"],
			["reinforcedDeckElements", "Reinforced Deck Elements"],
			["smartZinfandel2Kit", "Smart Zinfandel2 Kit"],
			["highCAPACITYConnector", "High CAPACITYConnector"],
			["Air Scrubber", "Air Scrubber"],
			["lowercase name kept", "lowercase name kept"],
			["water", "Water"],
		])("%s → %s", (name, expected) => {
			expect(formatMaterialName(name, "X")).toBe(expected);
		});

		it("shows the ticker without a name", () => {
			expect(formatMaterialName("", "WSB")).toBe("WSB");
		});
	});
});
