// Util
import { formatNumber } from "@/util/numbers";

// Static
import {
	SHIP_COST_FALLBACK,
	SHIP_PRICE,
	SHIPS,
} from "@/features/base_roi/baseROI.constants";

// Types & Interfaces
import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
import type {
	IBaseROIDetailLine,
	IBaseROIDetailSection,
	IBaseROIRow,
} from "@/features/base_roi/baseROI.types";

type Translate = (
	key: string,
	named?: Record<string, unknown>,
	plural?: number
) => string;

const money = (n: number) => formatNumber(n, 0);
const num = (n: number, d = 2) => formatNumber(n, d);
const days = (n: number) => (Number.isFinite(n) ? `${num(n, 1)} d` : "—");

/** "1x MG + 1x S → 1x IND" */
export function recipeLabel(row: IBaseROIRow): string {
	const recipe = row.result.production.buildings[0]?.activeRecipes[0]?.recipe;
	if (!recipe) return row.recipeId;
	const side = (m: { material_ticker: string; material_amount: number }[]) =>
		m.map((x) => `${num(x.material_amount, 1)}x ${x.material_ticker}`).join(" + ");
	return recipe.inputs.length
		? `${side(recipe.inputs)} → ${side(recipe.outputs)}`
		: side(recipe.outputs);
}

/**
 * The full math of one row in ten sections, each value with the formula
 * that made it. The detail shows them, "Copy as text" copies them.
 *
 * @param {IBaseROIRow} row Row
 * @param {BaseROISettings} s Settings
 * @param {Translate} t vue-i18n t
 * @returns {IBaseROIDetailSection[]} Sections 1–10
 */
export function detailSections(
	row: IBaseROIRow,
	s: BaseROISettings,
	t: Translate
): IBaseROIDetailSection[] {
	const k = (key: string, named?: Record<string, unknown>) =>
		t(`base_roi.detail.${key}`, named ?? {});
	const m = row.metrics;
	const production = row.result.production.buildings[0];
	const recipe = production?.activeRecipes[0]?.recipe;
	const efficiency = production?.totalEfficiency ?? 0;
	const priceOf = new Map(row.materials.map((x) => [x.ticker, x.price]));

	// 1 layout and building cost
	const layout: IBaseROIDetailLine[] = row.buildingCosts.map((b) => ({
		label: b.ticker,
		value: money(b.amount * b.unitCost),
		formula: `${b.amount} × ${money(b.unitCost)}`,
	}));
	const ship = SHIPS[s.logistics === "ship" ? s.ship : SHIP_COST_FALLBACK];
	const shipName = s.logistics === "ship" ? s.ship : SHIP_COST_FALLBACK;
	layout.push(
		{
			label: k("area_used"),
			value: `${num(row.areaUsed, 0)} / ${num(row.areaTotal, 0)}`,
		},
		{
			label: k("construction"),
			value: money(row.construction),
			formula: k("construction_formula"),
		},
		...row.environmentMaterials.map((e) => ({
			label: `${k("environment")}: ${e.ticker}`,
			ticker: e.ticker,
			value: money(e.amount * e.price),
			formula: `${num(e.amount, 0)} × ${money(e.price)} · ${k("environment_formula")}`,
		})),
		{
			label: k("hq"),
			value: money(m.hqCost),
			formula:
				s.targetPermit >= 3
					? k("hq_formula", { level: s.targetPermit - 1 })
					: k("hq_off"),
		},
		{
			label: k("ships"),
			value: money(m.shipCost),
			formula:
				s.roundTripHours > 0
					? k("ships_formula", {
							ships: num(m.shipsNeeded, 3),
							price: money(SHIP_PRICE),
							ship: shipName,
							hours: s.roundTripHours,
						})
					: k("ships_off"),
		},
		{
			label: k("buffer_stock"),
			value: money(m.bufferStock),
			formula: k("buffer_formula", {
				days: s.bufferDays,
				inputs: money(row.inputs),
				consumables: money(row.consumables),
				revenue: money(row.revenue),
			}),
		},
		{
			label: k("building_cost"),
			value: money(m.buildingCost),
			formula: k("building_cost_formula"),
			total: true,
		}
	);

	// 2 logistics and storage
	const weight = Math.max(row.weightIn, row.weightOut);
	const volume = Math.max(row.volumeIn, row.volumeOut);
	const cargo = (w: number, v: number) =>
		k("cargo_value", { weight: num(w, 1), volume: num(v, 1) });
	let check = k("no_limit");
	let checkFormula: string | undefined;
	if (s.logistics !== "none") {
		check = m.fitsLogistics ? k("fits") : k("too_large");
		checkFormula =
			s.logistics === "ship"
				? k("ship_formula", {
						days: s.visitDays,
						weight: num(weight, 1),
						volume: num(volume, 1),
						capWeight: ship.weight,
						capVolume: ship.volume,
					})
				: k("manual_formula", {
						weight: num(weight, 1),
						volume: num(volume, 1),
						capWeight: s.manualWeight,
						capVolume: s.manualVolume,
					});
	}
	const logistics: IBaseROIDetailLine[] = [
		{ label: k("buffer_days"), value: `${s.bufferDays} d` },
		{ label: k("cargo_in"), value: cargo(row.weightIn, row.volumeIn) },
		{ label: k("cargo_out"), value: cargo(row.weightOut, row.volumeOut) },
		{
			label: k("needed"),
			value: num(s.bufferDays * m.cargo, 0),
			formula: k("needed_formula", {
				days: s.bufferDays,
				cargo: num(m.cargo, 1),
			}),
		},
		{
			label: k("storage"),
			value: num(Math.min(row.storageWeight, row.storageVolume), 0),
		},
		{
			label: k("storage_added"),
			value: `${row.storageAdded.STO} / ${row.storageAdded.STA}`,
		},
		{ label: k("ship_check"), value: check, formula: checkFormula, total: true },
	];

	// 3 production efficiency
	const efficiencyLines: IBaseROIDetailLine[] = (
		production?.efficiencyElements ?? []
	).map((e) => ({
		label: t(`game.efficiency_type.${e.efficiencyType}`),
		value: num(e.value, 4),
	}));
	efficiencyLines.push({
		label: k("efficiency_total"),
		value: num(efficiency, 4),
		formula: k("efficiency_formula"),
		total: true,
	});

	// 4 line runs
	const baseHours = (recipe?.time_ms ?? 0) / 3_600_000;
	const cycle = efficiency > 0 ? baseHours / efficiency : Infinity;
	const runsPerBuilding = Number.isFinite(cycle) && cycle > 0 ? 24 / cycle : 0;
	const runsPerDay = runsPerBuilding * row.productionBuildings;
	const runs: IBaseROIDetailLine[] = [
		{
			label: k("production_buildings"),
			value: String(row.productionBuildings),
		},
		{ label: k("base_time"), value: `${num(baseHours, 3)} h` },
		{
			label: k("cycle"),
			value: `${num(cycle, 3)} h`,
			formula: k("cycle_formula", {
				base: `${num(baseHours, 3)} h`,
				efficiency: num(efficiency, 4),
			}),
		},
		{
			label: k("runs_building"),
			value: num(runsPerBuilding, 3),
			formula: k("runs_building_formula"),
		},
		{
			label: k("runs_day"),
			value: num(runsPerDay, 2),
			formula: k("runs_day_formula", {
				buildings: row.productionBuildings,
				runs: num(runsPerBuilding, 3),
			}),
			total: true,
		},
	];

	// 5 yield
	const yields: IBaseROIDetailLine[] = (recipe?.outputs ?? []).map((o) => ({
		label: o.material_ticker,
		ticker: o.material_ticker,
		value: num(o.material_amount * runsPerDay, 2),
		formula: `${num(o.material_amount, 2)} × ${num(runsPerDay, 2)} · ${k("yield_formula")}`,
	}));

	// 6 money per day
	const priced = (ticker: string, amount: number, sign: number) => {
		const price = priceOf.get(ticker);
		return {
			label: ticker,
			ticker,
			value:
				price === undefined ? "—" : money(sign * amount * price),
			formula:
				price === undefined
					? undefined
					: `${num(amount, 2)} × ${num(price, 2)}`,
		};
	};
	const moneyLines: IBaseROIDetailLine[] = [
		{ label: k("outputs"), value: money(row.revenue) },
		...row.materials
			.filter((x) => x.amount > 0)
			.map((x) => priced(x.ticker, x.amount, 1)),
		{ label: k("inputs"), value: money(-row.inputs) },
		...row.result.productionMaterialIO
			.filter((x) => x.input > x.output)
			.map((x) => priced(x.ticker, x.input - x.output, -1)),
		{ label: k("consumables"), value: money(-row.consumables) },
		...row.result.workforceMaterialIO
			.filter((x) => x.input > 0)
			.map((x) => priced(x.ticker, x.input, -1)),
		{
			label: k("degradation"),
			value: money(-row.degradation),
			formula: k("degradation_formula"),
		},
		{
			label: k("daily_profit"),
			value: money(m.dailyProfit),
			total: true,
		},
	];

	// 7 break-even
	const breakEven: IBaseROIDetailLine[] =
		s.experts === "ramp"
			? m.timeline.map((stage) => ({
					label: k("stage", { n: stage.experts }),
					value:
						stage.paidAfter !== null
							? k("stage_paid", { days: days(stage.paidAfter) })
							: days(stage.days),
					formula: k("stage_line", {
						remaining: money(stage.remaining),
						profit: money(stage.dailyProfit),
						days: Number.isFinite(stage.days)
							? days(stage.days)
							: k("stage_rest"),
					}),
				}))
			: [];
	breakEven.push(
		{
			label: Number.isFinite(m.breakEven)
				? k("paid_on", { days: num(m.breakEven, 1) })
				: k("never"),
			value: days(m.breakEven),
			total: true,
		},
		{
			label:
				s.experts === "ramp" ? k("payback_five") : k("payback_fixed"),
			value: days(m.payback),
		}
	);

	// 8 market capacity
	const capacity: IBaseROIDetailLine[] = row.outputs.map((o) => ({
		label: o.ticker,
		ticker: o.ticker,
		value: num(o.amount > 0 ? o.traded / o.amount : 0, 2),
		formula: `${num(o.traded, 1)} ÷ ${num(o.amount, 1)}`,
	}));

	// 9 profit history: the chart, the note
	const history: IBaseROIDetailLine[] = [
		{ label: k("daily_profit"), value: money(m.dailyProfit) },
	];

	// 10 recipe and planet
	const place: IBaseROIDetailLine[] = [
		{ label: k("recipe"), value: recipeLabel(row) },
		{
			label: k("planet"),
			value: row.planetNaturalId
				? `${row.planetName ?? row.planetNaturalId} (${row.jumps ?? "—"})`
				: k("standard_planet"),
		},
		...(row.planetCOGC
			? [
					{
						label: k("real_cogc", { program: row.planetCOGC }),
						value: "",
					},
				]
			: []),
	];

	return [
		layout,
		logistics,
		efficiencyLines,
		runs,
		yields,
		moneyLines,
		breakEven,
		capacity,
		history,
		place,
	].map((lines, i) => ({ id: i + 1, title: k(`s${i + 1}`), lines }));
}

/**
 * The sections as plain text, one line per value
 *
 * @param {string} heading First line, e.g. "IND · CHP"
 * @param {IBaseROIDetailSection[]} sections Sections
 * @returns {string} Text
 */
export function detailText(
	heading: string,
	sections: IBaseROIDetailSection[]
): string {
	return [
		heading,
		...sections.flatMap((s) => [
			"",
			`${s.id} ${s.title}`,
			...s.lines.map(
				(l) =>
					`  ${l.label}: ${l.value}${l.formula ? ` (${l.formula})` : ""}`
			),
		]),
	].join("\n");
}
