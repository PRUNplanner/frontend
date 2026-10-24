// Util
import {
	cogcKey,
	expertKey,
	expertsText,
	formatMoney,
	formatQty,
	formatShare,
} from "@/features/production_chain/productionChain.util";
import { formatNumber } from "@/util/numbers";

// Types & Interfaces
import type { PlanetSearchIndexEntry } from "@/features/api/schemas/gameData.schemas";
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
import type {
	ICheckBase,
	ICheckFinding,
	ICheckLocationFinding,
	ICheckOption,
	ICheckStep,
} from "@/features/production_chain/engine/chainCheck.types";

/** vue-i18n's t, as far as these texts use it */
export type ICheckT = (key: string, named?: Record<string, unknown>) => string;

const FARMS = ["FRM", "ORC"];

/** a planet's name, its id without one */
export const planetShort = (p: PlanetSearchIndexEntry | null, id = "") =>
	p?.planet_name || p?.planet_natural_id || id;

/** "+1,234 ȼ" */
export function signedMoney(t: ICheckT, v: number): string {
	return `${v > 0 ? "+" : ""}${t("production_chains.money", { value: formatMoney(v) })}`;
}

export function money(t: ICheckT, v: number): string {
	return t("production_chains.money", { value: formatMoney(v) });
}

export function programName(t: ICheckT, p: PlanCOGCProgram): string {
	return p === "---"
		? t("production_chains.check.finding.no_program")
		: t(cogcKey(p));
}

/** buildings a move takes: the step's buildings, whole */
export const moveCount = (s: ICheckStep) =>
	Math.max(1, Math.ceil(s.buildings - 1e-6));

/**
 * Why a planet suits a step better: its program, fertility or rate
 * @author jplacht
 */
export function optionWhy(
	t: ICheckT,
	f: ICheckLocationFinding,
	o: ICheckOption,
	here: PlanetSearchIndexEntry | null,
	hereRunning: PlanCOGCProgram
): string {
	const parts: string[] = [];
	if (o.runsProgram && f.expertise && o.running !== hereRunning)
		parts.push(
			t("production_chains.check.finding.why_program", {
				program: t(`game.expertise.${f.expertise}`),
			})
		);
	if (FARMS.includes(f.step.building))
		parts.push(
			t("production_chains.check.finding.why_fertility", {
				there: formatShare(o.planet.fertility),
				here: here ? formatShare(here.fertility) : "—",
			})
		);
	if (o.rate !== null)
		parts.push(
			t("production_chains.check.finding.why_rate", {
				there: formatNumber(o.rate, 1),
				ticker: f.step.ticker,
				building: f.step.building,
				here: formatNumber(f.hereRate ?? 0, 1),
			})
		);
	return parts.join(", ");
}

/**
 * Title and detail of a finding
 * @author jplacht
 *
 * @param {ICheckT} t Translate
 * @param {ICheckFinding} f Finding
 * @param {ICheckBase} base Its base
 * @param {(id: string) => string} nameOf Plan name of a base
 * @returns {{ title: string; detail: string }} Texts
 */
export function findingText(
	t: ICheckT,
	f: ICheckFinding,
	base: ICheckBase,
	nameOf: (id: string) => string
): { title: string; detail: string } {
	const k = (key: string, named: Record<string, unknown> = {}) =>
		t(`production_chains.check.finding.${key}`, named);
	const planet = planetShort(base.planet, base.plan.planetId);
	const expertName = (type: string) =>
		t(expertKey(type as Parameters<typeof expertKey>[0]));

	switch (f.kind) {
		case "fix": {
			const buildings = [
				...new Map(f.steps.map((s) => [s.building, s.built])),
			]
				.map(([b, n]) => `${n} ${b}`)
				.join(", ");
			const named = {
				program: programName(t, f.program),
				running: programName(t, f.running),
				planet,
				buildings,
				pct: formatShare(Math.abs(f.factor)),
			};
			return f.fix === "lost"
				? { title: k("fix_lost", named), detail: k("fix_lost_detail", named) }
				: {
						title: k("fix_missed", named),
						detail: k("fix_missed_detail", named),
					};
		}
		case "recipe":
			return {
				title: k("recipe", {
					ticker: f.step.ticker,
					building: f.step.building,
				}),
				detail: [
					k("recipe_detail", {
						now: formatNumber(f.now, 0),
						alt: formatNumber(f.alt, 0),
						ticker: f.step.ticker,
						qty: formatQty(f.step.perDay),
						need: formatNumber(f.need, 2),
						building: f.step.building,
						count: formatQty(f.step.buildings),
					}),
					f.extra ? k("recipe_extra", { n: f.extra }) : "",
				]
					.filter(Boolean)
					.join(" "),
			};
		case "buy":
			return {
				title: k("buy", { ticker: f.step.ticker }),
				detail: k("buy_detail", {
					cost: formatNumber(f.cost, 0),
					price: formatNumber(f.price, 0),
					cx: f.market.exchange,
					qty: formatQty(f.step.perDay),
					share:
						f.market.sharePct === null
							? k("buy_no_trades", { cx: f.market.exchange })
							: formatShare(f.market.sharePct / 100),
					count: formatQty(f.step.buildings),
					building: f.step.building,
				}),
			};
		case "location": {
			const o = f.option;
			const other = base.plan.id === o.own ? null : o.own;
			const to = other
				? k("move_own", { id: other, name: nameOf(other) })
				: k("move_new", { planet: planetShort(o.planet) });
			const better = f.better;
			return {
				title: k("move", {
					count: moveCount(f.step),
					building: f.step.building,
					ticker: f.step.ticker,
					to,
					pct: formatShare(o.ratio - 1),
				}),
				detail: [
					f.picked ? k("move_picked") : "",
					k("move_detail", {
						planet: planetShort(o.planet),
						why: optionWhy(t, f, o, base.planet, base.running),
						fewer: formatNumber(moveCount(f.step) / o.ratio, 1),
						building: f.step.building,
					}),
					better.length === 1
						? k("move_better_one", { planet: planetShort(better[0].planet) })
						: better.length > 1
							? k("move_better_many", { n: better.length })
							: "",
				]
					.filter(Boolean)
					.join(" "),
			};
		}
		case "setup":
			if (f.setup === "lux")
				return {
					title: k("lux", { pct: formatShare(f.factor) }),
					detail: k("lux_detail", {
						lux: t(`production_chains.check.lux.${f.lux}`),
						cost: money(t, f.cost),
						gain: money(t, f.gain),
					}),
				};
			return {
				title: k("experts", { text: expertsText(f.experts, expertName) }),
				detail: k("experts_detail", {
					text:
						expertsText(f.now, expertName) ||
						t("production_chains.check.bases.none"),
				}),
			};
	}
}

/** the Planet Search link for a step: its resource, fertile planets or its program */
export function planetSearchQuery(
	f: ICheckLocationFinding
): Record<string, string> {
	if (f.step.extraction) return { m: `any:${f.step.ticker}` };
	if (FARMS.includes(f.step.building)) return { fert: "1" };
	return f.expertise ? { cogc: `ADVERTISING_${f.expertise}` } : {};
}

export interface ICheckChip {
	label: string;
	type: "success" | "error" | "warning" | "secondary";
	title?: string;
}

/**
 * An option's chips: base, plots, room, payback, suggested or picked
 * @author jplacht
 */
export function optionChips(
	t: ICheckT,
	f: ICheckLocationFinding,
	o: ICheckOption,
	payback: number
): ICheckChip[] {
	const k = (key: string, named: Record<string, unknown> = {}) =>
		t(`production_chains.check.options.${key}`, named);
	const chips: ICheckChip[] = [];
	if (o.own) chips.push({ label: k("your_base"), type: "secondary" });
	else if (o.full) chips.push({ label: k("full"), type: "error" });
	else if (o.ghostOnly)
		chips.push({ label: k("ghost"), type: "warning", title: k("ghost_title") });
	else if (o.plots)
		chips.push({
			label: k("plots", {
				free: formatNumber(o.plots.free, 0),
				total: formatNumber(o.plots.total, 0),
			}),
			type: "success",
		});
	else chips.push({ label: k("plots_unknown"), type: "secondary" });
	if (!o.fits) chips.push({ label: k("no_room"), type: "warning" });
	if (o.slow) chips.push({ label: k("slow", { n: payback }), type: "warning" });
	if (o === f.option)
		chips.push({ label: k(f.picked ? "picked" : "suggested"), type: "success" });
	return chips;
}

/** an option failing a check is dimmed but keeps its rank */
export const optionDimmed = (o: ICheckOption) => o.full || !o.fits || o.slow;
