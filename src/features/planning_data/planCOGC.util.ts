// Schemas
import { PlanCOGCProgramSchema } from "@prunplanner/engine/schemas";

// Types & Interfaces
import type {
	PlanCOGCProgram,
	PlanetCOGCProgramType,
} from "@prunplanner/engine/schemas";

const cogcValues: readonly string[] = PlanCOGCProgramSchema.options;

/** i18n key of each plan COGC program's short label */
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

/**
 * Maps a planet's COGC program type to a plan's COGC program, as a new
 * plan starts with the planet's active program
 *
 * @author jplacht
 *
 * @param {(PlanetCOGCProgramType | null | undefined)} input Planet COGC Type
 * @returns {PlanCOGCProgram} Plan COGC Type, "---" without a valid one
 */
export function mapPlanetToPlanType(
	input: PlanetCOGCProgramType | null | undefined
): PlanCOGCProgram {
	if (!input) return "---";
	const parts = input.split("_");
	const identifiedType = parts.slice(1).join("_").toUpperCase();

	// value could be invalid or on strike, check to ensure we got a proper cogc
	if (!cogcValues.includes(identifiedType)) return "---";
	else return identifiedType as PlanCOGCProgram;
}
