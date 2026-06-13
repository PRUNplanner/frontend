import {
	solve,
	lessEq,
	greaterEq,
	Model,
	Constraint,
	Solution,
} from "yalps";

import { IMaterial } from "@/features/api/gameData.types";
import {
	IBurnDemandItem,
	IXITActionElement,
} from "@/features/xit/xitAction.types";

const EPSILON = 1e-6;

export interface IBurnPrefillResult {
	selected: Map<string, number>;
	usedVolume: number;
	usedWeight: number;
	guaranteed: Set<string>;
}

export interface IBurnSolveOptions {
	volumeCapacity: number;
	weightCapacity: number;
	targetDays: number;
	fullCoverBelowBurnPerDay?: number;
	integer?: boolean;
	allowOverTarget?: boolean;
}

function varName(ticker: string): string {
	return "x_" + ticker;
}

function loadCap(
	item: IBurnDemandItem,
	allowOverTarget: boolean,
	volumeCapacity: number,
	weightCapacity: number
): number {
	if (!allowOverTarget) {
		return item.need;
	}
	const byVolume =
		item.volumePerUnit > 0
			? volumeCapacity / item.volumePerUnit
			: Infinity;
	const byWeight =
		item.weightPerUnit > 0
			? weightCapacity / item.weightPerUnit
			: Infinity;
	return Math.max(item.need, Math.floor(Math.min(byVolume, byWeight)));
}

function readSolution(
	result: Solution,
	items: IBurnDemandItem[]
): Map<string, number> {
	const selected = new Map<string, number>();
	const varMap = new Map(result.variables);
	for (const item of items) {
		const raw = varMap.get(varName(item.ticker)) ?? 0;
		selected.set(item.ticker, raw);
	}
	return selected;
}

function minDays(
	selected: Map<string, number>,
	items: IBurnDemandItem[]
): number {
	let min = Infinity;
	for (const item of items) {
		if (item.burnPerDay <= 0) continue;
		const qty = selected.get(item.ticker) ?? 0;
		min = Math.min(
			min,
			(item.currentStock + qty) / item.burnPerDay
		);
	}
	return Number.isFinite(min) ? min : 0;
}

export function buildBurnDemand(
	elements: IXITActionElement[],
	materialsMap: Record<string, IMaterial>,
	targetDays: number,
	defaultPriority = 1
): IBurnDemandItem[] {
	const items: IBurnDemandItem[] = [];

	for (const element of elements) {
		if (element.delta >= 0) continue;

		const material = materialsMap[element.ticker];
		if (!material) continue;

		const weightPerUnit = material.weight;
		const volumePerUnit = material.volume;
		if (
			!Number.isFinite(weightPerUnit) ||
			weightPerUnit <= 0 ||
			!Number.isFinite(volumePerUnit) ||
			volumePerUnit <= 0
		) {
			continue;
		}

		const burnPerDay = element.delta * -1;
		const targetQuantity = burnPerDay * targetDays;
		const currentStock = element.stock;
		const need = Math.max(0, targetQuantity - currentStock);

		items.push({
			ticker: element.ticker,
			burnPerDay,
			targetDays,
			targetQuantity,
			currentStock,
			need,
			weightPerUnit,
			volumePerUnit,
			priority: defaultPriority,
		});
	}

	return items;
}

export function prefillGuaranteed(
	items: IBurnDemandItem[],
	{
		volumeCapacity,
		weightCapacity,
		integer,
		thresholdBurn,
	}: {
		volumeCapacity: number;
		weightCapacity: number;
		integer: boolean;
		thresholdBurn: number;
	}
): IBurnPrefillResult {
	const selected = new Map<string, number>();
	const guaranteed = new Set<string>();
	let usedVolume = 0;
	let usedWeight = 0;

	if (!(thresholdBurn > 0)) {
		return { selected, usedVolume, usedWeight, guaranteed };
	}

	const candidates = items
		.filter(
			(i) => i.burnPerDay > 0 && i.burnPerDay <= thresholdBurn
		)
		.sort(
			(a, b) =>
				a.burnPerDay - b.burnPerDay || b.priority - a.priority
		);

	for (const item of candidates) {
		guaranteed.add(item.ticker);
		const want = integer ? Math.ceil(item.need) : item.need;
		if (!(want > 0)) {
			selected.set(item.ticker, 0);
			continue;
		}
		const volLeft = volumeCapacity - usedVolume;
		const weightLeft = weightCapacity - usedWeight;
		const byVolume =
			item.volumePerUnit > 0
				? volLeft / item.volumePerUnit
				: Infinity;
		const byWeight =
			item.weightPerUnit > 0
				? weightLeft / item.weightPerUnit
				: Infinity;
		let qty = Math.min(want, byVolume, byWeight);
		if (integer) {
			qty = Math.floor(qty);
		}
		qty = Math.max(0, qty);
		selected.set(item.ticker, qty);
		usedVolume += qty * item.volumePerUnit;
		usedWeight += qty * item.weightPerUnit;
	}

	return { selected, usedVolume, usedWeight, guaranteed };
}

function solveMaxMinDays({
	items,
	volumeCapacity,
	weightCapacity,
	allowOverTarget,
}: {
	items: IBurnDemandItem[];
	volumeCapacity: number;
	weightCapacity: number;
	allowOverTarget: boolean;
}): number {
	const eligible = items.filter(
		(i) =>
			loadCap(i, allowOverTarget, volumeCapacity, weightCapacity) >
				0 && i.burnPerDay > 0
	);
	if (eligible.length === 0) {
		return 0;
	}

	const maxTargetDays = Math.max(...eligible.map((i) => i.targetDays));
	const constraints = new Map<string, Constraint>();
	constraints.set("zmax", lessEq(maxTargetDays));
	constraints.set("vol", lessEq(volumeCapacity));
	constraints.set("weight", lessEq(weightCapacity));

	const zVariable = new Map<string, number>([
		["obj", 1],
		["zmax", 1],
	]);
	const variables = new Map<string, Map<string, number>>([
		["z", zVariable],
	]);

	for (const item of items) {
		const v = varName(item.ticker);
		const cap = loadCap(
			item,
			allowOverTarget,
			volumeCapacity,
			weightCapacity
		);
		const capConstraintName = "cap_" + item.ticker;
		const variable = new Map<string, number>([
			["vol", item.volumePerUnit],
			["weight", item.weightPerUnit],
			[capConstraintName, 1],
		]);
		constraints.set(capConstraintName, lessEq(cap));

		if (eligible.includes(item)) {
			const daysConstraintName = "days_" + item.ticker;
			variable.set(daysConstraintName, 1 / item.burnPerDay);
			zVariable.set(daysConstraintName, -1);
			constraints.set(
				daysConstraintName,
				greaterEq(-item.currentStock / item.burnPerDay)
			);
		}
		variables.set(v, variable);
	}

	const model: Model = {
		direction: "maximize",
		objective: "obj",
		constraints,
		variables,
		integers: [],
	};

	const result = solve(model, { includeZeroVariables: true });
	if (result.status !== "optimal") {
		return 0;
	}

	const varMap = new Map(result.variables);
	return Math.max(0, varMap.get("z") ?? 0);
}

function solveWeighted({
	items,
	volumeCapacity,
	weightCapacity,
	integer,
	allowOverTarget,
	floors,
}: {
	items: IBurnDemandItem[];
	volumeCapacity: number;
	weightCapacity: number;
	integer: boolean;
	allowOverTarget: boolean;
	floors?: Map<string, number>;
}): Map<string, number> | null {
	const constraints = new Map<string, Constraint>();
	constraints.set("vol", lessEq(volumeCapacity));
	constraints.set("weight", lessEq(weightCapacity));

	const variables = new Map<string, Map<string, number>>();
	const integers: string[] = [];

	for (const item of items) {
		const v = varName(item.ticker);
		const cap = loadCap(
			item,
			allowOverTarget,
			volumeCapacity,
			weightCapacity
		);
		const capConstraintName = "cap_" + item.ticker;
		const variable = new Map<string, number>([
			["obj", item.priority / item.targetQuantity],
			["vol", item.volumePerUnit],
			["weight", item.weightPerUnit],
			[capConstraintName, 1],
		]);
		constraints.set(capConstraintName, lessEq(cap));

		const floor = floors?.get(item.ticker) ?? 0;
		if (floor > 0) {
			const floorConstraintName = "floor_" + item.ticker;
			variable.set(floorConstraintName, 1);
			constraints.set(
				floorConstraintName,
				greaterEq(Math.max(0, floor - EPSILON))
			);
		}
		variables.set(v, variable);
		if (integer) {
			integers.push(v);
		}
	}

	const model: Model = {
		direction: "maximize",
		objective: "obj",
		constraints,
		variables,
		integers,
	};

	const result = solve(model, { includeZeroVariables: true });
	if (result.status !== "optimal") {
		return null;
	}
	return readSolution(result, items);
}

function solveGreedy(
	items: IBurnDemandItem[],
	volumeCapacity: number,
	weightCapacity: number,
	integer: boolean,
	allowOverTarget: boolean,
	thresholdBurn: number
): Map<string, number> {
	const prefill = prefillGuaranteed(items, {
		volumeCapacity,
		weightCapacity,
		integer,
		thresholdBurn,
	});

	let volumeLeft = volumeCapacity - prefill.usedVolume;
	let weightLeft = weightCapacity - prefill.usedWeight;

	const remaining = items.filter(
		(i) => !prefill.guaranteed.has(i.ticker)
	);
	const maxBurn = Math.max(1, ...remaining.map((i) => i.burnPerDay));
	const scored = remaining
		.map((item) => ({
			item,
			score: item.priority + 0.5 * (item.burnPerDay / maxBurn),
		}))
		.sort((a, b) => b.score - a.score);

	const selected = new Map(prefill.selected);
	for (const { item } of scored) {
		const byVolume0 =
			item.volumePerUnit > 0
				? volumeLeft / item.volumePerUnit
				: Infinity;
		const byWeight0 =
			item.weightPerUnit > 0
				? weightLeft / item.weightPerUnit
				: Infinity;
		const cap = allowOverTarget
			? Math.max(
					item.need,
					Math.floor(Math.min(byVolume0, byWeight0))
				)
			: item.need;
		if (cap <= 0) {
			selected.set(item.ticker, 0);
			continue;
		}
		const byVolume =
			item.volumePerUnit > 0
				? volumeLeft / item.volumePerUnit
				: Infinity;
		const byWeight =
			item.weightPerUnit > 0
				? weightLeft / item.weightPerUnit
				: Infinity;
		let qty = Math.min(cap, byVolume, byWeight);
		if (integer) {
			qty = Math.floor(qty);
		}
		qty = Math.max(0, qty);
		selected.set(item.ticker, qty);
		volumeLeft -= qty * item.volumePerUnit;
		weightLeft -= qty * item.weightPerUnit;
	}

	return selected;
}

export function solveBurn(
	items: IBurnDemandItem[],
	options: IBurnSolveOptions
): Map<string, number> {
	const integer = options.integer ?? true;
	const allowOverTarget = options.allowOverTarget ?? false;
	const thresholdBurn = options.fullCoverBelowBurnPerDay ?? 1.0;

	if (items.length === 0) {
		return new Map();
	}

	const prefill = prefillGuaranteed(items, {
		volumeCapacity: options.volumeCapacity,
		weightCapacity: options.weightCapacity,
		integer,
		thresholdBurn,
	});

	const remaining = items.filter(
		(i) => !prefill.guaranteed.has(i.ticker)
	);
	const volumeCapacity = Math.max(
		0,
		options.volumeCapacity - prefill.usedVolume
	);
	const weightCapacity = Math.max(
		0,
		options.weightCapacity - prefill.usedWeight
	);

	const finalize = (selected: Map<string, number>): Map<string, number> => {
		const merged = new Map(prefill.selected);
		for (const [ticker, qty] of selected) {
			merged.set(ticker, qty);
		}
		return merged;
	};

	if (remaining.length === 0) {
		return finalize(new Map());
	}

	const base = {
		items: remaining,
		volumeCapacity,
		weightCapacity,
		integer,
		allowOverTarget,
	};

	const zDays = solveMaxMinDays(base);
	const floors = new Map<string, number>();
	for (const item of remaining) {
		if (
			loadCap(item, allowOverTarget, volumeCapacity, weightCapacity) >
			0
		) {
			const floorQty = Math.max(
				0,
				zDays * item.burnPerDay - item.currentStock
			);
			floors.set(
				item.ticker,
				integer ? Math.floor(floorQty) : floorQty
			);
		}
	}

	let stage2 = solveWeighted({ ...base, floors });
	if (!stage2) {
		stage2 = solveWeighted({ ...base });
	}
	if (!stage2) {
		return solveGreedy(
			items,
			options.volumeCapacity,
			options.weightCapacity,
			integer,
			allowOverTarget,
			thresholdBurn
		);
	}

	return finalize(stage2);
}

export { minDays };
