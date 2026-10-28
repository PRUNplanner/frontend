import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import type { VueWrapper } from "@vue/test-utils";

import PlanResultsBar from "@/features/planning/components/PlanResultsBar.vue";
import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";
import { mountComponent } from "@/tests/mountComponent";
import { formatPayback } from "@/util/numbers";
import { ExpertTypeSchema } from "@/features/api/schemas/planningData.schemas";
import plan from "@/locales/en_US/plan.json";

// Types & Interfaces
import type { ExpertType } from "@/features/api/schemas/planningData.schemas";
import type {
	IAreaResult,
	IExpertRecord,
	IOverviewData,
	IVisitationData,
	IWorkforceElement,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import type { IPlanCompare } from "@/features/sharing/sharedPlan.types";
import type { ResultTile } from "@/features/planning/planView.util";

// has its own test
vi.mock("@/features/sharing/components/SharedPlanDeltas.vue", () => ({
	default: {
		name: "SharedPlanDeltas",
		props: { compare: Object },
		render: () => h("div"),
	},
}));

const OVERVIEW: IOverviewData = {
	dailyCost: 3765.5,
	dailyProfit: 1234.5,
	totalConstructionCost: 1500000,
	dailyDegradationCost: 12,
	profit: 1234.5,
	roi: 123.456,
};

const AREA: IAreaResult = {
	permits: 2,
	areaUsed: 250,
	areaTotal: 500,
	areaLeft: 250,
};

const VISITATION: IVisitationData = {
	storageFilled: 12.345,
	dailyWeightImport: 1,
	dailyWeightExport: 4.56,
	dailyVolumeImport: 1,
	dailyVolumeExport: 7.04,
	dailyWeight: 5.56,
	dailyVolume: 8.04,
};

const wf = (
	name: IWorkforceElement["name"],
	data: Partial<IWorkforceElement> = {}
): IWorkforceElement => ({
	name,
	required: 0,
	capacity: 0,
	left: 0,
	lux1: true,
	lux2: true,
	efficiency: 0,
	...data,
});

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

/** every expert at 0, the given ones at their amount */
const experts = (
	amounts: Partial<Record<ExpertType, number>> = {}
): IExpertRecord =>
	Object.fromEntries(
		ExpertTypeSchema.options.map((name) => [
			name,
			{ name, amount: amounts[name] ?? 0, bonus: 0 },
		])
	) as IExpertRecord;

async function mountBar(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanResultsBar,
		{
			overview: OVERVIEW,
			area: AREA,
			visitation: VISITATION,
			workforce: WORKFORCE,
			experts: experts(),
			revenue: 5000,
			cost: 3765.5,
			...props,
		},
		// real texts, so the values in them show
		{ messages: { plan } }
	);
}

const tile = (wrapper: VueWrapper, key: ResultTile) =>
	wrapper.find(`[data-tile="${key}"]`);

describe("PlanResultsBar", () => {
	it("shows five tiles as buttons, each opening its own figure", async () => {
		const { wrapper, component } = await mountBar();
		const tiles = wrapper.findAll("[data-tile]");

		expect(tiles.map((t) => t.attributes("data-tile"))).toEqual([
			"profit",
			"payback",
			"workforce",
			"area",
			"storage",
		]);
		for (const t of tiles) {
			expect(t.element.tagName).toBe("BUTTON");
			await t.trigger("click");
		}
		// one open per click, carrying the clicked tile's key
		expect(component.emitted("open")).toEqual([
			["profit"],
			["payback"],
			["workforce"],
			["area"],
			["storage"],
		]);
	});

	it("shows the profit with revenue and cost", async () => {
		const { wrapper } = await mountBar();
		const profit = tile(wrapper, "profit");

		expect(profit.text()).toContain("Profit / day");
		expect(profit.text()).toContain("+1,234.50");
		expect(profit.find(".text-positive").exists()).toBe(true);
		// a phone's tile shows it without the cents, the other is hidden there
		const short = profit.find("[data-profit-short]");
		expect(short.text()).toBe("+1,235");
		expect(short.classes()).toContain("@min-[30rem]:hidden");
		expect(profit.text()).toContain(
			"Revenue\u00a05,000.00 · cost\u00a03,765.50 incl.\u00a012.00\u00a0degradation"
		);
	});

	it("colors a loss negative", async () => {
		const { wrapper } = await mountBar({
			overview: { ...OVERVIEW, profit: -20 },
		});
		const profit = tile(wrapper, "profit");

		expect(profit.text()).toContain("-20.00");
		expect(profit.find(".text-negative").exists()).toBe(true);
		expect(profit.find(".text-positive").exists()).toBe(false);
	});

	it("shows the payback and the build cost", async () => {
		const { wrapper } = await mountBar();
		const payback = tile(wrapper, "payback");

		// 123.456 days
		expect(payback.text()).toContain("123.46 d");
		expect(payback.text()).toContain(formatPayback(123.456));
		expect(payback.text()).toContain("Build 1,500,000 ȼ");
	});

	it("shows a payback that never comes", async () => {
		const { wrapper } = await mountBar({
			overview: { ...OVERVIEW, roi: Infinity },
		});
		const payback = tile(wrapper, "payback");

		expect(payback.text()).toContain(formatPayback(Infinity));
		expect(payback.text()).not.toContain(" d");
	});

	it("shows the lowest efficiency of the needed workforce", async () => {
		const { wrapper } = await mountBar();
		const workforce = tile(wrapper, "workforce");

		// settler 0.8667 -> 86.7 %; the unneeded technicians (efficiency 0)
		// don't count, or it would read 0.0 %
		expect(workforce.text()).toContain("Workforce");
		expect(workforce.text()).toContain("86.7 %");
		expect(workforce.find(".text-negative\\!").exists()).toBe(false);
	});

	it("shows no efficiency without needed workforce", async () => {
		const { wrapper } = await mountBar({
			workforce: {
				...WORKFORCE,
				pioneer: wf("pioneer"),
				settler: wf("settler"),
			},
		});
		const workforce = tile(wrapper, "workforce");

		expect(workforce.text()).toContain("—");
		expect(workforce.text()).not.toContain("%");
		expect(workforce.find("[data-workforce-tiers]").text()).toBe("");
	});

	it("lists the needed tiers as workers of beds", async () => {
		const { wrapper } = await mountBar();
		const tiers = tile(wrapper, "workforce").find("[data-workforce-tiers]");

		// technicians have beds but aren't needed, so they don't show
		expect(tiers.text()).toBe("PIO 100/100 · SET 50/60");
		expect(tiers.find(".text-negative").exists()).toBe(false);
	});

	it("reds the efficiency and a tier short of beds", async () => {
		// 80 settlers in 60 beds leaves 60 - 80 = -20
		const { wrapper } = await mountBar({
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
		const workforce = tile(wrapper, "workforce");

		// 0.5 is now the lowest
		expect(workforce.find(".text-negative\\!").text()).toBe("50.0 %");
		const tiers = workforce.find("[data-workforce-tiers]");
		expect(tiers.text()).toBe("PIO 100/100 · SET 80/60");
		// only the short tier is red
		expect(tiers.findAll(".text-negative").map((p) => p.text())).toEqual([
			"SET 80/60",
		]);
	});

	it("lists the placed experts in one line, the same on hover", async () => {
		const { wrapper } = await mountBar({
			experts: experts({ Agriculture: 1, Chemistry: 4 }),
		});
		const line = tile(wrapper, "workforce").find("[data-experts]");

		// experts at 0 don't show
		expect(line.text()).toBe("Agri 1 · Chem 4");
		expect(line.attributes("title")).toBe("Agri 1 · Chem 4");
	});

	it("shows no expert line without experts", async () => {
		const { wrapper } = await mountBar();

		expect(tile(wrapper, "workforce").find("[data-experts]").exists()).toBe(
			false
		);
	});

	it("shows the used of the total area", async () => {
		const { wrapper } = await mountBar();
		const area = tile(wrapper, "area");

		expect(area.text()).toContain("250");
		expect(area.text()).toContain("/ 500");
		expect(area.find(".text-negative").exists()).toBe(false);
		// 250 / 500
		expect(area.find("[role=img] > div").attributes("style")).toContain(
			"width: 50%"
		);
	});

	it("colors overused area negative", async () => {
		// 520 used of 500 leaves 500 - 520 = -20
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 520, areaLeft: -20 },
		});

		expect(tile(wrapper, "area").find(".text-negative").text()).toBe("520");
	});

	it("keeps exactly full area neutral", async () => {
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 500, areaLeft: 0 },
		});

		expect(tile(wrapper, "area").find(".text-negative").exists()).toBe(false);
	});

	it("shows the profit per used area", async () => {
		const { wrapper } = await mountBar();
		const perArea = tile(wrapper, "area").find("[data-profit-area]");

		// 1,234.5 / 250 = 4.938
		expect(perArea.find(".text-sm").text()).toBe("+4.94");
		expect(perArea.text()).toContain("ȼ profit / area");
		expect(perArea.text()).not.toContain("Empire");
	});

	it("shows no profit per area without used area", async () => {
		const { wrapper } = await mountBar({
			area: { ...AREA, areaUsed: 0, areaLeft: 500 },
		});

		expect(
			tile(wrapper, "area").find("[data-profit-area] .text-sm").text()
		).toBe("0.00");
	});

	it("shows the empire average only when given", async () => {
		const { wrapper } = await mountBar({ empireProfitPerArea: 3.2 });

		expect(tile(wrapper, "area").find("[data-profit-area]").text()).toContain(
			"Empire +3.20"
		);
	});

	it("shows the storage days and the weight in and out, volume on hover", async () => {
		const { wrapper } = await mountBar();
		const storage = tile(wrapper, "storage");

		// 12.345 -> 12.3 days, 1 t in, 4.56 t -> 4.6 out, 1 m³ in, 7.04 m³ -> 7.0 out
		expect(storage.text()).toContain("12.3");
		expect(storage.text()).toContain("days to full");
		const note = storage.find("[title]");
		expect(note.text()).toBe("1.0 t in · 4.6 t out / day");
		expect(note.attributes("title")).toBe(
			"1.0 m³ in · 7.0 m³ out / day"
		);
	});

	it("shows the shared plan's deltas only with a comparison", async () => {
		const { wrapper, setProps } = await mountBar();
		expect(wrapper.findComponent(SharedPlanDeltas).exists()).toBe(false);

		const compare: IPlanCompare = {
			before: { profit: 1, roi: 2, area: 3, workforce: 4, buildings: 5 },
			after: { profit: 2, roi: 2, area: 3, workforce: 4, buildings: 5 },
		};
		await setProps({ compare });

		expect(wrapper.findComponent(SharedPlanDeltas).props("compare")).toEqual(
			compare
		);
	});
});
