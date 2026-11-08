import { describe, it, expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import PlanKpiElement from "@/features/planning/components/elements/PlanKpiElement.vue";
import PValue from "@/ui/components/PValue.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	experts,
	wf,
} from "@/tests/features/planning/usePlanCalculation.fixtures";
import {
	type IContextOptions,
	planViewContext,
	provideContext,
} from "@/tests/features/planning/components/elements/planViewContext.fixtures";
import { planEmptyResult } from "@/features/planning/usePlanCalculation.types";
import { formatPayback } from "@/util/numbers";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import plan from "@/locales/en_US/plan.json";

vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
}));

// Types & Interfaces
import type {
	IAreaResult,
	IExpertRecord,
	IPlanResult,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import type { ResultTile } from "@/features/planning/planView.util";

const AREA: IAreaResult = {
	permits: 2,
	areaUsed: 250,
	areaTotal: 500,
	areaLeft: 250,
};

// pioneers fully efficient, settlers at 86.7 %, technicians housed but
// not needed
const WORKFORCE: IWorkforceRecord = {
	pioneer: wf("pioneer", { required: 100, capacity: 100, efficiency: 1 }),
	settler: wf("settler", {
		required: 50,
		capacity: 60,
		left: 10,
		lux2: false,
		efficiency: 0.8667,
	}),
	technician: wf("technician", { capacity: 50, left: 50, lux1: false }),
	engineer: wf("engineer"),
	scientist: wf("scientist"),
};

function result(
	o: {
		area?: IAreaResult;
		workforce?: IWorkforceRecord;
		experts?: IExpertRecord;
	} = {}
): IPlanResult {
	return {
		...structuredClone(planEmptyResult),
		area: o.area ?? AREA,
		workforce: o.workforce ?? WORKFORCE,
		experts: o.experts ?? experts(),
		revenue: 5000,
		cost: 3765.5,
	};
}

async function mountTile(
	tile: ResultTile,
	o: Parameters<typeof result>[0] & IContextOptions = {}
) {
	const context = planViewContext({ result: result(o), ...o });
	const mounted = await mountComponent(
		PlanKpiElement,
		{ tile },
		// real texts, so the values in them show
		{ messages: { plan }, setup: provideContext(context) }
	);
	return { ...mounted, context };
}

// the efficiency, then each needed tier: text and whether it's short of beds
const shortFlags = (wrapper: VueWrapper) =>
	wrapper
		.findAll("[data-short]")
		.map((e) => [e.text(), e.attributes("data-short")]);

describe("PlanKpiElement", () => {
	it.each<[ResultTile, string]>([
		["profit", "profit-breakdown"],
		["payback", "construction-cart"],
		["workforce", "workforce"],
		["area", "planet"],
		["storage", "visitation-frequency"],
	])("is a button: %s opens %s", async (tile, element) => {
		const { wrapper, context } = await mountTile(tile);
		const button = wrapper.find(`[data-tile="${tile}"]`);
		expect(button.element.tagName).toBe("BUTTON");

		await button.trigger("click");

		expect(context.focusElement).toHaveBeenCalledWith(element);
		expect(trackEvent).toHaveBeenCalledWith("plan:result_tile_open", {
			tile,
		});
	});

	it("puts the sub line next to the figure from 360 px of its own width", async () => {
		const { wrapper } = await mountTile("profit");
		const body = wrapper.find("[data-tile] > div");
		// a container query: the tile's width, not the window's
		expect(body.classes()).toContain("flex-col");
		expect(body.classes()).toContain("@min-[360px]:flex-row");
	});

	it("shows the profit with revenue and cost", async () => {
		const { wrapper } = await mountTile("profit");

		expect(wrapper.text()).toContain("Profit / day");
		expect(wrapper.text()).toContain("+1,234.50");
		expect(wrapper.text()).toContain(
			"Revenue 5,000.00 · cost 3,765.50 incl. 12.00 degradation"
		);
	});

	it("shows a loss", async () => {
		const { wrapper } = await mountTile("profit", {
			overview: { profit: -20 },
		});
		expect(wrapper.text()).toContain("-20.00");
	});

	it("shows the payback and the build cost", async () => {
		const { wrapper } = await mountTile("payback");

		// 123.456 days
		expect(wrapper.text()).toContain("123.46 d");
		expect(wrapper.text()).toContain(formatPayback(123.456));
		expect(wrapper.find("[data-build-cost]").text()).toContain(
			"1,500,000 ȼ build cost"
		);
	});

	it("shows a payback that never comes", async () => {
		const { wrapper } = await mountTile("payback", {
			overview: { roi: Infinity },
		});
		expect(wrapper.text()).toContain(formatPayback(Infinity));
		expect(wrapper.text()).not.toContain(" d");
	});

	it("shows the lowest efficiency of the needed workforce", async () => {
		const { wrapper } = await mountTile("workforce");

		// settler 0.8667 -> 86.7 %; the unneeded technicians (efficiency 0)
		// don't count, or it would read 0.0 %
		expect(wrapper.text()).toContain("Workforce");
		expect(shortFlags(wrapper)).toEqual([
			["86.7 %", "false"],
			["PIO 100/100", "false"],
			["SET 50/60", "false"],
		]);
		// technicians have beds but aren't needed, so they don't show
		expect(wrapper.find("[data-workforce-tiers]").text()).toBe(
			"PIO 100/100 · SET 50/60"
		);
	});

	it("shows no efficiency without needed workforce", async () => {
		const { wrapper } = await mountTile("workforce", {
			workforce: {
				...WORKFORCE,
				pioneer: wf("pioneer"),
				settler: wf("settler"),
			},
		});
		expect(wrapper.text()).toContain("—");
		expect(wrapper.text()).not.toContain("%");
		expect(wrapper.find("[data-workforce-tiers]").text()).toBe("");
	});

	it("reds the efficiency and a tier short of beds", async () => {
		// 80 settlers in 60 beds leaves 60 - 80 = -20
		const { wrapper } = await mountTile("workforce", {
			workforce: {
				...WORKFORCE,
				settler: wf("settler", {
					required: 80,
					capacity: 60,
					left: -20,
					efficiency: 0.5,
				}),
			},
		});
		expect(shortFlags(wrapper)).toEqual([
			["50.0 %", "true"],
			["PIO 100/100", "false"],
			["SET 80/60", "true"],
		]);
	});

	it("lists the placed experts in one line, the same on hover", async () => {
		const { wrapper } = await mountTile("workforce", {
			experts: experts({ Agriculture: [1], Chemistry: [4] }),
		});
		const line = wrapper.find("[data-experts]");
		// experts at 0 don't show
		expect(line.text()).toBe("Agri 1 · Chem 4");
		expect(line.attributes("title")).toBe("Agri 1 · Chem 4");
	});

	it("shows no expert line without experts", async () => {
		const { wrapper } = await mountTile("workforce");
		expect(wrapper.find("[data-experts]").exists()).toBe(false);
	});

	it("shows the used of the total area", async () => {
		const { wrapper } = await mountTile("area");
		expect(wrapper.text()).toContain("250");
		expect(wrapper.text()).toContain("/ 500");
		// 250 / 500
		expect(wrapper.find("[role=img] > div").attributes("style")).toContain(
			"width: 50%"
		);
	});

	// red only above the total: 520 of 500 leaves 500 - 520 = -20
	it.each([
		[250, 250, "false"],
		[500, 0, "false"],
		[520, -20, "true"],
	])(
		"marks %i used area (%i left) as over: %s",
		async (areaUsed, areaLeft, over) => {
			const { wrapper } = await mountTile("area", {
				area: { ...AREA, areaUsed, areaLeft },
			});
			const used = wrapper.find("[data-over]");
			expect(used.text()).toBe(String(areaUsed));
			expect(used.attributes("data-over")).toBe(over);
		}
	);

	it("shows the profit per used area", async () => {
		const { wrapper } = await mountTile("area");
		const perArea = wrapper.find("[data-profit-area]");
		// 1,234.5 / 250 = 4.938
		expect(perArea.findComponent(PValue).text()).toBe("+4.94");
		expect(perArea.text()).toContain("ȼ profit / area");
		expect(perArea.text()).not.toContain("Empire");
	});

	it("shows no profit per area without used area", async () => {
		const { wrapper } = await mountTile("area", {
			area: { ...AREA, areaUsed: 0, areaLeft: 500 },
		});
		expect(
			wrapper.find("[data-profit-area]").findComponent(PValue).text()
		).toBe("0.00");
	});

	it("shows the empire average only when given", async () => {
		const { wrapper } = await mountTile("area", { profitPerArea: 3.2 });
		expect(wrapper.find("[data-profit-area]").text()).toContain(
			"Empire +3.20"
		);
	});

	it("shows the storage days and the weight in and out, volume on hover", async () => {
		const { wrapper } = await mountTile("storage");
		// 12.345 -> 12.3 days, 1 t in, 4.56 t -> 4.6 out, 1 m³ in, 7.04 m³ -> 7.0 out
		expect(wrapper.text()).toContain("12.3");
		expect(wrapper.text()).toContain("days to full");
		const note = wrapper.find("[title]");
		// the numbers keep to their units with no-break spaces
		const plain = (s?: string) => s?.replace(/\u00a0/g, " ");
		expect(plain(note.text())).toBe("1.0 t in · 4.6 t out / day");
		expect(plain(note.attributes("title"))).toBe(
			"1.0 m³ in · 7.0 m³ out / day"
		);
	});
});
