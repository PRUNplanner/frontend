// Types & Interfaces
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type {
	IFIORepairBase,
	IFIORepairCandidate,
} from "@/features/fio_repair/fioRepair.types";

export const BOBER_SITE = "a".repeat(32);
export const PLAN_UUID = "00000001-0000-4000-8000-000000000000";
export const OTHER_PLAN_UUID = "00000002-0000-4000-8000-000000000000";

export function candidate(
	uuid: string,
	name: string,
	score: number,
	empire?: string
): IFIORepairCandidate {
	return {
		plan: { uuid, plan_name: name } as Plan,
		score,
		empire: empire
			? ({ uuid: empire, empire_name: empire } as PlanEmpireElement)
			: undefined,
	};
}

/** Bober (ZV-307b): 10 POL overdue 2 d, 7 LAB due in 3 d, plan matched */
export function bober(over: Partial<IFIORepairBase> = {}): IFIORepairBase {
	const plan = candidate(PLAN_UUID, "Bober NR+PG", 1, "Sky Productions");
	return {
		planet: "ZV-307b",
		name: "Bober",
		siteId: BOBER_SITE,
		match: {
			candidate: plan,
			confidence: "match",
			candidates: [plan, candidate(OTHER_PLAN_UUID, "meow", 0.5)],
		},
		buildings: [
			...Array.from({ length: 10 }, () => ({
				ticker: "POL",
				days: 72,
				wasRepaired: true,
				condition: 0.925,
			})),
			...Array.from({ length: 7 }, () => ({
				ticker: "LAB",
				days: 72,
				wasRepaired: true,
				condition: 0.925,
			})),
		],
		types: [
			{
				ticker: "POL",
				count: 10,
				target: 70,
				since: 72,
				wasRepaired: true,
				condition: 0.925,
				due: -2,
				status: "overdue",
			},
			{
				ticker: "LAB",
				count: 7,
				target: 75,
				since: 72,
				wasRepaired: true,
				condition: 0.925,
				due: 3,
				status: "soon",
			},
		],
		since: 72,
		wasRepaired: true,
		condition: 0.925,
		due: -2,
		status: "overdue",
		bill: {
			materials: [
				{
					ticker: "TSH",
					amount: 17,
					cost: 675000,
					weight: 5,
					volume: 6,
				},
			],
			cost: 675000,
			weight: 5,
			volume: 6,
		},
		waiting: 1800,
		...over,
	};
}

export function shiptronia(over: Partial<IFIORepairBase> = {}): IFIORepairBase {
	return bober({
		planet: "VH-331e",
		name: "Shiptronia",
		siteId: undefined,
		match: { candidate: undefined, confidence: "none", candidates: [] },
		types: [
			{
				ticker: "RIG",
				count: 13,
				target: 60,
				since: 41,
				wasRepaired: false,
				condition: 0.99,
				due: 19,
				status: "later",
			},
		],
		since: 41,
		wasRepaired: false,
		due: 19,
		status: "later",
		bill: { materials: [], cost: 1000, weight: 1, volume: 2 },
		waiting: 100,
		...over,
	});
}
