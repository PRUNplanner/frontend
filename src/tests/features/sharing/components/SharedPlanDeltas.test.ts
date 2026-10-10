import { describe, it, expect } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";
import { mountComponent } from "@/tests/mountComponent";
import sharing from "@/locales/en_US/sharing.json";

// Types & Interfaces
import type { IPlanFigures } from "@/features/sharing/sharedPlan.types";

const BEFORE: IPlanFigures = {
	profit: 100,
	roi: 20,
	area: 500,
	workforce: 1000,
	buildings: 10,
};

async function mountDeltas(after: Partial<IPlanFigures>, before = BEFORE) {
	const { wrapper } = await mountComponent(
		SharedPlanDeltas,
		{ compare: { before, after: { ...before, ...after } } },
		{ messages: { sharing } }
	);
	return wrapper;
}

/** each delta as its text and color */
function deltas(wrapper: VueWrapper) {
	return wrapper.findAll("span.font-bold").map((span) => {
		const color = ["text-positive", "text-negative", "text-muted-strong"];
		return [span.text(), color.find((c) => span.classes().includes(c))];
	});
}

describe("SharedPlanDeltas", () => {
	it("shows nothing for an unchanged copy", async () => {
		const wrapper = await mountDeltas({});

		expect(wrapper.text()).toBe("");
		expect(deltas(wrapper)).toEqual([]);
	});

	it("shows what got better, area and workforce neutral", async () => {
		const wrapper = await mountDeltas({
			profit: 1334.567,
			roi: 15.5,
			area: 520,
			workforce: 950,
		});

		expect(wrapper.find("span.text-muted").text()).toBe("vs. shared:");
		// buildings unchanged, left out
		expect(deltas(wrapper)).toEqual([
			["+1,234.57 ȼ/day", "text-positive"],
			["ROI 20.00 d → 15.50 d", "text-positive"],
			["Area +20", "text-muted-strong"],
			["Workforce -50", "text-muted-strong"],
		]);
	});

	it("shows what got worse, a payback that never happens worst", async () => {
		const wrapper = await mountDeltas({
			profit: 60,
			roi: -1,
			buildings: 12,
		});

		expect(deltas(wrapper)).toEqual([
			["-40 ȼ/day", "text-negative"],
			["ROI 20.00 d → never", "text-negative"],
			["Buildings +2", "text-muted-strong"],
		]);
	});

	it("a payback that starts to happen is better", async () => {
		const wrapper = await mountDeltas({ roi: 30 }, { ...BEFORE, roi: -5 });

		expect(deltas(wrapper)).toEqual([
			["ROI never → 30.00 d", "text-positive"],
		]);
	});

	it("ignores rounding noise and never → never", async () => {
		// negative and infinite payback both mean never
		const wrapper = await mountDeltas(
			{ profit: 100.004, roi: -1 },
			{ ...BEFORE, roi: Infinity }
		);

		expect(wrapper.text()).toBe("");
	});

	it("shows a profit change of half a cent", async () => {
		const wrapper = await mountDeltas(
			{ profit: 0.005 },
			{ ...BEFORE, profit: 0 }
		);

		expect(deltas(wrapper)).toEqual([["+0.01 ȼ/day", "text-positive"]]);
	});
});
