// Engine
import { calculatePlan } from "@/features/planning/engine/calculatePlan";
import {
	combineEmpireMaterialIO,
	empireStateOf,
} from "@/features/empire/util/empireMaterialIO.util";

// Util
import {
	createPlanContext,
	findEmpireCX,
	getCXs,
	getEmpirePlans,
	getEmpires,
} from "@/mcp/context";
import { getPlanet, loadGameData, preloadPlanets } from "@/mcp/gameData";

// Schemas
import { EmpireMaterialIOStateSchema } from "@/features/api/schemas/empireData.schemas";

// Types & Interfaces
import type { IBackend } from "@/mcp/backend";
import type { IMcpGameData } from "@/mcp/gameData";
import type { CX } from "@/features/api/schemas/cxData.schemas";
import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
import type { Plan } from "@/features/api/schemas/planningData.schemas";

/**
 * Every plan of an empire calculated in it (its faction and CX), as the
 * Empire page does, with the combined material i/o
 * @author jplacht
 */
export async function calculateEmpirePlans(
	b: IBackend,
	empire: PlanEmpireElement,
	cx: CX | undefined,
	plans: Plan[],
	gameData: IMcpGameData
) {
	await preloadPlanets(
		b,
		plans.map((p) => p.planet_natural_id)
	);
	const calculated = await Promise.all(
		plans.map(async (plan) => {
			const planet = await getPlanet(b, plan.planet_natural_id);
			const ctx = createPlanContext(gameData, planet, cx);
			const calc = calculatePlan(
				{ plan, empire, cxUuid: cx?.uuid, recipeOptions: false },
				ctx
			);
			return { plan, calc, prices: ctx.prices };
		})
	);
	const combined = combineEmpireMaterialIO(
		calculated.map(({ plan, calc }) => ({
			planetId: plan.planet_natural_id,
			planUuid: plan.uuid,
			planName: plan.plan_name,
			planCOGC: plan.plan_cogc,
			materialIO: calc.result.materialio,
		}))
	);
	return { calculated, combined };
}

const STALE_NOTE =
	"The empire figures behind the API exports couldn't be refreshed; they update when the empire is opened in PRUNplanner.";

/**
 * After a write that changes what empires produce, stores their state as
 * the Empire page does on opening (the API's empire exports and the
 * global material insights read it). A failure doesn't undo the write:
 * it comes back as a note
 * @author jplacht
 *
 * @param {IBackend} b Backend client
 * @param {Iterable<string | undefined>} empireUuids Empires to refresh
 * @returns {Promise<string | undefined>} A note when one failed
 */
export async function storeEmpireStates(
	b: IBackend,
	empireUuids: Iterable<string | undefined>
): Promise<string | undefined> {
	const uuids = [...new Set(empireUuids)].filter((u): u is string => !!u);
	if (!uuids.length) return undefined;
	let failed = false;
	const loaded = await Promise.all([
		getEmpires(b),
		getCXs(b),
		loadGameData(b),
	]).catch(() => undefined);
	if (!loaded) return STALE_NOTE;
	const [empires, cxs, gameData] = loaded;
	// one empire failing doesn't stop the others
	for (const uuid of uuids) {
		const empire = empires.find((e) => e.uuid === uuid);
		if (!empire) continue;
		try {
			const { combined } = await calculateEmpirePlans(
				b,
				empire,
				findEmpireCX(cxs, uuid),
				await getEmpirePlans(b, uuid),
				gameData
			);
			await b.send(
				"PATCH",
				`/planning/empire/${encodeURIComponent(uuid)}/state/`,
				empireStateOf(empire, combined),
				EmpireMaterialIOStateSchema
			);
		} catch {
			failed = true;
		}
	}
	return failed ? STALE_NOTE : undefined;
}
