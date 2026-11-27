import { z } from "zod";

// Engine
import {
	getBuildingRecipes,
	infrastructureBuildingNames,
	expertNames,
	MAX_EXPERTS_PER_TYPE,
	MAX_EXPERTS_TOTAL,
} from "@prunplanner/engine";
import {
	calculateAvailableArea,
	optimizeHabs,
	type HabSolverGoal,
} from "@/features/planning/calculations/habOptimization";

import {
	bestExpertSplit,
	expertTypeOf,
} from "@/features/production_chain/engine/chainSolver";

// Util
import { ToolError } from "@/mcp/backend";

// Schemas
import {
	ExpertTypeSchema,
	HabTypeSchema,
	InfrastructureTypeSchema,
	PlanCOGCProgramSchema,
	WorkforceTypeSchema,
} from "@prunplanner/engine/schemas";

// Types & Interfaces
import type { IMcpGameData } from "@/mcp/gameData";
import type { IPlanCalculation, IPlanInput } from "@prunplanner/engine";
import type {
	Planet,
	ExpertType,
	InfrastructureType,
	PlanData,
} from "@prunplanner/engine/schemas";

export const BuildingChangeSchema = z.object({
	ticker: z
		.string()
		.describe("Building ticker; habs (HB1…HBL) and storage (STO…) too"),
	amount: z.number().int().min(0).describe("Total amount; 0 removes it"),
	recipe_id: z
		.string()
		.optional()
		.describe("Recipe to add; see buildings[] in the server instructions"),
	recipe_amount: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe("recipe_id's share of the runs (default 1; 0 removes it)"),
	recipes: z
		.array(
			z.object({
				recipe_id: z.string(),
				amount: z.number().int().min(1).default(1),
			})
		)
		.optional()
		.describe("Replaces all its recipes, with shares ([] idles it)"),
});
export type BuildingChange = z.infer<typeof BuildingChangeSchema>;

/**
 * Plan data without buildings, as a new plan in the app starts: no
 * experts, every luxury on
 * @author jplacht
 */
export function emptyPlanData(): PlanData {
	return {
		experts: ExpertTypeSchema.options.map((type) => ({ type, amount: 0 })),
		workforce: WorkforceTypeSchema.options.map((type) => ({
			type,
			lux1: true,
			lux2: true,
		})),
		infrastructure: InfrastructureTypeSchema.options.map((building) => ({
			building,
			amount: 0,
		})),
		buildings: [],
	};
}

/**
 * The plan data with building changes applied, on a copy. Habs and
 * storage are infrastructure; recipes must exist for the building on the
 * plan's planet (extraction only with a matching resource).
 * @author jplacht
 *
 * @param {PlanData} data Plan data
 * @param {BuildingChange[]} changes Building changes
 * @param {IMcpGameData} gameData Game data
 * @param {Planet} planet Plan's planet, for extraction recipes
 * @returns {PlanData} Changed copy
 */
export function applyBuildings(
	data: PlanData,
	changes: BuildingChange[],
	gameData: IMcpGameData,
	planet: Planet
): PlanData {
	const next: PlanData = structuredClone(data);
	// one building listed twice with different amounts: the last would win
	// silently and its recipes split evenly; the recipes field is the way
	const amounts = new Map<string, number>();
	for (const change of changes) {
		const ticker = change.ticker.toUpperCase();
		const seen = amounts.get(ticker);
		if (seen !== undefined && seen !== change.amount)
			throw new ToolError(
				`${ticker} is listed twice with amounts ${seen} and ${change.amount}. List it once with the total amount and its recipes with their shares: {"ticker":"${ticker}","amount":<total>,"recipes":[{"recipe_id":"…","amount":4},{"recipe_id":"…","amount":1}]}.`
			);
		amounts.set(ticker, change.amount);
	}
	for (const change of changes) {
		const ticker = change.ticker.toUpperCase();
		if (!gameData.buildings.has(ticker))
			throw new ToolError(`Unknown building ${change.ticker}.`);
		if (ticker === "CM")
			throw new ToolError(
				"The core module is part of every plan; it can't be changed."
			);
		// habs and storage are the plan's infrastructure, not production
		if (infrastructureBuildingNames.includes(ticker)) {
			const building = ticker as InfrastructureType;
			next.infrastructure = next.infrastructure.filter(
				(i) => i.building !== building
			);
			if (change.amount > 0)
				next.infrastructure.push({ building, amount: change.amount });
			continue;
		}
		if (change.amount === 0) {
			next.buildings = next.buildings.filter((b) => b.name !== ticker);
			continue;
		}
		let building = next.buildings.find((b) => b.name === ticker);
		if (!building) {
			building = {
				name: ticker,
				amount: change.amount,
				active_recipes: [],
			};
			next.buildings.push(building);
		}
		building.amount = change.amount;

		const recipes = getBuildingRecipes(
			gameData.recipesByBuilding,
			ticker,
			planet.resources
		);
		const check = (id: string) => {
			if (!recipes.some((r) => r.recipe_id === id))
				throw new ToolError(
					`${ticker} has no recipe ${id} on ${planet.planet_natural_id}. Recipes there: ${recipes.map((r) => r.recipe_id).join(", ") || "none"}.`
				);
		};
		if (change.recipes) {
			change.recipes.forEach((r) => check(r.recipe_id));
			building.active_recipes = change.recipes.map((r) => ({
				recipeid: r.recipe_id,
				amount: r.amount,
			}));
		}
		if (!change.recipe_id) continue;
		check(change.recipe_id);
		const active = building.active_recipes.find(
			(r) => r.recipeid === change.recipe_id
		);
		if (change.recipe_amount === 0)
			building.active_recipes = building.active_recipes.filter(
				(r) => r !== active
			);
		else if (active) active.amount = change.recipe_amount ?? active.amount;
		else
			building.active_recipes.push({
				recipeid: change.recipe_id,
				amount: change.recipe_amount ?? 1,
			});
	}
	return next;
}

export const HabsModeSchema = z
	.enum(["keep", "add", "auto", "cheapest", "least_area"])
	.describe(
		'Habitation: "keep"; "add" keeps habs, adds for missing workers; or optimise anew: "auto", "cheapest", "least_area"'
	);
export type HabsMode = z.infer<typeof HabsModeSchema>;

const HAB_GOAL: Record<Exclude<HabsMode, "keep">, HabSolverGoal> = {
	add: "auto",
	auto: "auto",
	cheapest: "cost",
	least_area: "area",
};

/**
 * The plan data with its habs sized by the plan editor's optimiser for a
 * calculation's workforce, storage kept; undefined when it finds none
 * @author jplacht
 *
 * @param {PlanData} data Plan data
 * @param {IPlanCalculation} calc Calculation of that plan data
 * @param {HabsMode} mode Optimiser goal
 * @returns {PlanData | undefined} Plan data with sized habs
 */
export function fitHabs(
	data: PlanData,
	calc: IPlanCalculation,
	mode: Exclude<HabsMode, "keep">
): PlanData | undefined {
	const { area, infrastructure, infrastructureCosts, workforce } =
		calc.result;
	// "add": house only the workers without beds, in the area left, on top
	// of the habs there (already built habs aren't torn down)
	const add = mode === "add";
	const need = add
		? (Object.fromEntries(
				Object.entries(workforce).map(([type, w]) => [
					type,
					{ ...w, required: Math.max(0, -w.left) },
				])
			) as typeof workforce)
		: workforce;
	if (add && Object.values(need).every((w) => w.required === 0)) return data;
	const solution = optimizeHabs(
		HAB_GOAL[mode],
		infrastructureCosts,
		need,
		add
			? area.areaLeft
			: calculateAvailableArea(
					area.areaTotal,
					area.areaUsed,
					infrastructure
				)
	);
	if (solution.status !== "optimal") return undefined;
	const habs = new Map(solution.variables);
	const isHab = (b: string) => HabTypeSchema.options.includes(b as never);
	const there = (b: string) =>
		add
			? (data.infrastructure.find((i) => i.building === b)?.amount ?? 0)
			: 0;
	return {
		...data,
		infrastructure: [
			...data.infrastructure.filter((i) => !isHab(i.building)),
			...HabTypeSchema.options.map((building) => ({
				building,
				amount: there(building) + (habs.get(building) ?? 0),
			})),
		],
	};
}

/**
 * The expert split worth most for a plan's buildings, with Production
 * Chains' bestExpertSplit: weighted by what experts scale, each
 * expertise's daily output − inputs − production fee (workforce and
 * degradation don't scale), by building count when nothing earns
 * @author jplacht
 *
 * @param {IPlanCalculation} calc The plan calculated without experts
 * @returns {PlanData["experts"]} Experts per type
 */
export function autoExperts(calc: IPlanCalculation): PlanData["experts"] {
	const value: Partial<Record<ExpertType, number>> = {};
	const load: Partial<Record<ExpertType, number>> = {};
	for (const b of calc.result.production.buildings) {
		const type = expertTypeOf(b.expertise);
		if (!type) continue;
		// dailyRevenue nets out workforce and degradation (stored negative)
		const scaled =
			b.dailyRevenue -
			b.workforceDailyCost * b.amount -
			(b.constructionCost * b.amount) / 180;
		value[type] = (value[type] ?? 0) + (Math.max(scaled, 0) || 0);
		load[type] = (load[type] ?? 0) + b.amount;
	}
	const priced = Object.values(value).some((v) => v > 0);
	const split = bestExpertSplit(priced ? value : load);
	return expertNames.map((type) => ({ type, amount: split[type] }));
}

/** a plan's experts as text, e.g. "5 Manufacturing, 1 Chemistry" */
export const expertsText = (experts: PlanData["experts"]): string =>
	experts
		.filter((e) => e.amount > 0)
		.toSorted((a, b) => b.amount - a.amount)
		.map((e) => `${e.amount} ${e.type.replaceAll("_", " ")}`)
		.join(", ") || "none";

/** plan-level changes shared by the variant tools */
export const PlanFieldChangesSchema = z.object({
	buildings: z.array(BuildingChangeSchema).optional(),
	cogc: PlanCOGCProgramSchema.optional().describe("COGC program"),
	corphq: z.boolean().optional().describe("Corporation HQ on the planet"),
	permits: z.number().int().min(1).max(3).optional(),
	experts: z
		.union(
			[
				z.literal("auto"),
				z.array(
					z.object({
						type: ExpertTypeSchema,
						amount: z
							.number()
							.int()
							.min(0)
							.max(MAX_EXPERTS_PER_TYPE),
					})
				),
			],
			// the union's own message ("Invalid input") doesn't say what fits
			`experts takes the plain string "auto" or a list like [{"type":"Chemistry","amount":2}], 0–${MAX_EXPERTS_PER_TYPE} per type`
		)
		.optional()
		.describe(
			`Experts to set (others stay; at most ${MAX_EXPERTS_PER_TYPE} per type, ${MAX_EXPERTS_TOTAL} per base), or "auto": the split worth most for the buildings`
		),
	luxuries: z
		.array(
			z.object({
				type: WorkforceTypeSchema,
				lux1: z.boolean().optional(),
				lux2: z.boolean().optional(),
			})
		)
		.optional()
		.describe("Workforce luxuries to switch on or off"),
	habs: HabsModeSchema.optional(),
	storage_days: z
		.number()
		.min(0.5)
		.max(30)
		.optional()
		.describe("Days of cargo to store; see the server instructions"),
});
export type PlanFieldChanges = z.infer<typeof PlanFieldChangesSchema>;

/**
 * A plan's fields with the changes applied, on a copy (habs not fitted)
 * @author jplacht
 */
export function applyPlanFields(
	plan: IPlanInput["plan"],
	changes: PlanFieldChanges,
	gameData: IMcpGameData,
	planet: Planet
): IPlanInput["plan"] {
	const data = applyBuildings(
		plan.plan_data,
		changes.buildings ?? [],
		gameData,
		planet
	);
	if (Array.isArray(changes.experts)) {
		for (const e of changes.experts) {
			const entry = data.experts.find((x) => x.type === e.type);
			if (entry) entry.amount = e.amount;
			else data.experts.push({ type: e.type, amount: e.amount });
		}
		const total = data.experts.reduce((n, e) => n + e.amount, 0);
		if (total > MAX_EXPERTS_TOTAL)
			throw new ToolError(
				`${total} experts (${expertsText(data.experts)}): a base takes at most ${MAX_EXPERTS_TOTAL}, ${MAX_EXPERTS_PER_TYPE} per type. Set others to 0 or pass experts "auto".`
			);
	}
	for (const l of changes.luxuries ?? []) {
		const entry = data.workforce.find((w) => w.type === l.type);
		if (!entry) continue;
		entry.lux1 = l.lux1 ?? entry.lux1;
		entry.lux2 = l.lux2 ?? entry.lux2;
	}
	return {
		plan_data: data,
		plan_cogc: changes.cogc ?? plan.plan_cogc,
		plan_corphq: changes.corphq ?? plan.plan_corphq,
		plan_permits_used: changes.permits ?? plan.plan_permits_used,
	};
}

/**
 * Recipes the planet can't run (extraction without the resource) taken
 * out, for a plan moved to another planet
 * @author jplacht
 *
 * @returns The plan data and the dropped recipe ids
 */
export function dropUnavailableRecipes(
	data: PlanData,
	gameData: IMcpGameData,
	planet: Planet
): { data: PlanData; dropped: string[] } {
	const dropped: string[] = [];
	const next = structuredClone(data);
	for (const b of next.buildings) {
		const ids = new Set(
			getBuildingRecipes(
				gameData.recipesByBuilding,
				b.name,
				planet.resources
			).map((r) => r.recipe_id)
		);
		b.active_recipes = b.active_recipes.filter((r) => {
			if (ids.has(r.recipeid)) return true;
			dropped.push(`${b.name}: ${r.recipeid}`);
			return false;
		});
	}
	return { data: next, dropped };
}
