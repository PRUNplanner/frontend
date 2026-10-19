import { describe, expect, it } from "vitest";

import fio_storage from "@/tests/test_data/api_data_fio_storage.json";
import buildings from "@/tests/test_data/api_data_buildings.json";

// Util
import {
	ageDays,
	bestDays,
	countByTicker,
	dueIn,
	isInfrastructureBuilding,
	matchPlans,
	matchScore,
	oldestBuilding,
	productionBuildings,
	repairBill,
	repairStatus,
	statusTagType,
	subtractStore,
	summarizeBuildings,
	timelineAxis,
	timelineLanes,
	timelinePct,
	waitingCostPerDay,
} from "@/features/fio_repair/fioRepair.util";
import {
	findOptimalRepairDay,
	calculateRepairCurve,
} from "@/features/repair_analysis/repairAnalysis.util";
import { FIOStorageSchema } from "@/features/api/schemas/gameData.schemas";

// Types & Interfaces
import type { IPriceBook } from "@/features/cx/priceBook";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import type { IFIORepairBuilding } from "@/features/fio_repair/fioRepair.types";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-15T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * DAY - 1000);

const storage = FIOStorageSchema.parse(fio_storage);
const bober = storage.sites_data["ZV-307b"];
const fioNow = storage.last_modified.getTime();

// Bober (ZV-307b): building costs plus 4 MCG per area and 1 TSH (hot planet)
function boberCost(ticker: string) {
	const b = buildings.find((x) => x.building_ticker === ticker)!;
	return [
		...b.costs.map((c) => ({
			ticker: c.material_ticker,
			input: c.material_amount,
			output: 0,
		})),
		{ ticker: "MCG", input: b.area_cost * 4, output: 0 },
		{ ticker: "TSH", input: 1, output: 0 },
	];
}

const building = (
	ticker: string,
	days: number | null,
	wasRepaired = true,
	condition = 0.9
): IFIORepairBuilding => ({ ticker, days, wasRepaired, condition });

function plan(
	uuid: string,
	name: string,
	planet: string,
	counts: Record<string, number>
): Plan {
	return {
		uuid,
		plan_name: name,
		planet_natural_id: planet,
		plan_data: {
			buildings: Object.entries(counts).map(([n, amount]) => ({
				name: n,
				amount,
				active_recipes: [],
			})),
		},
	} as unknown as Plan;
}

function empire(uuid: string, planUuids: string[]): PlanEmpireElement {
	return {
		uuid,
		empire_name: uuid,
		plans: planUuids.map((p) => ({
			uuid: p,
			plan_name: p,
			planet_natural_id: "",
		})),
	} as unknown as PlanEmpireElement;
}

describe("fioRepair.util", () => {
	it("isInfrastructureBuilding", () => {
		expect(isInfrastructureBuilding("POL")).toBe(false);
		for (const t of ["HB1", "HBL", "STO", "CM", "STA", "STE", "STV", "STW"])
			expect(isInfrastructureBuilding(t)).toBe(true);
	});

	describe("ageDays", () => {
		it("from the last repair", () => {
			expect(
				ageDays(
					{
						BuildingLastRepair: daysAgo(40),
						BuildingCreated: daysAgo(90),
					},
					NOW
				)
			).toStrictEqual({ days: 40, wasRepaired: true });
		});

		it("never repaired: since it was built, not 0", () => {
			expect(
				ageDays({ BuildingCreated: daysAgo(90) }, NOW)
			).toStrictEqual({ days: 90, wasRepaired: false });
		});

		it("without dates", () => {
			expect(ageDays({}, NOW)).toStrictEqual({
				days: null,
				wasRepaired: false,
			});
		});
	});

	it("productionBuildings: no infrastructure, ages to now", () => {
		const list = productionBuildings(bober, fioNow);
		expect(countByTicker(list)).toStrictEqual({ POL: 10, LAB: 7 });
		expect(list[0]).toMatchObject({ days: 49, wasRepaired: true });

		// repaired right before the snapshot: no materials listed yet
		const fresh = productionBuildings(
			{
				...bober,
				Buildings: [
					{
						...bober.Buildings[0],
						RepairMaterials: [],
						BuildingLastRepair: new Date(fioNow),
					},
				],
			},
			fioNow
		);
		expect(fresh).toHaveLength(1);
	});

	describe("repairBill", () => {
		it("matches FIO's RepairMaterials within 1 at arrival 0", () => {
			for (const b of bober.Buildings.filter((x) =>
				["POL", "LAB"].includes(x.BuildingTicker)
			)) {
				const { days } = ageDays(b, fioNow);
				const bill = repairBill(
					[building(b.BuildingTicker, days)],
					boberCost,
					0
				);
				for (const m of b.RepairMaterials) {
					const ours =
						bill.find((x) => x.ticker === m.MaterialTicker)
							?.input ?? 0;
					expect(
						Math.abs(ours - m.MaterialAmount)
					).toBeLessThanOrEqual(1);
				}
				expect(bill).toHaveLength(b.RepairMaterials.length);
			}
		});

		it("at 185 days it is the full construction cost", () => {
			const bill = repairBill([building("POL", 185)], boberCost, 0);
			expect(bill).toStrictEqual(boberCost("POL"));
		});

		it("arrival n uses days + n, an undated building is full cost", () => {
			const at = (days: number | null, arrival: number) =>
				repairBill([building("LAB", days)], boberCost, arrival);
			expect(at(40, 10)).toStrictEqual(at(50, 0));
			expect(at(null, 0)).toStrictEqual(boberCost("LAB"));
			// sums buildings
			const two = repairBill(
				[building("LAB", 50), building("LAB", 50)],
				boberCost,
				0
			);
			expect(two[0].input).toBe(at(50, 0)[0].input * 2);
		});
	});

	it("subtractStore", () => {
		expect(
			subtractStore(
				[
					{ ticker: "A", input: 5, output: 0 },
					{ ticker: "B", input: 3, output: 0 },
				],
				{ A: 2, B: 10 }
			)
		).toStrictEqual({
			load: [{ ticker: "A", input: 3, output: 0 }],
			fromStore: [
				{ ticker: "A", input: 2, output: 0 },
				{ ticker: "B", input: 3, output: 0 },
			],
		});
	});

	it("waitingCostPerDay: buildings under 180 days only", () => {
		expect(
			waitingCostPerDay(
				[
					building("A", 10),
					building("A", 179),
					building("A", 180),
					building("A", null),
				],
				() => 1800
			)
		).toBe(20);
	});

	describe("status", () => {
		it("dueIn and repairStatus", () => {
			expect(dueIn(60, 70)).toBe(-10);
			expect(repairStatus(-1, 7)).toBe("overdue");
			expect(repairStatus(0, 7)).toBe("soon");
			expect(repairStatus(7, 7)).toBe("soon");
			expect(repairStatus(8, 7)).toBe("later");
			expect(repairStatus(null, 7)).toBe("unknown");
		});

		it("tag types", () => {
			expect(statusTagType("overdue")).toBe("error");
			expect(statusTagType("unknown")).toBe("error");
			expect(statusTagType("soon")).toBe("warning");
			expect(statusTagType("later")).toBe("secondary");
		});

		it("a base takes its types' minimum", () => {
			const s = summarizeBuildings(
				[
					building("POL", 50, true, 0.95),
					building("POL", 72, true, 0.92),
					building("LAB", 72, false, 0.93),
				],
				(t) => (t === "POL" ? 70 : 75),
				7
			);
			expect(s.due).toBe(-2);
			expect(s.status).toBe("overdue");
			expect(
				s.types.map((t) => [t.ticker, t.count, t.due, t.status])
			).toStrictEqual([
				["POL", 2, -2, "overdue"],
				["LAB", 1, 3, "soon"],
			]);
			expect(s.types[0].condition).toBe(0.92);
			expect(s.types[1].wasRepaired).toBe(false);
		});

		it("an undated building makes the base unknown", () => {
			const s = summarizeBuildings(
				[building("POL", null), building("LAB", 10)],
				() => 60,
				7
			);
			// no due date: it sorts and shows with the overdue ones
			expect(s.status).toBe("unknown");
			expect(s.due).toBeNull();
			expect(s.types[0].ticker).toBe("POL");
		});

		it("types sort by due, undated first, then by ticker", () => {
			const order = (list: IFIORepairBuilding[]) =>
				summarizeBuildings(list, () => 60, 7).types.map(
					(t) => t.ticker
				);

			expect(
				order([
					building("POL", 30),
					building("LAB", 30),
					building("FP", 10),
				])
			).toStrictEqual(["LAB", "POL", "FP"]);
			expect(
				order([
					building("POL", null),
					building("FP", 5),
					building("LAB", null),
				])
			).toStrictEqual(["LAB", "POL", "FP"]);
		});

		it("oldestBuilding puts undated first", () => {
			expect(
				oldestBuilding([building("A", 10), building("B", 30)]).ticker
			).toBe("B");
			expect(
				oldestBuilding([building("A", 10), building("B", null)]).ticker
			).toBe("B");
			expect(
				oldestBuilding([building("A", 30), building("B", 10)]).ticker
			).toBe("A");
			expect(
				oldestBuilding([building("A", null), building("B", null)])
					.ticker
			).toBe("A");
		});
	});

	describe("matchPlans", () => {
		const counts = { POL: 10, LAB: 7 };
		const site = (siteId?: string) => ({
			planet: "ZV-307b",
			siteId,
			counts,
		});

		it("score", () => {
			expect(matchScore(counts, counts)).toBe(1);
			expect(matchScore(counts, { POL: 10, LAB: 5 })).toBeCloseTo(
				15 / 17
			);
			expect(matchScore({}, {})).toBe(0);
		});

		it("same planet, threshold 0.8, labels", () => {
			// habitations in the plan don't count
			const exact = plan("p1", "Bober", "ZV-307b", { ...counts, HB1: 4 });
			const close = plan("p2", "Close", "ZV-307b", { POL: 10, LAB: 5 });
			const far = plan("p3", "Far", "ZV-307b", { POL: 2 });
			const other = plan("p4", "Other", "XX-000a", counts);

			const m = (plans: Plan[]) =>
				matchPlans([site()], plans, [], {})["ZV-307b"];

			expect(m([exact, close, other])).toMatchObject({
				candidate: { plan: exact, score: 1 },
				confidence: "match",
			});
			expect(m([exact, close, other]).candidates).toHaveLength(2);
			expect(m([close, far]).confidence).toBe("likely");
			expect(m([far])).toMatchObject({
				candidate: undefined,
				confidence: "none",
			});
			expect(m([]).confidence).toBe("none");
		});

		it("a tie goes to the covering empire", () => {
			const loose = plan("a", "A loose", "ZV-307b", counts);
			const inEmpire = plan("b", "B empire", "ZV-307b", counts);
			const elsewhere = plan("c", "Elsewhere", "KW-688c", { FP: 1 });
			const result = matchPlans(
				[
					site(),
					{ planet: "KW-688c", siteId: undefined, counts: { FP: 1 } },
				],
				[loose, inEmpire, elsewhere],
				[empire("small", ["a"]), empire("sky", ["b", "c"])],
				{}
			);
			expect(result["ZV-307b"].candidate?.plan.uuid).toBe("b");
			expect(result["ZV-307b"].candidate?.empire?.uuid).toBe("sky");
		});

		it("a tie outside any empire goes to the first by name", () => {
			const a = plan("b", "A first", "ZV-307b", counts);
			const b = plan("a", "B second", "ZV-307b", counts);

			const result = matchPlans([site()], [b, a], [], {})["ZV-307b"];

			expect(result.candidate?.plan).toBe(a);
			expect(result.candidate?.empire).toBeUndefined();
		});

		it("a plan in several empires shows the one covering most bases", () => {
			const shared = plan("x", "Shared", "ZV-307b", counts);
			const other = plan("y", "Other", "KW-688c", { FP: 1 });
			const sites = [
				site(),
				{ planet: "KW-688c", siteId: undefined, counts: { FP: 1 } },
			];
			const small = empire("small", ["x"]);
			const big = empire("big", ["x", "y"]);
			const empireOf = (empires: PlanEmpireElement[]) =>
				matchPlans(sites, [shared, other], empires, {})["ZV-307b"]
					.candidate?.empire?.uuid;

			expect(empireOf([small, big])).toBe("big");
			expect(empireOf([big, small])).toBe("big");
		});

		it("a weak candidate in empires without matches keeps the first", () => {
			const far = plan("f", "Far", "ZV-307b", { POL: 2 });

			const result = matchPlans(
				[site()],
				[far],
				[empire("e1", ["f"]), empire("e2", ["f"])],
				{}
			)["ZV-307b"];

			expect(result.confidence).toBe("none");
			expect(result.candidates[0].empire?.uuid).toBe("e1");
		});

		it("a user link wins, a stale one falls back", () => {
			const exact = plan("p1", "Bober", "ZV-307b", counts);
			const weak = plan("p2", "Weak", "ZV-307b", { POL: 1 });
			const other = plan("p3", "Other", "XX-000a", counts);
			const m = (links: Record<string, { planUuid: string | null }>) =>
				matchPlans([site("s1")], [exact, weak, other], [], links)[
					"ZV-307b"
				];

			expect(m({ s1: { planUuid: "p2" } })).toMatchObject({
				candidate: { plan: weak },
				confidence: "picked",
			});
			expect(m({ s1: { planUuid: null } })).toMatchObject({
				candidate: undefined,
				confidence: "nopick",
			});
			// deleted plan, or a plan on another planet
			expect(m({ s1: { planUuid: "gone" } }).confidence).toBe("match");
			expect(m({ s1: { planUuid: "p3" } }).confidence).toBe("match");
			// without a SiteId no link applies
			expect(
				matchPlans([site()], [exact], [], { s1: { planUuid: null } })[
					"ZV-307b"
				].confidence
			).toBe("match");
		});
	});

	it("subtractStore leaves out what the store lacks or can't cover", () => {
		const bill = [
			{ ticker: "BSE", input: 10, output: 0 },
			{ ticker: "LBH", input: 4, output: 0 },
			{ ticker: "MCG", input: 6, output: 0 },
		];

		expect(subtractStore(bill, { BSE: 25, MCG: -3 })).toStrictEqual({
			// BSE is covered fully, nothing of LBH or a negative stock
			load: [
				{ ticker: "LBH", input: 4, output: 0 },
				{ ticker: "MCG", input: 6, output: 0 },
			],
			fromStore: [{ ticker: "BSE", input: 10, output: 0 }],
		});
		expect(subtractStore(bill, { LBH: 1 }).fromStore).toStrictEqual([
			{ ticker: "LBH", input: 1, output: 0 },
		]);
	});

	it("bestDays equals findOptimalRepairDay as in Repair Analysis", () => {
		const prices = { getPrice: () => 100 } as unknown as IPriceBook;
		const pol = {
			name: "POL",
			amount: 2,
			dailyRevenue: 20000,
			workforceDailyCost: -1500,
			constructionCost: 18000,
			constructionMaterials: boberCost("POL"),
		};
		const result = {
			production: {
				buildings: [pol, { ...pol, name: "LAB", amount: 0 }],
			},
		} as unknown as IPlanResult;

		const productionValue = 20000 / 2 + 1500 - 18000 / 180;
		const buy = Object.fromEntries(
			pol.constructionMaterials.map((m) => [m.ticker, 100])
		);
		const expected = Math.max(
			1,
			findOptimalRepairDay(
				calculateRepairCurve(
					productionValue,
					1500,
					pol.constructionMaterials,
					buy
				)
			).day
		);

		expect(bestDays(result, prices)).toStrictEqual({ POL: expected });
	});

	describe("timeline", () => {
		it("axis follows the data, always with today and due soon", () => {
			expect(timelineAxis([-23, 20], 7)).toStrictEqual({
				from: -30,
				to: 30,
				step: 15,
				ticks: [-30, -15, 0, 15, 30],
			});
			expect(timelineAxis([10, 30], 7).from).toBe(0);
			expect(timelineAxis([], 7)).toMatchObject({
				from: 0,
				to: 10,
				step: 5,
			});
			expect(timelineAxis([-100, 50], 7).step).toBe(30);
			expect(timelineAxis([-200, 50], 7).step).toBe(60);
			// a narrow track takes coarser steps, today stays a tick
			expect(timelineAxis([-150, 20], 7, 5)).toMatchObject({
				from: -180,
				to: 60,
				step: 60,
				ticks: [-180, -120, -60, 0, 60],
			});
			expect(timelineAxis([-150, 20], 7).step).toBe(30);
			// never an empty axis
			expect(timelineAxis([0], 0)).toMatchObject({ from: 0, to: 5 });
		});

		it("positions clamp to the axis", () => {
			const axis = timelineAxis([-30, 30], 7);
			expect(timelinePct(axis, 0)).toBe(50);
			expect(timelinePct(axis, -99)).toBe(0);
			expect(timelinePct(axis, 99)).toBe(100);
		});

		it("lanes: no overlaps, right edge grows left, crowds fold into +n", () => {
			const chips = Array.from({ length: 7 }, (_, i) => ({
				key: `k${i}`,
				label: "Base",
				pct: 10 + i,
			}));
			const layout = timelineLanes(
				[...chips, { key: "edge", label: "Edge", pct: 99 }],
				600
			);
			expect(
				layout.chips.filter((c) => c.pct < 50).map((c) => c.lane)
			).toStrictEqual([0, 1, 2, 3]);
			expect(layout.more).toStrictEqual([
				{ pct: 14, keys: ["k4", "k5", "k6"] },
			]);
			expect(layout.chips.find((c) => c.key === "edge")).toMatchObject({
				lane: 0,
				flip: true,
			});
			expect(layout.lanes).toBe(5);

			expect(timelineLanes([], 600).lanes).toBe(1);
		});
	});
});
