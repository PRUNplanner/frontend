import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import { usePlanningStore } from "@/stores/planningStore";
import PlanCheck from "@/features/planning/components/tools/PlanCheck.vue";
import PlanCheckCompare from "@/features/planning/components/tools/PlanCheckCompare.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { PSelect, PSpin } from "@/ui";

// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PSelectOption } from "@/ui/ui.types";
import type { IMarketCheck } from "@/features/cx/marketCheck.types";
import type {
	ICompareRow,
	IMaterialChange,
	IPaybackOfDifference,
} from "@/features/planning/util/whatIf.types";

// test data
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";
import {
	etherwindPlan,
	setupPlanningTestData,
} from "@/tests/features/planning/usePlanCalculation.fixtures";

// figures, material changes, payback and market checks that tests craft;
// without them the real calculation runs
const crafted = vi.hoisted(() => ({
	rows: undefined as unknown,
	changes: undefined as unknown,
	payback: undefined as unknown,
	// this plan's checks, then the other plan's
	checks: undefined as unknown,
	calls: 0,
}));
vi.mock("@/features/planning/util/whatIf.util", async (importActual) => {
	const actual =
		await importActual<
			typeof import("@/features/planning/util/whatIf.util")
		>();
	return {
		...actual,
		compareRows: (...args: Parameters<typeof actual.compareRows>) =>
			(crafted.rows as ICompareRow[] | undefined) ??
			actual.compareRows(...args),
		materialChanges: (...args: Parameters<typeof actual.materialChanges>) =>
			(crafted.changes as IMaterialChange[] | undefined) ??
			actual.materialChanges(...args),
		paybackOfDifference: (
			...args: Parameters<typeof actual.paybackOfDifference>
		) =>
			(crafted.payback as IPaybackOfDifference | undefined) ??
			actual.paybackOfDifference(...args),
	};
});
vi.mock("@/features/cx/marketCheck.util", async (importActual) => {
	const actual =
		await importActual<typeof import("@/features/cx/marketCheck.util")>();
	return {
		...actual,
		marketCheck: (...args: Parameters<typeof actual.marketCheck>) => {
			const checks = crafted.checks as IMarketCheck[][] | undefined;
			return checks
				? checks[crafted.calls++ % 2]
				: actual.marketCheck(...args);
		},
	};
});
vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
const prefs = vi.hoisted((): { defaultEmpireUuid?: string } => ({}));
vi.mock("@/stores/userStore", () => ({
	useUserStore: () => ({ isLoggedIn: true, preferences: prefs }),
}));
vi.mock("@/database/services/usePlanetData", async () => {
	const actual: any = await vi.importActual(
		"@/database/services/usePlanetData"
	);
	return {
		usePlanetData: vi.fn(() => ({
			getPlanet: vi.fn().mockResolvedValue(planet_etherwind),
			getPlanetSpecialMaterials:
				actual.usePlanetData().getPlanetSpecialMaterials,
		})),
	};
});
const plansQuery = vi.fn<() => Promise<Plan[]>>();
const planetQuery = vi.fn();
vi.mock("@/lib/query_cache/useQuery", () => ({
	useQuery: (name: string, params?: { planetNaturalId: string }) => ({
		execute: () =>
			name === "GetPlanet"
				? planetQuery(params!.planetNaturalId)
				: plansQuery(),
	}),
}));

const OPEN = etherwindPlan();
function variant(uuid: string, name: string, change?: (p: Plan) => void) {
	const plan = etherwindPlan();
	plan.uuid = uuid;
	plan.plan_name = name;
	change?.(plan);
	return plan;
}
const COPY = variant("00000000-0000-4000-8000-000000000001", "Copy");
const BIGGER = variant(
	"00000000-0000-4000-8000-000000000002",
	"Bigger",
	(p) => {
		p.plan_data.buildings[0].amount += 1;
	}
);
const FAR = variant("00000000-0000-4000-8000-000000000003", "Far", (p) => {
	p.planet_natural_id = "ZV-307c";
});

async function mountCompare(planUuid: string | undefined = OPEN.uuid) {
	const { wrapper } = await mountComponent(
		PlanCheckCompare,
		{
			plan: OPEN,
			planUuid,
			empire: undefined,
			cxUuid: undefined,
			planet: planet_etherwind,
		},
		{ attach: true }
	);
	await flushPromises();
	return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountCompare>>;
const select = (w: Wrapper) => w.findComponent(PSelect);
async function pick(w: Wrapper, uuid: string) {
	select(w).vm.$emit("update:value", uuid);
	await flushPromises();
}
const verdict = (w: Wrapper) => w.find("[data-verdict]").text();

describe("PlanCheckCompare", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		crafted.rows = crafted.changes = crafted.payback = undefined;
		crafted.checks = undefined;
		crafted.calls = 0;
		plansQuery.mockResolvedValue([OPEN, FAR, COPY, BIGGER]);
		planetQuery.mockReset().mockResolvedValue(planet_etherwind);
	});

	it("offers the user's other plans, this planet first", async () => {
		const wrapper = await mountCompare();
		const options = select(wrapper).props("options") as PSelectOption[];

		expect(options.map((o) => o.value)).toEqual(["same", "other"]);
		expect(options[0].children!.map((o) => o.label)).toEqual([
			"Bigger",
			"Copy",
		]);
		expect(options[1].children).toEqual([
			{ label: "Far", value: FAR.uuid, badge: "ZV-307c" },
		]);
		// the open plan is not offered
		const all = options.flatMap((o) => o.children!.map((c) => c.value));
		expect(all).not.toContain(OPEN.uuid);
	});

	it("compares with the first plan on this planet and tracks it", async () => {
		const wrapper = await mountCompare();

		expect(select(wrapper).props("value")).toBe(BIGGER.uuid);
		expect(wrapper.findAll("tbody tr")).toHaveLength(9);
		expect(wrapper.find("tbody .text-positive").exists()).toBe(true);
		expect(verdict(wrapper)).not.toContain("verdict.same");
		expect(wrapper.findAll("li").length).toBeGreaterThan(0);
		expect(wrapper.text()).toContain(
			"plan.tools.plan_check.compare.source_universe"
		);
		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_compare", {
			same_planet: true,
		});
	});

	it("shows an unchanged copy as the same everywhere", async () => {
		const wrapper = await mountCompare();
		await pick(wrapper, COPY.uuid);

		expect(verdict(wrapper)).toBe(
			"plan.tools.plan_check.compare.verdict.same"
		);
		expect(wrapper.text()).toContain(
			"plan.tools.plan_check.compare.changes.none"
		);
		const differences = wrapper
			.findAll("tbody tr")
			.map((r) => r.findAll("td")[3].text());
		expect(differences).toEqual([
			"0 ȼ",
			"0 ȼ",
			"0 ȼ",
			"0 ȼ",
			"0 ȼ",
			"0.00 d",
			// payback of the difference: nothing more to build
			"–",
			"0.00 ȼ",
			"0",
		]);
		expect(wrapper.find("tbody .text-positive").exists()).toBe(false);
		expect(wrapper.find("tbody .text-negative").exists()).toBe(false);
	});

	it("loads another planet and tracks it", async () => {
		const wrapper = await mountCompare();
		await pick(wrapper, FAR.uuid);

		expect(planetQuery).toHaveBeenLastCalledWith("ZV-307c");

		expect(trackEvent).toHaveBeenLastCalledWith("plan:plancheck_compare", {
			same_planet: false,
		});
	});

	it("remembers the last pick per plan", async () => {
		const uuid = "00000000-0000-4000-8000-0000000000ff";
		const first = await mountCompare(uuid);
		await pick(first, FAR.uuid);
		first.unmount();

		const again = await mountCompare(uuid);
		expect(select(again).props("value")).toBe(FAR.uuid);
		// another plan starts from its own default
		const other = await mountCompare(
			"00000000-0000-4000-8000-0000000000fe"
		);
		expect(select(other).props("value")).toBe(BIGGER.uuid);
	});

	it("keeps the picker when a plan can't be calculated", async () => {
		const wrapper = await mountCompare(
			"00000000-0000-4000-8000-0000000000fd"
		);
		planetQuery.mockRejectedValueOnce(
			new Error("Planet ZV-307c not available.")
		);
		vi.spyOn(console, "error").mockImplementationOnce(() => {});
		await pick(wrapper, FAR.uuid);

		expect(wrapper.text()).toContain(
			"plan.tools.plan_check.compare.calc_error"
		);
		expect(wrapper.find("table").exists()).toBe(false);
		expect(select(wrapper).exists()).toBe(true);

		await pick(wrapper, COPY.uuid);
		expect(wrapper.text()).not.toContain("compare.calc_error");
		expect(verdict(wrapper)).toBe(
			"plan.tools.plan_check.compare.verdict.same"
		);
	});

	it("tells a user without other plans", async () => {
		plansQuery.mockResolvedValue([OPEN]);
		const wrapper = await mountCompare();

		expect(wrapper.text()).toContain(
			"plan.tools.plan_check.compare.no_plans"
		);
		expect(wrapper.find("table").exists()).toBe(false);
	});

	it("says so when the plans can't be loaded", async () => {
		plansQuery.mockRejectedValue(new Error("down"));
		const wrapper = await mountCompare();

		expect(wrapper.text()).toContain("plan.tools.plan_check.compare.error");
	});

	it("pays one more building back in Δ plan cost ÷ Δ profit days", async () => {
		const wrapper = await mountCompare();
		await pick(wrapper, BIGGER.uuid);

		const payback = wrapper.find("[data-payback]").text();
		const row = wrapper
			.findAll("tbody tr")
			.find((r) => r.find("[data-payback]").exists())!;
		expect(row.text()).toContain(
			payback === "plan.tools.plan_check.compare.payback.never"
				? "plan.tools.plan_check.compare.payback.never_formula"
				: "plan.tools.plan_check.compare.payback.formula"
		);
		expect(payback).toMatch(/ d$|payback\.never$/);
		expect(verdict(wrapper)).toMatch(/verdict\.payback/);
	});

	it("is the Plan check tool's third view", async () => {
		usePlanCheckView().view.value = "market";
		const { wrapper } = await mountComponent(PlanCheck, {
			plan: OPEN,
			planUuid: OPEN.uuid,
			empire: undefined,
			cxUuid: undefined,
			planet: planet_etherwind,
		});
		const buttons = wrapper.findAll(
			"[aria-label='plan.tools.plan_check.view_label'] > button"
		);
		expect(buttons.map((b) => b.text())).toEqual([
			"plan.tools.plan_check.views.market",
			"plan.tools.plan_check.views.sensitivity",
			"plan.tools.plan_check.views.compare",
		]);

		await buttons[2].trigger("click");
		await flushPromises();
		await flushPromises();

		expect(buttons[2].attributes("aria-pressed")).toBe("true");
		// the price change belongs to the sensitivity view only
		expect(wrapper.find("#plancheck-pct-label").exists()).toBe(false);
		expect(wrapper.findComponent(PlanCheckCompare).exists()).toBe(true);
		// 8 key figures and the payback of the difference
		expect(wrapper.findAll("tbody tr")).toHaveLength(9);
	});
});

async function mountWith(
	over: Record<string, unknown> = {},
	pinia = createPinia()
) {
	const { wrapper, setProps } = await mountComponent(
		PlanCheckCompare,
		{
			plan: OPEN,
			planUuid: OPEN.uuid,
			empire: undefined,
			cxUuid: undefined,
			planet: planet_etherwind,
			...over,
		},
		{ attach: true, pinia }
	);
	await flushPromises();
	return { wrapper, setProps };
}

const row = (
	key: ICompareRow["key"],
	a: number,
	b: number,
	delta: number,
	better?: boolean
): ICompareRow => ({ key, a, b, delta, better });
const change = (ticker: string, delta: number): IMaterialChange => ({
	ticker,
	a: 0,
	b: delta,
	delta,
});
const check = (
	ticker: string,
	level: IMarketCheck["level"],
	over: Partial<IMarketCheck> = {}
): IMarketCheck => ({
	ticker,
	delta: 10,
	exchange: "AI1",
	sharePct: 12,
	traded30d: 3000,
	traded7d: 700,
	bid: 1020,
	ask: 1100,
	spreadPct: 7.3,
	flags: level ? ["bigger"] : [],
	level,
	...over,
});
const tooltip = () =>
	[...document.body.querySelectorAll("[role=tooltip]")].at(-1)!.textContent;
const EMPIRE_UUID = OPEN.empires![0].uuid;
const CX_UUID = "00000000-0000-4000-8000-0000000000c1";

describe("PlanCheckCompare edge cases", () => {
	beforeAll(async () => {
		await setupPlanningTestData();
	});
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		crafted.rows = crafted.changes = crafted.payback = undefined;
		crafted.checks = undefined;
		crafted.calls = 0;
		plansQuery.mockResolvedValue([OPEN, FAR, COPY, BIGGER]);
		planetQuery.mockReset().mockResolvedValue(planet_etherwind);
	});

	it("lists other planets by planet, then name", async () => {
		const far = variant(
			"00000000-0000-4000-8000-000000000011",
			"Aaa",
			(p) => {
				p.planet_natural_id = "ZV-307c";
			}
		);
		const near = variant(
			"00000000-0000-4000-8000-000000000012",
			"Zed",
			(p) => {
				p.planet_natural_id = "AA-001a";
			}
		);
		plansQuery.mockResolvedValue([OPEN, FAR, far, near]);
		const { wrapper } = await mountWith();
		const options = select(wrapper).props("options") as PSelectOption[];

		// no plan on this planet: only the other planets' group
		expect(options.map((o) => o.value)).toEqual(["other"]);
		expect(options[0].children!.map((o) => [o.label, o.badge])).toEqual([
			["Zed", "AA-001a"],
			["Aaa", "ZV-307c"],
			["Far", "ZV-307c"],
		]);
		expect(select(wrapper).props("value")).toBe(near.uuid);
		wrapper.unmount();
	});

	it("offers only this planet's group without other planets", async () => {
		plansQuery.mockResolvedValue([OPEN, COPY, BIGGER]);
		const { wrapper } = await mountWith();
		const options = select(wrapper).props("options") as PSelectOption[];

		expect(options.map((o) => o.value)).toEqual(["same"]);
		expect(options[0].label).toContain(planet_etherwind.planet_name);
		wrapper.unmount();
	});

	it("keeps the pick when the open plan changes", async () => {
		const { wrapper, setProps } = await mountWith();
		await pick(wrapper, COPY.uuid);

		await setProps({ planUuid: "00000000-0000-4000-8000-0000000000fc" });

		expect(select(wrapper).props("value")).toBe(COPY.uuid);
		// the former open plan is offered now
		const options = select(wrapper).props("options") as PSelectOption[];
		expect(options[0].children).toHaveLength(3);
		wrapper.unmount();
	});

	it("remembers the pick of a plan that is not saved yet", async () => {
		const first = await mountWith({ planUuid: undefined });
		await pick(first.wrapper, FAR.uuid);
		first.wrapper.unmount();

		const again = await mountWith({ planUuid: undefined });
		expect(select(again.wrapper).props("value")).toBe(FAR.uuid);
		again.wrapper.unmount();
	});

	it("waits for the plan it calculates and ignores a stale one", async () => {
		const { wrapper } = await mountWith();
		let resolveFar!: (planet: unknown) => void;
		planetQuery.mockReturnValueOnce(
			new Promise((resolve) => (resolveFar = resolve))
		);
		await pick(wrapper, FAR.uuid);
		// the last comparison stays while the pick is calculated
		expect(wrapper.find("table").exists()).toBe(true);
		vi.mocked(trackEvent).mockClear();

		await pick(wrapper, COPY.uuid);
		resolveFar(planet_etherwind);
		await flushPromises();

		expect(select(wrapper).props("value")).toBe(COPY.uuid);
		expect(verdict(wrapper)).toBe(
			"plan.tools.plan_check.compare.verdict.same"
		);
		// only the current pick is tracked
		expect(trackEvent).toHaveBeenCalledTimes(1);
		expect(trackEvent).toHaveBeenCalledWith("plan:plancheck_compare", {
			same_planet: true,
		});
		wrapper.unmount();
	});

	it("ignores the failure of a stale pick", async () => {
		const { wrapper } = await mountWith();
		let failFar!: (err: Error) => void;
		planetQuery.mockReturnValueOnce(
			new Promise((_, reject) => (failFar = reject))
		);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		error.mockClear();
		await pick(wrapper, FAR.uuid);
		await pick(wrapper, COPY.uuid);
		failFar(new Error("Planet ZV-307c not available."));
		await flushPromises();

		expect(error).toHaveBeenCalledTimes(1);
		expect(wrapper.text()).not.toContain("compare.calc_error");
		expect(verdict(wrapper)).toBe(
			"plan.tools.plan_check.compare.verdict.same"
		);
		error.mockRestore();
		wrapper.unmount();
	});

	it("shows a spinner for a pick that is not in the list", async () => {
		const { wrapper } = await mountWith();
		await pick(wrapper, "00000000-0000-4000-8000-0000000000aa");

		expect(wrapper.find("table").exists()).toBe(false);
		expect(wrapper.findComponent(PSpin).exists()).toBe(true);
		expect(wrapper.text()).not.toContain("compare.calc_error");
		wrapper.unmount();
	});

	describe("with the other plan's CX preference", () => {
		function pinia() {
			const store = createPinia();
			const planning = usePlanningStore(store);
			planning.setEmpires([
				{
					uuid: EMPIRE_UUID,
					empire_name: "Sky Productions",
					empire_faction: "MORIA",
					empire_permits_used: 25,
					empire_permits_total: 28,
					plans: [],
					modified_at: "2026-01-01T00:00:00Z",
				},
			]);
			planning.setCXs([
				{
					uuid: CX_UUID,
					cx_name: "Fixed",
					modified_at: "2026-01-01T00:00:00Z",
					empires: [
						{
							uuid: EMPIRE_UUID,
							empire_name: "Sky Productions",
							plans: [],
						},
					],
					cx_data: {
						cx_empire: [],
						cx_planets: [],
						ticker_empire: [],
						ticker_planets: [],
					},
				},
			]);
			return store;
		}

		it("prices it on its empire's CX", async () => {
			const { wrapper } = await mountWith({}, pinia());

			expect(wrapper.text()).toContain(
				"plan.tools.plan_check.compare.source_cx"
			);
			expect(wrapper.text()).not.toContain("compare.source_universe");
			wrapper.unmount();
		});

		it("falls back to the user's first empire for a plan without one", async () => {
			const bare = variant(
				"00000000-0000-4000-8000-000000000021",
				"Bare",
				(p) => {
					p.empires = [];
				}
			);
			plansQuery.mockResolvedValue([OPEN, bare]);
			const { wrapper } = await mountWith({}, pinia());

			expect(select(wrapper).props("value")).toBe(bare.uuid);
			expect(wrapper.text()).toContain(
				"plan.tools.plan_check.compare.source_cx"
			);
			wrapper.unmount();
		});
	});

	describe("with crafted figures", () => {
		it("shows differences, bars and the neutral and endless cases", async () => {
			crafted.rows = [
				row("profit", 1000, 1500, 500, true),
				row("cost", 400, 500, 100, false),
				row("roi", 10, Infinity, Infinity, false),
				row("profitArea", 0, 0, 0),
				row("area", 20, 40, 20),
			];
			const { wrapper } = await mountWith();

			const rows = tableRows(wrapper);
			const figures = wrapper
				.findAll("td[data-col-key=figure] > span:first-child")
				.map((s) => s.text());
			expect(figures).toEqual([
				"plan.tools.plan_check.compare.figures.profit",
				"plan.tools.plan_check.compare.figures.cost",
				"plan.tools.plan_check.compare.figures.roi",
				"plan.tools.plan_check.compare.figures.payback",
				"plan.tools.plan_check.compare.figures.profitArea",
				"plan.tools.plan_check.compare.figures.area",
			]);
			// a payback that never happens has no difference
			expect(rows[2].delta).toBe("—");
			expect(rows[0].delta).toContain("+500");
			expect(rows[4].delta).toBe("0.00 ȼ");
			const cells = wrapper
				.findAll("tbody tr")
				.map((tr) => tr.findAll("td"));
			// both plans in one cell; below 640 px CSS hides the other
			// plan's column and shows its value here, under this plan's
			const values = (r: number) =>
				cells[r][1].findAll(":scope > span > span").map((s) => s.text());
			// area has no currency
			expect(values(5)).toEqual(["20", "40"]);
			expect(rows[5].delta).toBe("+20");
			// the payback formula also sits under its name there
			expect(cells[3][0].text()).toContain(
				"plan.tools.plan_check.compare.payback.formula"
			);
			const cls = (r: number) => cells[r][3].find("span").classes();
			expect(cls(0)).toContain("text-positive");
			expect(cls(1)).toContain("text-negative");
			// equal and neutral
			expect(cls(4)).toContain("text-muted-strong");
			expect(cls(5)).toContain("text-muted-strong");

			const widths = (r: number) =>
				cells[r][4]
					.findAll("[role=img] > div")
					.map((d) => d.attributes("style"));
			expect(widths(0)).toEqual([
				"width: 66.66666666666666%;",
				"width: 100%;",
			]);
			// the endless payback has no bar, nothing at all draws none
			expect(widths(2)).toEqual(["width: 100%;", "width: 0%;"]);
			expect(widths(4)).toEqual(["width: 0%;", "width: 0%;"]);
			wrapper.unmount();
		});

		it("says when the extra building never pays back", async () => {
			crafted.payback = { cost: 5_000_000, profit: 0, days: "never" };
			const { wrapper } = await mountWith();

			expect(verdict(wrapper)).toMatch(/verdict\.payback_never$/);
			const payback = wrapper.find("[data-payback]");
			expect(payback.text()).toBe(
				"plan.tools.plan_check.compare.payback.never"
			);
			expect(payback.classes()).toContain("text-negative");
			expect(wrapper.text()).toContain(
				"plan.tools.plan_check.compare.payback.never_formula"
			);
			wrapper.unmount();
		});

		it("shows no payback of a plan that costs no more", async () => {
			crafted.payback = { cost: -10, profit: 5, days: null };
			const { wrapper } = await mountWith();

			expect(wrapper.find("[data-payback]").text()).toBe("–");
			expect(wrapper.find("[data-payback]").classes()).toContain(
				"text-muted"
			);
			expect(verdict(wrapper)).not.toContain("payback");
			wrapper.unmount();
		});

		it("folds changes beyond the top six into one bar", async () => {
			crafted.changes = [
				change("FE", 900),
				change("RAT", -800),
				change("ZZZ", 700),
				change("DW", -600),
				change("H2O", 500),
				change("C", -400),
				change("O", 50),
				change("N", -30),
			];
			const { wrapper } = await mountWith();

			let items = wrapper.findAll("li");
			expect(items).toHaveLength(7);
			// known materials wear their category colour, others a neutral chip
			expect(items[0].find("span").classes()).toContain(
				"material-category-metals"
			);
			expect(items[2].find("span").classes()).toContain("bg-black/40");
			expect(items[6].text()).toContain("+20");

			// tooltips: a known material with its name, an unknown without
			await items[0].find("div").trigger("mouseenter");
			expect(tooltip()).toContain("FE");
			expect(tooltip()).toContain("0 ȼ");
			expect(tooltip()).toContain("900 ȼ");
			await items[0].find("div").trigger("mouseleave");
			await items[2].find("div").trigger("mouseenter");
			expect(tooltip()).toContain("ZZZ");
			expect(tooltip()).toContain("700 ȼ");
			await items[2].find("div").trigger("mouseleave");
			await items[6].find("div").trigger("mouseenter");
			expect(tooltip()).toContain("O");
			expect(tooltip()).toContain("+50 ȼ");
			expect(tooltip()).toContain("−30 ȼ");

			const toggle = wrapper.find("button[aria-expanded]");
			expect(toggle.attributes("aria-expanded")).toBe("false");
			expect(toggle.text()).toBe("common.buttons.show_all");
			await toggle.trigger("click");

			items = wrapper.findAll("li");
			expect(items).toHaveLength(8);
			expect(toggle.attributes("aria-expanded")).toBe("true");
			expect(toggle.text()).toBe("common.buttons.show_fewer");
			wrapper.unmount();
		});

		it("flags the materials the other plan pushes into a worse market", async () => {
			crafted.changes = [
				change("FE", 900),
				change("RAT", -800),
				change("DW", -600),
				change("H2O", 500),
				change("C", -400),
				change("O", 300),
				change("N", -30),
			];
			// this plan's checks, then the other plan's
			crafted.checks = [
				[check("RAT", "amber"), check("DW", "red"), check("O", "red")],
				[
					// new: sold on one exchange
					check("FE", "red"),
					// worse: bought across all exchanges
					check("RAT", "red", { delta: -5, exchange: "UNIVERSE" }),
					// better, muted and fine
					check("DW", "amber", { delta: -1 }),
					check("H2O", "muted"),
					check("C", null),
					check("O", "red"),
					// worse but beyond the top six
					check("N", "red", { delta: -3 }),
				],
			];
			const { wrapper } = await mountWith();

			const notes = wrapper.findAll("[data-pushed-flag]");
			expect(notes).toHaveLength(2);
			notes.forEach((n) =>
				expect(n.text()).toContain(
					"plan.tools.plan_check.compare.changes.flag"
				)
			);
			// an icon beside FE and RAT only
			const icons = wrapper
				.findAll("li")
				.map((li) => li.find("svg").exists());
			expect(icons.slice(0, 6)).toEqual([
				true,
				true,
				false,
				false,
				false,
				false,
			]);

			await wrapper.find("button[aria-expanded]").trigger("click");
			expect(wrapper.findAll("[data-pushed-flag]")).toHaveLength(3);
			wrapper.unmount();
		});
	});
});
