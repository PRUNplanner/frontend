import { describe, it, expect } from "vitest";

import ChainRecipeText from "@/features/production_chain/components/ChainRecipeText.vue";
import { mountComponent } from "@/tests/mountComponent";

describe("ChainRecipeText", () => {
	it("reads inputs → outputs, the chain's material in bold", async () => {
		const m = (t: string, a: number) => ({ material_ticker: t, material_amount: a });
		const { wrapper } = await mountComponent(ChainRecipeText, {
			ticker: "C",
			recipe: {
				recipe_id: "x",
				recipe_name: "x",
				building_ticker: "BLD",
				time_ms: 1,
				inputs: [m("A", 1), m("B", 2)],
				outputs: [m("C", 3), m("D", 1)],
			},
		});
		expect(wrapper.text().replace(/\s+/g, " ")).toBe("1 A+2 B→3 C+1 D");
		expect(wrapper.find(".font-bold").text().replace(/\s+/g, " ")).toBe("3 C");
	});

	it("says nothing goes in", async () => {
		const { wrapper } = await mountComponent(ChainRecipeText, {
			ticker: "DV",
			recipe: {
				recipe_id: "x",
				recipe_name: "x",
				building_ticker: "SE",
				time_ms: 1,
				inputs: [],
				outputs: [{ material_ticker: "DV", material_amount: 1 }],
			},
		});
		expect(wrapper.text()).toContain("production_chains.table.nothing");
	});
});
