import { describe, it, expect } from "vitest";
import { shallowMount } from "@vue/test-utils";

import PlanProductionBuilding from "@/features/planning/components/PlanProductionBuilding.vue";
import { PInputNumber } from "@/ui";

// Types & Interfaces
import { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";

describe("PlanProductionBuilding", () => {
	it("emits a new amount without writing into the result (S9)", async () => {
		const buildingData = {
			name: "FP",
			amount: 2,
			activeRecipes: [],
			recipeOptions: [],
			efficiencyElements: [],
			totalEfficiency: 1,
			dailyRevenue: 0,
		} as unknown as IProductionBuilding;

		const wrapper = shallowMount(PlanProductionBuilding, {
			props: {
				disabled: false,
				buildingData,
				buildingIndex: 3,
				planetId: "KW-688c",
			},
			global: { mocks: { $t: (key: string) => key } },
		});

		wrapper.findComponent(PInputNumber).vm.$emit("update:value", 5);

		expect(wrapper.emitted("update:building:amount")).toStrictEqual([[3, 5]]);
		expect(buildingData.amount).toBe(2);
	});
});
