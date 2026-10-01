import { describe, it, expect } from "vitest";

import PlanStatusBar from "@/features/planning/components/PlanStatusBar.vue";
import { mountComponent } from "@/tests/mountComponent";
import type { IExpertRecord } from "@/features/planning/usePlanCalculation.types";

function experts(set: Record<string, number> = {}): IExpertRecord {
	return Object.fromEntries(
		["Chemistry", "Metallurgy", "Resource_Extraction"].map((name) => [
			name,
			{ name, amount: set[name] ?? 0, bonus: 0 },
		])
	) as unknown as IExpertRecord;
}

async function mountBar(props: Record<string, unknown> = {}) {
	return mountComponent(PlanStatusBar, {
		areaData: { permits: 1, areaUsed: 694, areaTotal: 750, areaLeft: 56 },
		corphq: true,
		cogc: "---",
		expertData: experts({ Chemistry: 5, Resource_Extraction: 1 }),
		overviewData: { profit: 128566.87 },
		...props,
	});
}

describe("PlanStatusBar", () => {
	it("shows area with what is free, and profit per day", async () => {
		const { wrapper } = await mountBar();
		const text = wrapper.text();

		expect(text).toContain("694 / 750");
		expect(text).toContain("plan.components.status.area_free");
		expect(text).toContain("+128,566.87");
		expect(text).toContain("plan.components.status.per_day");
	});

	it("flags area over the limit", async () => {
		const { wrapper } = await mountBar({
			areaData: { permits: 1, areaUsed: 760, areaTotal: 750, areaLeft: -10 },
		});

		const over = wrapper.find(".text-negative.pl-1");
		expect(over.text()).toBe("plan.components.status.area_over");
	});

	it("spells experts out on wide screens, abbreviated below", async () => {
		const { wrapper } = await mountBar();

		expect(wrapper.find(".\\@6xl\\:inline").text()).toBe(
			"5 game.expertise.CHEMISTRY, 1 game.expertise.RESOURCE_EXTRACTION"
		);
		expect(wrapper.find(".\\@6xl\\:hidden").text()).toBe(
			"5xChem, 1xReso"
		);
	});

	it("says None without experts", async () => {
		const { wrapper } = await mountBar({ expertData: experts() });

		expect(wrapper.text()).toContain("plan.components.status.experts_none");
	});
});
