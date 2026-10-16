// Util
import {
	calculateAmountAtDay,
	REPAIR_DAY_MAX,
	repairCurveOf,
} from "@/features/repair_analysis/repairAnalysis.util";

// Types & Interfaces
import type { IPriceBook } from "@/features/cx/priceBook";
import type { FIOSitePlanet } from "@/features/api/schemas/gameData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { UserPreference } from "@/features/api/schemas/user.schemas";
import type {
	IMaterialIOMinimal,
	IPlanResult,
} from "@/features/planning/usePlanCalculation.types";
import type {
	FIORepairStatus,
	IFIORepairBuilding,
	IFIORepairBuildingType,
	IFIORepairCandidate,
	IFIORepairMatch,
	IFIORepairTimelineAxis,
	IFIORepairTimelineChip,
	IFIORepairTimelineLayout,
} from "@/features/fio_repair/fioRepair.types";

const DAY_MS = 86_400_000;

/** a plan matches a FIO base from this share of matching buildings */
export const MATCH_THRESHOLD = 0.8;

/**
 * Decides if a building ticker is an infrastructure building, those
 * are either habitations, storage or the core module
 * @author jplacht
 *
 * @param {string} ticker Building Ticker
 * @returns {boolean} Is infrastructure Building
 */
export function isInfrastructureBuilding(ticker: string): boolean {
	return (
		ticker.startsWith("HB") ||
		ticker === "STO" ||
		ticker === "CM" ||
		ticker === "STA" ||
		ticker === "STE" ||
		ticker === "STV" ||
		ticker === "STW"
	);
}

/**
 * Whole days since a building's last repair, else since it was built.
 * FIO's AgeDays is computed when the response is built and can be hours
 * old, so it is not used.
 * @author jplacht
 *
 * @param {FIOSitePlanet["Buildings"][number]} building FIO building
 * @param {number} now Timestamp, ms
 * @returns {{ days: number | null; wasRepaired: boolean }} null without dates
 */
export function ageDays(
	building: Pick<
		FIOSitePlanet["Buildings"][number],
		"BuildingLastRepair" | "BuildingCreated"
	>,
	now: number
): { days: number | null; wasRepaired: boolean } {
	const from = building.BuildingLastRepair ?? building.BuildingCreated;
	return {
		days: from
			? Math.max(0, Math.floor((now - new Date(from).getTime()) / DAY_MS))
			: null,
		wasRepaired: building.BuildingLastRepair != null,
	};
}

/**
 * A site's production buildings: no habitations, storage or core module,
 * and only buildings that need repair materials. One repaired so recently
 * that FIO lists none yet still counts.
 * @author jplacht
 *
 * @param {FIOSitePlanet} site FIO site
 * @param {number} now Timestamp, ms
 * @returns {IFIORepairBuilding[]} Production buildings
 */
export function productionBuildings(
	site: FIOSitePlanet,
	now: number
): IFIORepairBuilding[] {
	return site.Buildings.filter(
		(b) =>
			!isInfrastructureBuilding(b.BuildingTicker) &&
			(b.RepairMaterials.length > 0 || b.BuildingLastRepair != null)
	).map((b) => ({
		ticker: b.BuildingTicker,
		...ageDays(b, now),
		condition: b.Condition,
	}));
}

/**
 * Days until a target day, negative is overdue
 *
 * @param {number} target Target day
 * @param {number} days Days since repair
 * @returns {number} Days left
 */
export function dueIn(target: number, days: number): number {
	return target - days;
}

/**
 * Status of a due date
 * @author jplacht
 *
 * @param {number | null} due Days left, null without a date
 * @param {number} dueSoon Days before the target that count as due soon
 * @returns {FIORepairStatus} Status
 */
export function repairStatus(
	due: number | null,
	dueSoon: number
): FIORepairStatus {
	if (due === null) return "unknown";
	if (due < 0) return "overdue";
	return due <= dueSoon ? "soon" : "later";
}

/**
 * Tag colour of a status; a building without date counts as overdue
 *
 * @param {FIORepairStatus} status Status
 * @returns {"error" | "warning" | "secondary"} PTag type
 */
export function statusTagType(
	status: FIORepairStatus
): "error" | "warning" | "secondary" {
	if (status === "overdue" || status === "unknown") return "error";
	return status === "soon" ? "warning" : "secondary";
}

/**
 * Groups a base's buildings by type, each due at its own target. The
 * base is due with its first type; a type with an undated building makes
 * the base "unknown", counted as overdue.
 * @author jplacht
 *
 * @param {IFIORepairBuilding[]} buildings Production buildings
 * @param {(ticker: string) => number} targetOf Target day per type
 * @param {number} dueSoon Due soon days
 * @returns {{ types: IFIORepairBuildingType[]; due: number | null; status: FIORepairStatus }}
 */
export function summarizeBuildings(
	buildings: IFIORepairBuilding[],
	targetOf: (ticker: string) => number,
	dueSoon: number
): {
	types: IFIORepairBuildingType[];
	due: number | null;
	status: FIORepairStatus;
} {
	const byTicker = new Map<string, IFIORepairBuilding[]>();
	for (const b of buildings) {
		const list = byTicker.get(b.ticker);
		if (list) list.push(b);
		else byTicker.set(b.ticker, [b]);
	}

	const types = [...byTicker].map(([ticker, list]) => {
		const target = targetOf(ticker);
		const oldest = oldestBuilding(list);
		const since = oldest.days;
		const due = since === null ? null : dueIn(target, since);
		return {
			ticker,
			count: list.length,
			target,
			since,
			wasRepaired: oldest.wasRepaired,
			condition: Math.min(...list.map((b) => b.condition)),
			due,
			status: repairStatus(due, dueSoon),
		};
	});

	// an undated building: the base has no due date and counts as overdue
	const undated = types.some((t) => t.status === "unknown");
	const due = undated ? null : Math.min(...types.map((t) => t.due!));
	const status = repairStatus(due, dueSoon);

	return {
		types: types.sort(
			(a, b) =>
				(a.due ?? -Infinity) - (b.due ?? -Infinity) ||
				a.ticker.localeCompare(b.ticker)
		),
		due,
		status,
	};
}

/**
 * The oldest building, one without a date first
 *
 * @param {IFIORepairBuilding[]} buildings Buildings, at least one
 * @returns {IFIORepairBuilding} Oldest
 */
export function oldestBuilding(
	buildings: IFIORepairBuilding[]
): IFIORepairBuilding {
	return buildings.reduce((a, b) =>
		a.days === null || (b.days !== null && a.days >= b.days) ? a : b
	);
}

/**
 * Repair materials for every given building, when the ship arrives in
 * `arrival` days. A building without a date is priced as a new one.
 * @author jplacht
 *
 * @param {IFIORepairBuilding[]} buildings Production buildings
 * @param {(ticker: string) => IMaterialIOMinimal[]} costOf Construction materials per type, with the planet's
 * @param {number} arrival Days until the ship unloads
 * @returns {IMaterialIOMinimal[]} Materials, as input
 */
export function repairBill(
	buildings: IFIORepairBuilding[],
	costOf: (ticker: string) => IMaterialIOMinimal[],
	arrival: number
): IMaterialIOMinimal[] {
	const sum = new Map<string, number>();
	for (const b of buildings) {
		const day = b.days === null ? REPAIR_DAY_MAX : b.days + arrival;
		for (const m of costOf(b.ticker))
			sum.set(
				m.ticker,
				(sum.get(m.ticker) ?? 0) + calculateAmountAtDay(day, m.input)
			);
	}
	return [...sum]
		.filter(([, input]) => input > 0)
		.map(([ticker, input]) => ({ ticker, input, output: 0 }));
}

/**
 * Takes what the base store already holds off a bill
 * @author jplacht
 *
 * @param {IMaterialIOMinimal[]} bill Materials, as input
 * @param {Record<string, number>} store Amount per ticker in the base store
 * @returns {{ load: IMaterialIOMinimal[]; fromStore: IMaterialIOMinimal[] }} What to bring and what the store covers
 */
export function subtractStore(
	bill: IMaterialIOMinimal[],
	store: Record<string, number>
): { load: IMaterialIOMinimal[]; fromStore: IMaterialIOMinimal[] } {
	const load: IMaterialIOMinimal[] = [];
	const fromStore: IMaterialIOMinimal[] = [];
	for (const m of bill) {
		const covered = Math.min(m.input, Math.max(0, store[m.ticker] ?? 0));
		if (covered > 0)
			fromStore.push({ ticker: m.ticker, input: covered, output: 0 });
		if (m.input > covered)
			load.push({
				ticker: m.ticker,
				input: m.input - covered,
				output: 0,
			});
	}
	return { load, fromStore };
}

/**
 * How much more the repair costs per day of waiting: every building
 * younger than 180 days adds 1/180 of its construction cost
 * (materials only)
 * @author jplacht
 *
 * @param {IFIORepairBuilding[]} buildings Production buildings
 * @param {(ticker: string) => number} costOf Construction cost per type, ȼ
 * @returns {number} ȼ per day
 */
export function waitingCostPerDay(
	buildings: IFIORepairBuilding[],
	costOf: (ticker: string) => number
): number {
	return buildings.reduce(
		(sum, b) =>
			b.days !== null && b.days < REPAIR_DAY_MAX
				? sum + costOf(b.ticker) / REPAIR_DAY_MAX
				: sum,
		0
	);
}

/**
 * Building count per type
 *
 * @param {{ ticker: string }[]} buildings Buildings
 * @returns {Record<string, number>} Count per ticker
 */
export function countByTicker(
	buildings: { ticker: string }[]
): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const b of buildings) counts[b.ticker] = (counts[b.ticker] ?? 0) + 1;
	return counts;
}

/**
 * A plan's production building count per type
 *
 * @param {Plan} plan Plan
 * @returns {Record<string, number>} Count per ticker
 */
function planCounts(plan: Plan): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const b of plan.plan_data.buildings)
		if (b.amount > 0 && !isInfrastructureBuilding(b.name))
			counts[b.name] = (counts[b.name] ?? 0) + b.amount;
	return counts;
}

/**
 * How well a plan matches a base: Σ min(fio, plan) / max(Σ fio, Σ plan)
 * over the production building types
 * @author jplacht
 *
 * @param {Record<string, number>} fio Count per type on the base
 * @param {Record<string, number>} plan Count per type in the plan
 * @returns {number} 0..1
 */
export function matchScore(
	fio: Record<string, number>,
	plan: Record<string, number>
): number {
	const total = (c: Record<string, number>) =>
		Object.values(c).reduce((s, n) => s + n, 0);
	const max = Math.max(total(fio), total(plan));
	if (max === 0) return 0;
	let common = 0;
	for (const [ticker, n] of Object.entries(fio))
		common += Math.min(n, plan[ticker] ?? 0);
	return common / max;
}

/**
 * Matches every FIO base to a plan on its planet. The best score of at
 * least 0.8 wins; on a tie, the plan in the empire that holds the most
 * auto-matched bases. A user's pick per SiteId wins, unless its plan is
 * gone or on another planet.
 * @author jplacht
 *
 * @param {{ planet: string; siteId: string | undefined; counts: Record<string, number> }[]} sites Bases
 * @param {Plan[]} plans User's plans
 * @param {PlanEmpireElement[]} empires User's empires
 * @param {UserPreference["fioRepairPlanLinks"]} links Picks per SiteId
 * @returns {Record<string, IFIORepairMatch>} Match per planet
 */
export function matchPlans(
	sites: {
		planet: string;
		siteId: string | undefined;
		counts: Record<string, number>;
	}[],
	plans: Plan[],
	empires: PlanEmpireElement[],
	links: UserPreference["fioRepairPlanLinks"]
): Record<string, IFIORepairMatch> {
	const empiresOf = (plan: Plan) =>
		empires.filter((e) => e.plans.some((p) => p.uuid === plan.uuid));

	const scored = sites.map((site) => {
		const candidates = plans
			.filter((p) => p.planet_natural_id === site.planet)
			.map((plan) => ({
				plan,
				score: matchScore(site.counts, planCounts(plan)),
			}))
			.sort(
				(a, b) =>
					b.score - a.score ||
					a.plan.plan_name.localeCompare(b.plan.plan_name)
			);
		const top = candidates[0]?.score ?? 0;
		const best =
			top >= MATCH_THRESHOLD
				? candidates.filter((c) => c.score === top)
				: [];
		return { site, candidates, best };
	});

	// bases each empire could match automatically
	const coverage = new Map<string, number>();
	for (const { best } of scored)
		for (const uuid of new Set(
			best.flatMap((c) => empiresOf(c.plan).map((e) => e.uuid))
		))
			coverage.set(uuid, (coverage.get(uuid) ?? 0) + 1);

	const covering = (plan: Plan): PlanEmpireElement | undefined =>
		empiresOf(plan).reduce<PlanEmpireElement | undefined>(
			(a, e) =>
				!a || (coverage.get(e.uuid) ?? 0) > (coverage.get(a.uuid) ?? 0)
					? e
					: a,
			undefined
		);
	const weight = (c: IFIORepairCandidate) =>
		c.empire ? (coverage.get(c.empire.uuid) ?? 0) : -1;

	const result: Record<string, IFIORepairMatch> = {};
	for (const { site, candidates: raw, best } of scored) {
		const candidates: IFIORepairCandidate[] = raw.map((c) => ({
			...c,
			empire: covering(c.plan),
		}));

		const link = site.siteId ? links[site.siteId] : undefined;
		const linked =
			link?.planUuid != null
				? candidates.find((c) => c.plan.uuid === link.planUuid)
				: undefined;

		if (link && link.planUuid === null) {
			result[site.planet] = {
				candidate: undefined,
				confidence: "nopick",
				candidates,
			};
		} else if (linked) {
			result[site.planet] = {
				candidate: linked,
				confidence: "picked",
				candidates,
			};
		} else {
			const auto = candidates
				.filter((c) => best.some((b) => b.plan === c.plan))
				.reduce<IFIORepairCandidate | undefined>(
					(a, c) => (!a || weight(c) > weight(a) ? c : a),
					undefined
				);
			result[site.planet] = {
				candidate: auto,
				confidence: !auto
					? "none"
					: auto.score >= 1
						? "match"
						: "likely",
				candidates,
			};
		}
	}
	return result;
}

/**
 * Best repair day per building type of a calculated plan, the same as
 * the plan's Repair Analysis
 * @author jplacht
 *
 * @param {IPlanResult} result Plan result
 * @param {IPriceBook} prices Price book of the plan's CX and planet
 * @returns {Record<string, number>} Best day per ticker
 */
export function bestDays(
	result: IPlanResult,
	prices: IPriceBook
): Record<string, number> {
	return Object.fromEntries(
		result.production.buildings
			.filter((b) => b.amount > 0)
			.map((b) => [b.name, repairCurveOf(b, prices).best])
	);
}

const TICK_STEPS = [5, 15, 30, 60, 90, 180, 360];

/**
 * Timeline axis from the most overdue base to the one due last, always
 * with today and the due soon band; ticks every 5, 15, 30 or 60 days by
 * span, coarser while there are more than `maxTicks` (narrow screens)
 * @author jplacht
 *
 * @param {number[]} dues Days left per base
 * @param {number} dueSoon Due soon days
 * @param {number} maxTicks Most ticks that fit the track
 * @returns {IFIORepairTimelineAxis} Axis
 */
export function timelineAxis(
	dues: number[],
	dueSoon: number,
	maxTicks: number = Infinity
): IFIORepairTimelineAxis {
	const lo = Math.min(0, ...dues);
	const hi = Math.max(dueSoon, ...dues);
	const span = hi - lo || 1;
	const range = (step: number) => {
		const from = Math.floor(lo / step) * step;
		const to = Math.max(Math.ceil(hi / step) * step, from + step);
		return { from, to, step, count: (to - from) / step + 1 };
	};

	let i = span <= 40 ? 0 : span <= 90 ? 1 : span <= 180 ? 2 : 3;
	let axis = range(TICK_STEPS[i]);
	while (axis.count > maxTicks && i < TICK_STEPS.length - 1)
		axis = range(TICK_STEPS[++i]);

	const ticks: number[] = [];
	for (let d = axis.from; d <= axis.to; d += axis.step) ticks.push(d);
	return { from: axis.from, to: axis.to, step: axis.step, ticks };
}

/**
 * Position of a day on the axis
 *
 * @param {IFIORepairTimelineAxis} axis Axis
 * @param {number} day Days left
 * @returns {number} 0..100
 */
export function timelinePct(axis: IFIORepairTimelineAxis, day: number): number {
	const clamped = Math.min(Math.max(day, axis.from), axis.to);
	return ((clamped - axis.from) / (axis.to - axis.from)) * 100;
}

/** chip width in px: text plus dot and padding */
// ponytail: estimated from the label length, measure the chips if long names clip
const chipPx = (label: string) => label.length * 7.2 + 26;
const MAX_LANES = 4;

/**
 * Puts timeline chips into up to 4 lanes without overlaps. Chips that
 * would run over the right edge grow to the left. Where all lanes are
 * taken, the rest folds into "+n" groups on the row below.
 * @author jplacht
 *
 * @param {IFIORepairTimelineChip[]} chips Chips, any order
 * @param {number} trackPx Track width in px
 * @returns {IFIORepairTimelineLayout} Layout
 */
export function timelineLanes(
	chips: IFIORepairTimelineChip[],
	trackPx: number
): IFIORepairTimelineLayout {
	const ends: number[] = [];
	const placed: IFIORepairTimelineLayout["chips"] = [];
	const crowded: { pct: number; keys: string[] }[] = [];

	for (const chip of [...chips].sort((a, b) => a.pct - b.pct)) {
		const width = (chipPx(chip.label) / Math.max(trackPx, 1)) * 100;
		const flip = chip.pct + width > 100;
		const start = flip ? chip.pct - width : chip.pct;
		const end = flip ? chip.pct : chip.pct + width;

		let lane = 0;
		while (
			lane < MAX_LANES &&
			ends[lane] !== undefined &&
			ends[lane] > start - 0.5
		)
			lane++;

		if (lane === MAX_LANES) {
			const last = crowded[crowded.length - 1];
			if (last && chip.pct - last.pct < 8) last.keys.push(chip.key);
			else crowded.push({ pct: chip.pct, keys: [chip.key] });
			continue;
		}
		ends[lane] = end;
		placed.push({ ...chip, lane, flip });
	}

	return {
		chips: placed,
		more: crowded,
		lanes: Math.max(1, ends.length) + (crowded.length ? 1 : 0),
	};
}
