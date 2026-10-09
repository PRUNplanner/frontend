import { useQuery } from "@/lib/query_cache/useQuery";

import { usePlanningStore } from "@/stores/planningStore";

// Types & Interfaces
import type {
	Plan,
	PlanCOGCProgram,
	PlanCreateData,
	PlanSaveCreateResponse,
} from "@/features/api/schemas/planningData.schemas";
import { PlanCOGCProgramSchema } from "@/features/api/schemas/planningData.schemas";
import type {
	IPlanDefinition,
	IPlanSaved,
	IPlanSaveResult,
} from "@/features/planning_data/usePlan.types";
import { getSaveError } from "@/features/save_conflict/saveConflict.util";
import type { PlanetCOGCProgramType } from "@/features/api/schemas/gameData.schemas";

const cogcValues: readonly string[] = PlanCOGCProgramSchema.options;

export const cogcTextMapping: Record<PlanCOGCProgram, string> = {
	"---": "game.cogc_program_short.NONE",
	AGRICULTURE: "game.cogc_program_short.ADVERTISING_AGRICULTURE",
	CHEMISTRY: "game.cogc_program_short.ADVERTISING_CHEMISTRY",
	CONSTRUCTION: "game.cogc_program_short.ADVERTISING_CONSTRUCTION",
	ELECTRONICS: "game.cogc_program_short.ADVERTISING_ELECTRONICS",
	FOOD_INDUSTRIES: "game.cogc_program_short.ADVERTISING_FOOD_INDUSTRIES",
	FUEL_REFINING: "game.cogc_program_short.ADVERTISING_FUEL_REFINING",
	MANUFACTURING: "game.cogc_program_short.ADVERTISING_MANUFACTURING",
	METALLURGY: "game.cogc_program_short.ADVERTISING_METALLURGY",
	RESOURCE_EXTRACTION:
		"game.cogc_program_short.ADVERTISING_RESOURCE_EXTRACTION",
	PIONEERS: "game.cogc_program_short.WORKFORCE_PIONEERS",
	SETTLERS: "game.cogc_program_short.WORKFORCE_SETTLERS",
	TECHNICIANS: "game.cogc_program_short.WORKFORCE_TECHNICIANS",
	ENGINEERS: "game.cogc_program_short.WORKFORCE_ENGINEERS",
	SCIENTISTS: "game.cogc_program_short.WORKFORCE_SCIENTISTS",
};

export function usePlan() {
	const planningStore = usePlanningStore();

	/**
	 * Maps planets COGC Program Type to Plans COGC Program Type
	 *
	 * @author jplacht
	 *
	 * @param {(PlanetCOGCProgramType | null | undefined)} input Planet COGC Type
	 * @returns {PlanCOGCProgram} Plan COGC Type
	 */
	function mapPlanetToPlanType(
		input: PlanetCOGCProgramType | null | undefined
	): PlanCOGCProgram {
		if (!input) return "---";
		const parts = input.split("_");
		const identifiedType = parts.slice(1).join("_").toUpperCase();

		// value could be invalid or on strike, check to ensure we got a proper cogc
		if (!cogcValues.includes(identifiedType)) return "---";
		else return identifiedType as PlanCOGCProgram;
	}

	/**
	 * Generates a new plan definition from Planet Natural Id
	 *
	 * @author jplacht
	 *
	 * @param {string} planetNaturalId Planet Natural Id (e.g. 'OT-580b')
	 * @param {(PlanetCOGCProgramType | null)} cogc Planet COGC
	 * @returns {IPlanDefinition} Blank plan definition
	 */
	function createBlankDefinition(
		planetNaturalId: string,
		cogc: PlanetCOGCProgramType | null
	): IPlanDefinition {
		return {
			plan_name: undefined,
			uuid: undefined,
			planet_natural_id: planetNaturalId,
			plan_permits_used: 1,
			plan_corphq: false,
			plan_cogc: mapPlanetToPlanType(cogc),
			plan_data: {
				experts: [
					{
						type: "Agriculture",
						amount: 0,
					},
					{
						type: "Chemistry",
						amount: 0,
					},
					{
						type: "Construction",
						amount: 0,
					},
					{
						type: "Electronics",
						amount: 0,
					},
					{
						type: "Food_Industries",
						amount: 0,
					},
					{
						type: "Fuel_Refining",
						amount: 0,
					},
					{
						type: "Manufacturing",
						amount: 0,
					},
					{
						type: "Metallurgy",
						amount: 0,
					},
					{
						type: "Resource_Extraction",
						amount: 0,
					},
				],
				workforce: [
					{
						type: "pioneer",
						lux1: true,
						lux2: true,
					},
					{
						type: "settler",
						lux1: true,
						lux2: true,
					},
					{
						type: "technician",
						lux1: true,
						lux2: true,
					},
					{
						type: "engineer",
						lux1: true,
						lux2: true,
					},
					{
						type: "scientist",
						lux1: true,
						lux2: true,
					},
				],
				infrastructure: [],
				buildings: [],
			},
			empires: [],
		};
	}

	/**
	 * Creates a new plan and returns the new plans Uuid on a
	 * successful save operation in the backend
	 * @author jplacht
	 *
	 * @async
	 * @param {PlanCreateData} data Plan Data
	 * @returns {Promise<IPlanSaved | undefined>} Plan Uuid and version
	 */
	async function createNewPlan(
		data: PlanCreateData
	): Promise<IPlanSaved | undefined> {
		try {
			const createdData: PlanSaveCreateResponse = await useQuery(
				"CreatePlan",
				{ data: data }
			).execute();

			// trigger backend data load
			await useQuery("GetPlan", {
				planUuid: createdData.uuid,
			}).execute();
			return {
				uuid: createdData.uuid,
				modifiedAt: createdData.modified_at,
			};
		} catch (err) {
			console.error(`Error creating plan: ${err}`);
			return undefined;
		}
	}

	/**
	 * Updates an existing plan in the backend api. With a base version
	 * the save fails as a conflict if it was saved elsewhere since.
	 * @author jplacht
	 *
	 * @async
	 * @param {string} planUuid Plan Uuid
	 * @param {PlanCreateData} data Plan Data
	 * @param {string} [baseModifiedAt] Version the edit started from
	 * @returns {Promise<IPlanSaveResult>} Uuid and new version, or the error
	 */
	async function saveExistingPlan(
		planUuid: string,
		data: PlanCreateData,
		baseModifiedAt?: string
	): Promise<IPlanSaveResult> {
		try {
			const savedData: PlanSaveCreateResponse = await useQuery(
				"PatchPlan",
				{
					planUuid: planUuid,
					data: {
						uuid: planUuid,
						...data,
						base_modified_at: baseModifiedAt,
					},
				}
			).execute();

			await useQuery("GetPlan", {
				planUuid: savedData.uuid,
			}).execute();
			return { uuid: savedData.uuid, modifiedAt: savedData.modified_at };
		} catch (err) {
			console.error(`Error updating plan: ${err}`);
			return { error: getSaveError(err) ?? "failed" };
		}
	}

	/**
	 * Reloading an existing plan is fetching the plan data from
	 * planning store again. The planning view won't persist changes
	 * to the stores data itself.
	 * @author jplacht
	 *
	 * @async
	 * @param {string} planUuid Plan Uuid
	 * @returns {Promise<Plan>} Plan Data
	 */
	async function reloadExistingPlan(planUuid: string): Promise<Plan> {
		return await planningStore.getPlan(planUuid);
	}

	/**
	 * Gets a plans name and planet natural id by given Plan UUID
	 * from already loaded plan information
	 * @author jplacht
	 *
	 * @param {string} planUuid Plan Uuid
	 * @returns {{
	 * 			planetId: string;
	 * 			planName: string;
	 * 		}} Planet Natural ID and Plan Name
	 */
	function getPlanNamePlanet(planUuid: string): {
		planetId: string;
		planName: string;
	} {
		const findPlan = planningStore.plans[planUuid];

		if (findPlan)
			return {
				planetId: findPlan.planet_natural_id,
				planName: findPlan.plan_name ?? "Unnamed",
			};

		throw new Error(
			`No data: Plan '${planUuid}'. Ensure Plan uuid is valid and planning data has been loaded.`
		);
	}

	return {
		mapPlanetToPlanType,
		createBlankDefinition,
		createNewPlan,
		saveExistingPlan,
		reloadExistingPlan,
		getPlanNamePlanet,
	};
}
