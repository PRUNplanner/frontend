import { z } from "zod";
import { uuidArg } from "@/mcp/tools/shared";

// Engine
import { calculatePlan } from "@prunplanner/engine";
import { storageForDays } from "@/features/base_roi/baseROIRows";

// Util
import {
	createPlanContext,
	findEmpireCX,
	getCXs,
	getEmpires,
} from "@/mcp/context";
import { getPlanet } from "@/mcp/gameData";
import { ToolError } from "@/mcp/backend";
import { PriceBasisSchema, type PriceBasis } from "@/mcp/priceBasis";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";
import {
	applyPlanFields,
	autoExperts,
	dropUnavailableRecipes,
	expertsText,
	fitHabs,
	PlanFieldChangesSchema,
	type PlanFieldChanges,
} from "@/mcp/tools/planEdit";

// Schemas
import { PlanFactionSchema } from "@prunplanner/engine/schemas";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { IEmpireCX, IPlanSetup } from "@/mcp/context";
import type { IMcpGameData } from "@/mcp/gameData";
import type {
	CX,
	Planet,
	PlanEmpireElement,
} from "@prunplanner/engine/schemas";
import type {
	IPlanCalculation,
	IPlanContext,
	IPlanInput,
} from "@prunplanner/engine";

/** every change a variant can make to a saved plan */
export const VariantChangesSchema = PlanFieldChangesSchema.extend({
	planet_natural_id: z
		.string()
		.optional()
		.describe(
			"Move the plan to another planet, by id (OT-580b) or name (fees, fertility, resources there, and its active COGC program unless cogc is given); extraction recipes the planet can't run are dropped and listed"
		),
	switch_empire_uuid: uuidArg()
		.optional()
		.describe(
			"Calculate the variant side in another empire (its faction and CX); the before side stays in the plan's empire"
		),
	faction: PlanFactionSchema.optional().describe(
		"Calculate the variant with another faction bonus"
	),
	price_basis: PriceBasisSchema.optional(),
});
export type VariantChanges = z.infer<typeof VariantChangesSchema>;

export interface IVariant {
	plan: IPlanInput["plan"];
	input: IPlanInput;
	ctx: IPlanContext;
	calc: IPlanCalculation;
	planet: Planet;
	empire: PlanEmpireElement | undefined;
	cx: CX | undefined;
	basis: PriceBasis;
	notes: string[];
	/** the experts picked by experts "auto", as text */
	autoExperts?: string;
	/** what storage_days added, as text */
	storage?: string;
	/** an unsaved plan's empire and CX when picked by default, and why */
	pricing?: Pick<IEmpireCX, "note" | "choices">;
}

/** what calculateWithHabs sized beyond habs, as notes */
export const sizingNotes = (v: IVariant): string[] =>
	[
		v.autoExperts && `Experts (auto): ${v.autoExperts}.`,
		v.storage && `Storage: ${v.storage}.`,
	].filter((n): n is string => !!n);

/**
 * A saved plan with a variant's changes, calculated as the app would;
 * nothing is saved
 * @author jplacht
 *
 * @param {IBackend} b Backend client
 * @param {IPlanSetup} setup The saved plan, loaded
 * @param {VariantChanges} changes Changes
 * @returns {Promise<IVariant>} Variant
 */
export async function buildVariant(
	b: IBackend,
	setup: IPlanSetup,
	changes: VariantChanges
): Promise<IVariant> {
	const notes: string[] = [];
	const planet = changes.planet_natural_id
		? await getPlanet(b, changes.planet_natural_id)
		: setup.planet;

	let empire: PlanEmpireElement | undefined = setup.resolved.empire;
	let cx = setup.cx;
	if (changes.switch_empire_uuid) {
		const [empires, cxs] = await Promise.all([getEmpires(b), getCXs(b)]);
		empire = empires.find((e) => e.uuid === changes.switch_empire_uuid);
		if (!empire)
			throw new ToolError(
				`Unknown empire ${changes.switch_empire_uuid}.`
			);
		cx = findEmpireCX(cxs, empire.uuid);
	}
	if (changes.faction) {
		if (!empire)
			throw new ToolError(
				"You have no empire to calculate in; create one (save_empire) or pass switch_empire_uuid to set a faction."
			);
		empire = { ...empire, empire_faction: changes.faction };
	}

	let plan = applyPlanFields(setup.plan, changes, setup.gameData, planet);
	if (planet.planet_natural_id !== setup.planet.planet_natural_id) {
		// the program running there, as a new plan on that planet starts
		if (!changes.cogc) {
			const cogc = mapPlanetToPlanType(planet.active_cogc_program_type);
			if (cogc !== plan.plan_cogc)
				notes.push(
					`COGC set to ${planet.planet_natural_id}'s active program ${cogc} (was ${plan.plan_cogc}).`
				);
			plan = { ...plan, plan_cogc: cogc };
		}
		const moved = dropUnavailableRecipes(
			plan.plan_data,
			setup.gameData,
			planet
		);
		plan = { ...plan, plan_data: moved.data };
		if (moved.dropped.length)
			notes.push(
				`Not possible on ${planet.planet_natural_id}, dropped: ${moved.dropped.join(", ")}.`
			);
	}

	const basis = changes.price_basis ?? setup.basis;
	const v = calculateWithHabs(
		setup.gameData,
		plan,
		planet,
		empire,
		cx,
		basis,
		{
			habs: changes.habs,
			experts: changes.experts,
			storage_days: changes.storage_days,
			notes,
		}
	);
	notes.push(...sizingNotes(v));
	return v;
}

/**
 * A plan calculated in a context, with its habs sized when asked
 * @author jplacht
 */
export function calculateWithHabs(
	gameData: IMcpGameData,
	plan: IPlanInput["plan"],
	planet: Planet,
	empire: PlanEmpireElement | undefined,
	cx: CX | undefined,
	basis: PriceBasis,
	{
		habs,
		experts,
		storage_days,
		notes = [],
	}: Pick<PlanFieldChanges, "habs" | "experts" | "storage_days"> & {
		notes?: string[];
	} = {}
): IVariant {
	const ctx = createPlanContext(gameData, planet, cx, basis);
	const input = (p: IPlanInput["plan"]): IPlanInput => ({
		plan: p,
		empire,
		cxUuid: cx?.uuid,
		recipeOptions: false,
	});
	let calc = calculatePlan(input(plan), ctx);
	if (habs && habs !== "keep") {
		const fitted = fitHabs(plan.plan_data, calc, habs);
		if (fitted) {
			plan = { ...plan, plan_data: fitted };
			calc = calculatePlan(input(plan), ctx);
			notes.push(`Habs sized by the plan editor's optimiser (${habs}).`);
		} else
			notes.push(
				"Habs could not be sized (see area); kept as they were."
			);
	}
	// experts after habs: without workers nothing produces, no margin to weigh
	let auto: string | undefined;
	if (experts === "auto") {
		const bare = {
			...plan.plan_data,
			experts: plan.plan_data.experts.map((e) => ({ ...e, amount: 0 })),
		};
		const picked = autoExperts(
			calculatePlan(input({ ...plan, plan_data: bare }), ctx)
		);
		plan = { ...plan, plan_data: { ...plan.plan_data, experts: picked } };
		calc = calculatePlan(input(plan), ctx);
		auto = expertsText(picked);
	}
	// storage last: experts change the cargo
	let storage: string | undefined;
	if (storage_days) {
		const add = storageForDays(calc, storage_days);
		const added = (["STO", "STA"] as const).filter((t) => add[t] > 0);
		if (added.length) {
			const infrastructure = plan.plan_data.infrastructure.map((i) => ({
				...i,
			}));
			for (const t of added) {
				const entry = infrastructure.find((i) => i.building === t);
				if (entry) entry.amount += add[t];
				else infrastructure.push({ building: t, amount: add[t] });
			}
			plan = {
				...plan,
				plan_data: { ...plan.plan_data, infrastructure },
			};
			calc = calculatePlan(input(plan), ctx);
		}
		storage = added.length
			? `added ${added.map((t) => `${add[t]} ${t}`).join(", ")} to hold ${storage_days} days of cargo`
			: `already holds ${storage_days} days of cargo, nothing added`;
	}
	return {
		plan,
		input: input(plan),
		ctx,
		calc,
		planet,
		empire,
		cx,
		basis,
		notes,
		autoExperts: auto,
		storage,
	};
}
