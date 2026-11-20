// Engine
import { basisBook, type PriceBasis } from "@/mcp/priceBasis";
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import { getPlanet, loadGameData } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { planEmpireUuid } from "@/features/empire/util/planEmpire.util";

// Schemas
import {
	CXEmpireJunctionListSchema,
	CXListSchema,
} from "@/features/api/schemas/cxData.schemas";
import { PlanEmpireElementListSchema } from "@/features/api/schemas/empireData.schemas";
import {
	PlanListSchema,
	PlanSchema,
} from "@/features/api/schemas/planningData.schemas";
import { UserPreferenceSchema } from "@/features/api/schemas/user.schemas";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { IMcpGameData } from "@/mcp/gameData";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";
import type {
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@/features/planning/engine/engine.types";
import type { Planet } from "@/features/api/schemas/gameData.schemas";

export const getEmpires = (b: IBackend): Promise<PlanEmpireElement[]> =>
	b.get("/planning/empire/", PlanEmpireElementListSchema);
export const getCXs = (b: IBackend): Promise<CX[]> =>
	b.get("/planning/cx/", CXListSchema);
export const getPlans = (b: IBackend): Promise<Plan[]> =>
	b.get("/planning/plan/", PlanListSchema);
export const getPlan = (b: IBackend, uuid: string): Promise<Plan> =>
	b.get(`/planning/plan/${encodeURIComponent(uuid)}/`, PlanSchema);
export const getEmpirePlans = (b: IBackend, uuid: string): Promise<Plan[]> =>
	b.get(
		`/planning/empire/${encodeURIComponent(uuid)}/plans/`,
		PlanListSchema
	);

/**
 * The CX an empire uses, as useCXData.findEmpireCXUuid
 * @author jplacht
 */
export function findEmpireCX(
	cxs: CX[],
	empireUuid: string | undefined
): CX | undefined {
	if (!empireUuid) return undefined;
	return cxs.find((c) => c.empires.some((e) => e.uuid === empireUuid));
}

/** a CX preference as the read tools show it: its uuid for the write tools */
export const cxRef = (cx: CX | undefined) =>
	cx ? { uuid: cx.uuid, name: cx.cx_name } : null;

/** pricing for a tool without a saved plan, and how it was picked */
export interface IEmpireCX {
	empire?: PlanEmpireElement;
	cx?: CX;
	/** what was used and why, for the user; undefined when empire_uuid was given */
	note?: string;
	/** the user's empires, when none could be picked: ask which one */
	choices?: {
		empire_uuid: string;
		name: string;
		cx_preference: string | null;
	}[];
}

/**
 * The empire (faction) and CX preference a tool without a saved plan
 * prices with: the requested empire, else the user's default empire (the
 * app's), else their only empire, else their only CX preference (no
 * faction), else none (Universe VWAP 30D) with the empires to choose from
 * @author jplacht
 *
 * @param {IBackend} b Backend client
 * @param {string} [empireUuid] Requested empire
 * @returns {Promise<IEmpireCX>} Empire, CX and the note saying what was used
 */
export async function loadEmpireCX(
	b: IBackend,
	empireUuid: string | undefined
): Promise<IEmpireCX> {
	const [empires, cxs] = await Promise.all([getEmpires(b), getCXs(b)]);
	const withCX = (empire: PlanEmpireElement) => ({
		empire,
		cx: findEmpireCX(cxs, empire.uuid),
	});
	const named = ({ empire, cx }: ReturnType<typeof withCX>) =>
		`"${empire.empire_name}" (${empire.empire_faction}${cx ? `, CX preference "${cx.cx_name}"` : ", no CX preference: Universe VWAP 30D"})`;
	const other = "Pass empire_uuid to price in another empire.";
	if (empireUuid) {
		const empire = empires.find((e) => e.uuid === empireUuid);
		if (!empire) throw new ToolError(`Unknown empire ${empireUuid}.`);
		return withCX(empire);
	}
	// unreadable preferences only lose the default
	const defaultEmpire = await getDefaultEmpireUuid(b);
	const preferred = empires.find((e) => e.uuid === defaultEmpire);
	if (preferred) {
		const picked = withCX(preferred);
		return {
			...picked,
			note: `Calculated in your default empire ${named(picked)}. ${other}`,
		};
	}
	if (empires.length === 1) {
		const picked = withCX(empires[0]);
		return {
			...picked,
			note: `Calculated in your only empire ${named(picked)}. ${other}`,
		};
	}
	if (cxs.length === 1)
		return {
			cx: cxs[0],
			note: `Priced in your only CX preference "${cxs[0].cx_name}", without an empire (no faction bonus). Pass empire_uuid to calculate in an empire.`,
		};
	return {
		note: empires.length
			? `No default empire and ${empires.length} empires: priced at Universe VWAP 30D without a faction bonus. Ask the user which empire to price in and pass its empire_uuid.`
			: "No empire: priced at Universe VWAP 30D without a faction bonus.",
		choices: empires.length
			? empires.map((e) => ({
					empire_uuid: e.uuid,
					name: e.empire_name,
					cx_preference: findEmpireCX(cxs, e.uuid)?.cx_name ?? null,
				}))
			: undefined,
	};
}

/** the empire a plan is calculated in, and why */
export interface IResolvedEmpire {
	empire: PlanEmpireElement | undefined;
	note?: string;
}

/** the user's default empire uuid; unreadable preferences have none */
export const getDefaultEmpireUuid = (
	b: IBackend
): Promise<string | undefined> =>
	b
		.get("/user/preferences/", UserPreferenceSchema)
		.then((p) => p.defaultEmpireUuid)
		.catch(() => undefined);

/**
 * The empire a plan is calculated in: the requested one, else the one its
 * plan page opens with (planEmpireUuid: the default empire if the plan is
 * in it, else its first; a plan in no empire: the user's first empire)
 * @author jplacht
 */
export function resolveEmpire(
	plan: Plan,
	empires: PlanEmpireElement[],
	empireUuid: string | undefined,
	defaultEmpireUuid?: string
): IResolvedEmpire {
	if (empireUuid) {
		const empire = empires.find((e) => e.uuid === empireUuid);
		if (!empire) throw new ToolError(`Unknown empire ${empireUuid}.`);
		return { empire };
	}
	const planEmpires = plan.empires ?? [];
	if (!planEmpires.length) {
		const first = empires[0];
		return first
			? {
					empire: first,
					note: `The plan is in no empire; calculated in your first empire "${first.empire_name}", as its plan page opens it. Pass empire_uuid for another.`,
				}
			: {
					empire: undefined,
					note: "The plan is in no empire and you have none: no faction bonus, Universe VWAP 30D prices.",
				};
	}
	const uuid = planEmpireUuid(
		plan.uuid,
		planEmpires,
		empires,
		defaultEmpireUuid
	);
	const empire = empires.find((e) => e.uuid === uuid);
	if (!empire)
		return {
			empire: undefined,
			note: "The plan's empire couldn't be loaded: no faction bonus, Universe VWAP 30D prices.",
		};
	return {
		empire,
		note:
			planEmpires.length > 1
				? `The plan is in ${planEmpires.length} empires; calculated in "${empire.empire_name}", as its plan page opens it (your default empire if the plan is in it, else its first). Pass empire_uuid for another.`
				: undefined,
	};
}

/**
 * The engine context for a plan, the Node counterpart of
 * usePlanContext().createContext
 * @author jplacht
 *
 * @param {IMcpGameData} gameData Game data
 * @param {Planet} planet Plan's planet
 * @param {CX | undefined} cx The empire's CX, undefined for Universe prices
 * @returns {IPlanContext} Context
 */
export function createPlanContext(
	gameData: IMcpGameData,
	planet: Planet,
	cx: CX | undefined,
	basis: PriceBasis = "plan"
): IPlanContext {
	return {
		buildings: gameData.buildings,
		recipesByBuilding: gameData.recipesByBuilding,
		materials: gameData.materials,
		planet,
		prices: basisBook(basis, cx, planet.planet_natural_id, gameData),
	};
}

/** everything one plan's calculation needs, loaded */
export interface IPlanSetup {
	plan: Plan;
	planet: Planet;
	gameData: IMcpGameData;
	resolved: IResolvedEmpire;
	cx: CX | undefined;
	basis: PriceBasis;
	input: IPlanInput;
	ctx: IPlanContext;
}

/**
 * Loads a plan with its empire, CX, planet and game data
 * @author jplacht
 */
export async function loadPlanSetup(
	b: IBackend,
	planUuid: string,
	empireUuid: string | undefined,
	basis: PriceBasis = "plan"
): Promise<IPlanSetup> {
	const [plan, empires, cxs, gameData, defaultEmpire] = await Promise.all([
		getPlan(b, planUuid),
		getEmpires(b),
		getCXs(b),
		loadGameData(b),
		empireUuid ? undefined : getDefaultEmpireUuid(b),
	]);
	const planet = await getPlanet(b, plan.planet_natural_id);
	const resolved = resolveEmpire(plan, empires, empireUuid, defaultEmpire);
	return planSetup(
		plan,
		planet,
		gameData,
		resolved,
		findEmpireCX(cxs, resolved.empire?.uuid),
		basis
	);
}

/**
 * A plan's setup from data already loaded
 * @author jplacht
 */
export function planSetup(
	plan: Plan,
	planet: Planet,
	gameData: IMcpGameData,
	resolved: IResolvedEmpire,
	cx: CX | undefined,
	basis: PriceBasis = "plan"
): IPlanSetup {
	return {
		plan,
		planet,
		gameData,
		resolved,
		cx,
		input: {
			plan,
			empire: resolved.empire,
			cxUuid: cx?.uuid,
			recipeOptions: false,
		},
		basis,
		ctx: createPlanContext(gameData, planet, cx, basis),
	};
}

/**
 * The plan's calculation, as on its plan page
 * @author jplacht
 */
export function calculate(setup: IPlanSetup): IPlanCalculation {
	return calculatePlan(setup.input, setup.ctx);
}

/**
 * Changes which CX preference empires use. The backend's junction sync
 * clears every empire it isn't sent, so the full map goes out: the
 * current one with `changes` (empire uuid -> CX uuid, undefined for none)
 * @author jplacht
 *
 * @returns {Promise<CX[]>} The CX preferences after the change
 */
export async function assignCX(
	b: IBackend,
	cxs: CX[],
	changes: Map<string, string | undefined>
): Promise<CX[]> {
	const byEmpire = new Map<string, string | undefined>();
	for (const cx of cxs)
		for (const e of cx.empires) byEmpire.set(e.uuid, cx.uuid);
	for (const [empire, cx] of changes) byEmpire.set(empire, cx);
	return b.send(
		"POST",
		"/planning/cx/junctions/",
		cxs.map((cx) => ({
			cx_uuid: cx.uuid,
			empires: [...byEmpire]
				.filter(([, c]) => c === cx.uuid)
				.map(([empire_uuid]) => ({ empire_uuid })),
		})),
		CXEmpireJunctionListSchema,
		CXListSchema
	);
}
