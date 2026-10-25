import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";
import { createPinia } from "pinia";

import { usePlanningStore } from "@/stores/planningStore";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import PlanCheckMarket from "@/features/planning/components/tools/PlanCheckMarket.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	emptyPlan,
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

// Types & Interfaces
import type { IMarketCheck } from "@/features/cx/marketCheck.types";
import type { IPlanContext } from "@/features/planning/engine/engine.types";
import type { IPlanInput } from "@/features/planning/engine/engine.types";

type WhatIf = typeof import("@/features/planning/util/whatIf.util");

const { marketCheckMock, realisticPlanMock } = vi.hoisted(() => ({
	marketCheckMock: vi.fn(),
	realisticPlanMock: vi.fn(),
}));
// the checks and the real prices are crafted, the plan itself is calculated
vi.mock("@/features/cx/marketCheck.util", async (importActual) => ({
	...(await importActual<typeof import("@/features/cx/marketCheck.util")>()),
	marketCheck: marketCheckMock,
}));
vi.mock("@/features/planning/util/whatIf.util", async (importActual) => ({
	...(await importActual<WhatIf>()),
	realisticPlan: realisticPlanMock,
}));

const PLANET = planet_etherwind.planet_natural_id;
const CX_UUID = "cx-fixed";

const chk = (
	ticker: string,
	over: Partial<IMarketCheck> = {}
): IMarketCheck => ({
	ticker,
	delta: 10,
	exchange: "AI1",
	sharePct: 5,
	traded30d: 3000,
	traded7d: 700,
	bid: 1020,
	ask: 1100,
	spreadPct: 7.3,
	flags: [],
	level: null,
	...over,
});
const red = (ticker: string, over: Partial<IMarketCheck> = {}) =>
	chk(ticker, { flags: ["no_trades"], level: "red", ...over });

// FE sold much more than the exchange takes, RAT bought on a large share,
// DW without exchange data, ZZZ is not a game material
const FLAGGED = [
	red("FE", { sharePct: 80, flags: ["bigger", "stale"] }),
	chk("RAT", {
		delta: -5,
		exchange: "CI1",
		sharePct: 20,
		flags: ["large_share"],
		level: "amber",
	}),
	chk("DW", {
		delta: -1,
		exchange: "UNIVERSE",
		sharePct: null,
		bid: 0,
		ask: 0,
		spreadPct: null,
		flags: ["all_exchanges"],
		level: "muted",
	}),
	chk("ZZZ"),
];

let whatIf: WhatIf;

/** the real prices: the plan's own calculation, its profit moved by `shift` */
function realPrices(
	shift: number,
	kept: { zero?: string[]; fallback?: string[]; universe?: string[] } = {}
) {
	realisticPlanMock.mockImplementation(
		(input: IPlanInput, ctx: IPlanContext) => {
			const calculation = calculatePlan(
				{ ...input, recipeOptions: false },
				ctx
			);
			return {
				calculation: {
					...calculation,
					overview: {
						...calculation.overview,
						profit: calculation.overview.profit + shift,
					},
				},
				kept: {
					zero: new Set(kept.zero),
					fallback: new Set(kept.fallback),
					universe: new Set(kept.universe),
				},
			};
		}
	);
}

async function mountTool(
	checks: IMarketCheck[],
	{ cx = true, plan = etherwindPlan(), own = false } = {}
) {
	marketCheckMock.mockReturnValue(checks);
	const pinia = createPinia();
	usePlanningStore(pinia).setCXs([
		// @ts-expect-error mock data
		{
			uuid: CX_UUID,
			cx_name: "Fixed",
			empires: [],
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: [],
				// RAT fixed on this planet, the rest from Universe
				ticker_planets: [
					{
						planet: PLANET,
						preferences: [
							{ type: "BOTH", ticker: "RAT", value: 5 },
						],
					},
				],
			},
		},
	]);
	const { wrapper } = await mountComponent(
		PlanCheckMarket,
		{
			plan,
			empire: undefined,
			cxUuid: cx ? CX_UUID : undefined,
			planet: planet_etherwind,
			own,
		},
		{ pinia }
	);
	return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountTool>>;
const ruleLinks = (w: Wrapper) =>
	w
		.findAllComponents(RouterLinkStub)
		.filter((l) => l.attributes("data-rule-link") !== undefined);
const means = (w: Wrapper) => w.find("[data-market-means]");
const cards = (w: Wrapper) => w.findAll("[data-market-cards] > li");

describe("PlanCheckMarket", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
		whatIf = await vi.importActual<WhatIf>(
			"@/features/planning/util/whatIf.util"
		);
	});

	beforeEach(() => {
		marketCheckMock.mockReset().mockReturnValue([]);
		realisticPlanMock.mockReset();
		realisticPlanMock.mockImplementation((...args: unknown[]) =>
			(whatIf.realisticPlan as (...a: unknown[]) => unknown)(...args)
		);
	});

	it("tells an empty plan has nothing to check", async () => {
		const wrapper = await mountTool([]);

		expect(wrapper.text()).toContain("plan.tools.plan_check.market.empty");
		expect(wrapper.find("table").exists()).toBe(false);
		expect(wrapper.find("[data-exchange-caption]").text()).toBe(
			"cx.market_flags.exchange.all"
		);
	});

	it("lists every material with its numbers, flag and chip", async () => {
		const wrapper = await mountTool(FLAGGED);
		const rows = tableRows(wrapper);

		expect(rows.map((r) => r.material)).toEqual(["FE", "RAT", "DW", "ZZZ"]);
		expect(rows.map((r) => r.side)).toEqual([
			"plan.tools.plan_check.side.sell",
			"plan.tools.plan_check.side.buy",
			"plan.tools.plan_check.side.buy",
			"plan.tools.plan_check.side.sell",
		]);
		expect(rows[0].per_day).toBe("10.00");
		expect(rows[0].share).toContain("80.0 %");
		expect(rows[0].traded).toBe("3,000");
		expect(rows[0].bid_ask).toBe("1,020 · 1,100");
		expect(rows[0].spread).toBe("7.3 %");
		expect(rows[0].check).toContain("cx.market_flags.flags.bigger");
		// without exchange data
		expect(rows[2].share).toContain("—");
		expect(rows[2].bid_ask).toBe(
			"cx.market_flags.popover.none · cx.market_flags.popover.none"
		);
		expect(rows[2].spread).toBe("cx.market_flags.popover.none");
		// not flagged
		expect(rows[3].check).toBe("plan.tools.plan_check.market.ok");

		const body = wrapper.findAll("tbody tr");
		expect(body[0].find("span").classes()).toContain(
			"material-category-metals"
		);
		expect(body[3].find("span").classes()).toContain("bg-black/40");
		// bigger is red, a large share amber, the rest plain
		const share = (i: number) => body[i].find(".w-14").classes();
		expect(share(0)).toEqual(expect.arrayContaining(["text-negative"]));
		expect(share(1)).toEqual(expect.arrayContaining(["text-warning"]));
		expect(share(2)).not.toContain("font-bold");
	});

	it("names the exchanges the plan is checked against", async () => {
		const wrapper = await mountTool(FLAGGED);

		// AI1 and CI1, UNIVERSE is no exchange of its own
		expect(wrapper.find("[data-exchange-caption]").text()).toBe(
			"cx.market_flags.exchange.many"
		);

		const one = await mountTool([FLAGGED[0]]);
		expect(one.find("[data-exchange-caption]").text()).toBe(
			"cx.market_flags.exchange.one"
		);

		const all = await mountTool([FLAGGED[2]]);
		expect(all.find("[data-exchange-caption]").text()).toBe(
			"cx.market_flags.exchange.all"
		);
	});

	it("links a flagged material to the rule that prices it", async () => {
		const wrapper = await mountTool(FLAGGED, { own: true });

		// FE, RAT and DW are flagged, ZZZ is not; table and cards each
		const links = ruleLinks(wrapper).map((l) => l.props("to"));
		expect(links).toHaveLength(6);
		expect(wrapper.find("[data-rule-source]").exists()).toBe(false);
		expect(
			links.filter((l) => l === `/exchanges/${CX_UUID}?scope=${PLANET}`)
		).toHaveLength(2);
		expect(
			links.filter((l) => l === `/exchanges/${CX_UUID}?scope=all`)
		).toHaveLength(4);
		const zzz = wrapper
			.findAll("tbody tr")
			.find((r) => r.text().startsWith("ZZZ"))!;
		expect(zzz.findComponent(RouterLinkStub).exists()).toBe(false);
	});

	// a shared or read-only plan: the viewer can't open the owner's CX
	it("names the rule as text, not a link, on a plan not the viewer's", async () => {
		const owner = await mountTool(FLAGGED, { own: true });
		const wrapper = await mountTool(FLAGGED);

		expect(ruleLinks(wrapper)).toHaveLength(0);
		const sources = wrapper.findAll("[data-rule-source]");
		expect(sources.map((s) => s.text())).toEqual(
			ruleLinks(owner).map((l) => l.text())
		);
		expect(sources).toHaveLength(6);
	});

	it("has no rule links and points to the CX setting without one", async () => {
		const wrapper = await mountTool(FLAGGED, { cx: false });

		expect(ruleLinks(wrapper)).toHaveLength(0);
		expect(wrapper.find("[data-exchange-caption]").exists()).toBe(false);
		expect(wrapper.text()).toContain("cx.market_flags.exchange.no_cx");
		// a shared or read-only plan: setting the viewer's CX doesn't apply
		expect(wrapper.find("[data-set-cx]").exists()).toBe(false);

		const own = await mountTool(FLAGGED, { cx: false, own: true });
		const setCx = own.findAll("[data-set-cx]");
		expect(setCx).toHaveLength(2);
		expect(setCx[0].text()).toBe("cx.market_flags.exchange.set_cx");
	});

	it("explains the worst check by its flag and the side it trades on", async () => {
		const sells = await mountTool(FLAGGED);
		expect(means(sells).text()).toContain(
			"cx.market_flags.means.bigger_sell"
		);
		// 1 red, 1 amber, the rest (incl. the muted one) fine
		expect(
			means(sells)
				.findAll("dd")
				.map((d) => d.text())
		).toEqual(["1", "1", "2"]);
		expect(means(sells).find("dd.text-negative").exists()).toBe(true);
		expect(means(sells).find("dd.text-warning").exists()).toBe(true);

		const buys = await mountTool([
			chk("RAT", {
				delta: -5,
				sharePct: 30,
				flags: ["large_share"],
				level: "amber",
			}),
		]);
		expect(means(buys).text()).toContain(
			"cx.market_flags.means.large_share_buy"
		);
		expect(means(buys).find("dd.text-negative").exists()).toBe(false);

		// other flags have one text, UNIVERSE is named as all exchanges
		const plain = await mountTool([
			red("FE", { exchange: "UNIVERSE", flags: ["no_price"] }),
		]);
		expect(means(plain).text()).toContain("cx.market_flags.means.no_price");
		expect(means(plain).find("dd.text-warning").exists()).toBe(false);
	});

	it("calls a plan fine when its worst check is only a note", async () => {
		const wrapper = await mountTool([FLAGGED[2], FLAGGED[3]]);

		expect(means(wrapper).text()).toContain(
			"plan.tools.plan_check.market.means.fine"
		);
		expect(
			means(wrapper)
				.findAll("dd")
				.map((d) => d.text())
		).toEqual(["0", "0", "2"]);
	});

	it("shows 6 cards and the rest on request", async () => {
		const wrapper = await mountTool(
			Array.from({ length: 9 }, (_, i) => chk(`M${i}`))
		);

		expect(cards(wrapper)).toHaveLength(7);
		const more = wrapper.find("[data-market-cards] button");
		expect(more.text()).toBe("plan.tools.plan_check.market.more");
		await more.trigger("click");

		expect(cards(wrapper)).toHaveLength(9);
		expect(wrapper.find("[data-market-cards] button").exists()).toBe(false);
	});

	it("shows every flagged card even beyond 6", async () => {
		const wrapper = await mountTool(
			Array.from({ length: 8 }, (_, i) => red(`M${i}`))
		);

		expect(cards(wrapper)).toHaveLength(8);
		expect(wrapper.find("[data-market-cards] button").exists()).toBe(false);
	});

	it("shows a card's side, flag, traded volume and prices", async () => {
		const wrapper = await mountTool([FLAGGED[0], FLAGGED[3]]);
		const [flagged, fine] = cards(wrapper);

		expect(flagged.classes()).toContain("border-negative/60");
		expect(flagged.text()).toContain("cx.market_flags.flags.bigger");
		expect(flagged.text()).toContain(
			"plan.tools.plan_check.market.card_side"
		);
		expect(fine.classes()).toContain("border-white/10");
		expect(fine.text()).toContain("plan.tools.plan_check.market.ok");
		expect(fine.find("span").classes()).toContain("bg-black/40");
	});

	describe("at real prices", () => {
		const real = (w: Wrapper) => w.find("[data-real-prices]");

		it("shows the gain and what stayed at plan prices", async () => {
			realPrices(500, {
				// OFF is not traded, so only FE is listed as kept
				zero: ["FE", "OFF"],
				fallback: ["RAT"],
				universe: ["DW"],
			});
			const wrapper = await mountTool(FLAGGED);

			const diff = real(wrapper).findAll("dd")[2];
			expect(diff.text()).toMatch(/^\+500 ȼ\s+\(\+/);
			expect(diff.classes()).toContain("text-positive");
			expect(real(wrapper).text()).toContain("real.kept_zero");
			expect(real(wrapper).text()).toContain("real.kept_fallback");
			expect(real(wrapper).find("[data-kept-universe]").exists()).toBe(
				true
			);
			expect(real(wrapper).text()).not.toContain("real.no_cx");
		});

		it("colours a loss, and a plan that matches the exchange stays plain", async () => {
			realPrices(-500);
			const loss = await mountTool(FLAGGED);
			const diff = real(loss).findAll("dd")[2];
			expect(diff.text()).toMatch(/^[-−]500 ȼ/);
			expect(diff.classes()).toContain("text-negative");

			realPrices(0);
			const same = await mountTool(FLAGGED);
			const none = real(same).findAll("dd")[2];
			expect(none.classes()).not.toContain("text-positive");
			expect(none.classes()).not.toContain("text-negative");
		});

		it("lists nothing as kept that the plan does not trade", async () => {
			realPrices(0, {
				zero: ["OFF"],
				fallback: ["OFF"],
				universe: ["OFF"],
			});
			const wrapper = await mountTool(FLAGGED);

			expect(real(wrapper).text()).not.toContain("real.kept");
			expect(real(wrapper).find("[data-kept-universe]").exists()).toBe(
				false
			);
		});

		it("gives no percentage when the plan has no profit", async () => {
			realPrices(100);
			const wrapper = await mountTool(FLAGGED, { plan: emptyPlan() });

			const diff = real(wrapper).findAll("dd")[2];
			expect(diff.text()).toBe("+100 ȼ");
		});
	});
});
