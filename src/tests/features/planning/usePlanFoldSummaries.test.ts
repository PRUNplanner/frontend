import { describe, expect, it } from "vitest";
import { computed, ref } from "vue";

import { usePlanFoldSummaries } from "@/features/planning/usePlanFoldSummaries";
import { mountComposable } from "@/tests/mountComponent";
import { building } from "@/tests/features/planning/usePlanCalculation.fixtures";
import { planViewContext } from "@/tests/features/planning/components/elements/planViewContext.fixtures";
import { planEmptyResult } from "@/features/planning/usePlanCalculation.types";
import plan from "@/locales/en_US/plan.json";
import game from "@/locales/en_US/game.json";

// Types & Interfaces
import type { IPlanViewContext } from "@/features/planning/usePlanView.types";
import type {
	IPlanResult,
	IProductionBuildingRecipe,
} from "@/features/planning/usePlanCalculation.types";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

function result(): IPlanResult {
	const r = structuredClone(planEmptyResult) as IPlanResult;
	r.cogc = "METALLURGY";
	r.area.permits = 3;
	Object.assign(r.workforce.pioneer, { required: 260, efficiency: 1 });
	Object.assign(r.workforce.settler, { required: 550, efficiency: 0.8667 });
	Object.assign(r.infrastructure, { HB1: 2, HBB: 6 });
	r.experts.Agriculture.amount = 1;
	r.experts.Chemistry.amount = 4;
	const recipe = {} as IProductionBuildingRecipe;
	r.production.buildings = [
		building("FRM", { amount: 4, activeRecipes: [recipe, recipe] }),
		building("EEP", { amount: 6, activeRecipes: [recipe] }),
	];
	return r;
}

async function summaries(over: Partial<IPlanViewContext> = {}) {
	const context = {
		...planViewContext({ result: result(), overview: { profit: -5323 } }),
		io: {
			ioTotals: computed(() => ({
				exports: 531795.86,
				imports: -483704.66,
			})),
			refIOSource: ref("all"),
		} as unknown as IPlanViewContext["io"],
		...over,
	};
	const { result: lines } = await mountComposable(
		() => usePlanFoldSummaries(context),
		{ messages: { plan, game } }
	);
	return lines;
}

describe("usePlanFoldSummaries", () => {
	it("says where each folded part stands", async () => {
		const lines = (await summaries()).value;
		expect(lines.planet).toBe("COGC METAL · 3 permits");
		expect(lines.workforce).toBe("PIO 100 % · SET 87 %");
		expect(lines.housing).toBe("2 HB1 · 6 HBB · Auto");
		// experts per field, as the workforce tile lists them
		expect(lines.experts).toBe("Agri 1 · Chem 4");
		expect(lines.production).toBe("2 buildings · 10 units · 3 recipes");
		expect(lines["material-io-totals"]).toBe("Profit / day -5,323.00");
	});

	it("names the empire only, not its exchange", async () => {
		const base = planViewContext();
		const lines = await summaries({
			empire: {
				...base.empire,
				uuid: ref("e-1"),
				list: ref([
					{ uuid: "e-1", empire_name: "Empire 0" },
				] as PlanEmpireElement[]),
				cxUuid: computed(() => "cx-1"),
			},
		});
		expect(lines.value.empire).toBe("Empire 0");
	});

	it("says nothing without an empire; exports and imports for a part of the base", async () => {
		const lines = await summaries({
			priceSource: computed(() => "Universe · VWAP 30D"),
			autoOptimizeHabs: ref(false),
			io: {
				ioTotals: computed(() => ({ exports: 10, imports: -2.5 })),
				refIOSource: ref("production"),
			} as unknown as IPlanViewContext["io"],
		});
		expect(lines.value.empire).toBeUndefined();
		expect(lines.value.housing).toBe("2 HB1 · 6 HBB");
		expect(lines.value["material-io-totals"]).toBe(
			"Exports 10.00 · Imports -2.50"
		);
	});
});
