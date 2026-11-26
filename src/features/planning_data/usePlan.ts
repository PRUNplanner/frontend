import { useQuery } from "@/lib/query_cache/useQuery";

import { usePlanningStore } from "@/stores/planningStore";

// Types & Interfaces
import type {
	Plan,
	PlanCreateData,
	PlanSaveCreateResponse,
	PlanetCOGCProgramType,
} from "@prunplanner/engine/schemas";
import type {
	IPlanDefinition,
	IPlanSaved,
	IPlanSaveResult,
	IPlanSaveVersion,
} from "@/features/planning_data/usePlan.types";
import { getSaveError } from "@/features/save_conflict/saveConflict.util";
import { mapPlanetToPlanType } from "@/features/planning_data/planCOGC.util";
import { apiFieldMessage, isApiError } from "@/lib/apiError";
import { reportError } from "@/lib/analytics/useAnalytics";

// moved to the pure planCOGC.util (the MCP server uses it), kept here for its importers
export { cogcTextMapping } from "@/features/planning_data/planCOGC.util";

export function usePlan() {
	const planningStore = usePlanningStore();

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
			reportError(err);
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
	 * @param {IPlanSaveVersion} [version] Name, restore and seen draft of the
	 * version the save creates
	 * @returns {Promise<IPlanSaveResult>} Uuid and new version, or the error
	 */
	async function saveExistingPlan(
		planUuid: string,
		data: PlanCreateData,
		baseModifiedAt?: string,
		version: IPlanSaveVersion = {}
	): Promise<IPlanSaveResult> {
		try {
			// the answer seeds the plan's GetPlan entry, no fetch after it
			const savedData: Plan = await useQuery("PatchPlan", {
				planUuid: planUuid,
				data: {
					uuid: planUuid,
					...data,
					...version,
					base_modified_at: baseModifiedAt,
				},
			}).execute();
			return { uuid: savedData.uuid, modifiedAt: savedData.modified_at };
		} catch (err) {
			// the restored version was pruned meanwhile
			if (
				isApiError(err) &&
				err.status === 400 &&
				version.restored_from &&
				(err.responseData as Record<string, unknown> | undefined)
					?.restored_from !== undefined
			)
				return { error: "restored_from" };
			// the plan has the most named versions: the user's to resolve
			const capMessage = apiFieldMessage(err, "version_name");
			if (capMessage)
				return { error: "version_cap", message: capMessage };
			reportError(err);
			// timeout or dropped connection: the backend may have stored it
			if (isApiError(err) && err.status === undefined)
				return { error: "no_answer" };
			return { error: getSaveError(err) ?? "failed" };
		}
	}

	return {
		mapPlanetToPlanType,
		createBlankDefinition,
		createNewPlan,
		saveExistingPlan,
		// in the store, so usePreferences doesn't load this module
		getPlanNamePlanet: planningStore.getPlanNamePlanet,
	};
}
