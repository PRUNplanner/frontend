// Util
import { formatNumber, formatPercent } from "@/util/numbers";

// Static
import { SHIPS } from "@/features/base_roi/baseROI.constants";

// Types & Interfaces
import type {
	BaseROIColumn,
	BaseROISettings,
} from "@/features/base_roi/baseROI.schemas";
import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

type Translate = (
	key: string,
	named?: Record<string, unknown>,
	plural?: number
) => string;

const money = (n: number) => formatNumber(n, 0);
const num = (n: number, d = 1) => formatNumber(n, d);
const days = (n: number) => `${num(n)} d`;

/**
 * The napkin math behind one table cell, a few short lines from the row's
 * own numbers (no engine pass). The row detail has the full math.
 *
 * @param {IBaseROIRow} row Row
 * @param {BaseROIColumn} column Column
 * @param {BaseROISettings} s Settings
 * @param {Translate} t vue-i18n t
 * @returns {string[]} Lines, empty when the column has none
 */
export function cellMath(
	row: IBaseROIRow,
	column: BaseROIColumn,
	s: BaseROISettings,
	t: Translate
): string[] {
	const k = (
		key: string,
		named: Record<string, unknown> = {},
		plural?: number
	) => t(`base_roi.tooltips.math.${key}`, named, plural);
	const m = row.metrics;

	switch (column) {
		case "daily_profit":
			return [
				k("revenue", { value: money(row.revenue) }),
				k("minus_inputs", { value: money(row.inputs) }),
				k("minus_consumables", { value: money(row.consumables) }),
				k("minus_degradation", { value: money(row.degradation) }),
				k("per_day", { value: money(m.dailyProfit) }),
			];
		case "break_even": {
			if (s.experts !== "ramp" || !m.timeline.length)
				return [
					Number.isFinite(m.breakEven)
						? k("divide", {
								cost: money(m.buildingCost),
								profit: money(m.dailyProfit),
								days: days(m.breakEven),
							})
						: k("never"),
				];
			// the stages until it is paid off, each with its own profit
			const lines = [k("cost", { value: money(m.buildingCost) })];
			for (const stage of m.timeline) {
				const paid = stage.paidAfter !== null;
				const length = paid ? stage.paidAfter! : stage.days;
				lines.push(
					Number.isFinite(length)
						? k(
								"stage",
								{
									n: stage.experts,
									days: days(length),
									profit: money(stage.dailyProfit),
								},
								stage.experts
							)
						: k(
								"stage_rest",
								{
									n: stage.experts,
									profit: money(stage.dailyProfit),
								},
								stage.experts
							)
				);
				if (paid) break;
			}
			lines.push(
				Number.isFinite(m.breakEven)
					? k("paid", { days: days(m.breakEven) })
					: k("never")
			);
			return lines;
		}
		case "weekly_return":
			return [
				k("weekly", {
					profit: money(m.dailyProfit),
					cost: money(m.buildingCost),
					value: formatPercent(m.weeklyReturn * 100, 1),
				}),
			];
		case "building_cost":
			return [
				k("construction", { value: money(row.construction) }),
				k("plus_buffer", {
					days: s.bufferDays,
					value: money(m.bufferStock),
				}),
				...(m.hqCost > 0
					? [k("plus_hq", { value: money(m.hqCost) })]
					: []),
				k("total", { value: money(m.buildingCost) }),
			];
		case "running_cost":
			return [
				k("inputs", { value: money(row.inputs) }),
				k("plus_consumables", { value: money(row.consumables) }),
				k("plus_degradation", { value: money(row.degradation) }),
				k("per_day", { value: money(m.runningCost) }),
			];
		case "cargo": {
			const lines = [
				k("cargo_in", {
					weight: num(row.weightIn),
					volume: num(row.volumeIn),
				}),
				k("cargo_out", {
					weight: num(row.weightOut),
					volume: num(row.volumeOut),
				}),
			];
			if (s.logistics === "ship") {
				const ship = SHIPS[s.ship];
				lines.push(
					k("cargo_ship", {
						days: s.visitDays,
						weight: num(
							Math.max(row.weightIn, row.weightOut) * s.visitDays,
							0
						),
						volume: num(
							Math.max(row.volumeIn, row.volumeOut) * s.visitDays,
							0
						),
						ship: s.ship,
						capWeight: ship.weight,
						capVolume: ship.volume,
					})
				);
			}
			return lines;
		}
		case "market_capacity": {
			// both sides, outputs then recipe inputs, then which one limits
			const side = (list: typeof row.outputs, key: string) =>
				list.map((m) =>
					k(key, {
						ticker: m.ticker,
						traded: num(m.traded),
						amount: num(m.amount),
						value: num(m.amount > 0 ? m.traded / m.amount : 0, 2),
					})
				);
			return [
				...side(row.outputs, "capacity_out"),
				...side(row.recipeInputs, "capacity_in"),
				...(m.capacityTicker
					? [
							k("bottleneck", {
								ticker: m.capacityTicker,
								side: m.capacitySide === "input" ? "I" : "O",
							}),
						]
					: []),
			];
		}
		default:
			return [];
	}
}
