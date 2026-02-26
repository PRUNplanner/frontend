// Composables
import { useBuildingData } from "@/database/services/useBuildingData";

// Types & Interfaces
import {
	BUILDING_EXPERTISE_TYPE,
	IBuilding,
	IPlanet,
} from "@/features/api/gameData.types";
import {
	EfficiencyMap,
	IBuildingEfficiency,
} from "@/features/planning/calculations/bonusCalculations.types";
import {
	EXPERT_TYPE,
	IExpertElement,
	IExpertRecord,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";
import {
	IPlanEmpire,
	PLAN_COGCPROGRAM_TYPE,
} from "@/stores/planningStore.types";

export const expertNames: string[] = [
	"Agriculture",
	"Chemistry",
	"Construction",
	"Electronics",
	"Food_Industries",
	"Fuel_Refining",
	"Manufacturing",
	"Metallurgy",
	"Resource_Extraction",
];

export async function useBonusCalculation() {
	const { getTotalWorkforce } = await useBuildingData();

	/**
	 * Static, map of building expertise and plan calculation
	 * result expert assignments
	 * @author jplacht
	 *
	 * @type {Record<
	 * 	BUILDING_EXPERTISE_TYPE,
	 * 	EXPERT_TYPE
	 * >}
	 */
	const MAP_BUILDING_EXPERTISE_EXPERTS: Record<
		BUILDING_EXPERTISE_TYPE,
		EXPERT_TYPE
	> = {
		AGRICULTURE: "Agriculture",
		CHEMISTRY: "Chemistry",
		CONSTRUCTION: "Construction",
		ELECTRONICS: "Electronics",
		FOOD_INDUSTRIES: "Food_Industries",
		FUEL_REFINING: "Fuel_Refining",
		MANUFACTURING: "Manufacturing",
		METALLURGY: "Metallurgy",
		RESOURCE_EXTRACTION: "Resource_Extraction",
	};

	/**
	 * Static, ingame map of Factions and their building
	 * expertise bonuses
	 * @author jplacht
	 *
	 * @type {EfficiencyMap}
	 */
	const FACTION_BONUS_MAP: EfficiencyMap = {
		ANTARES: {
			ELECTRONICS: 0.05,
		},
		BENTEN: {
			MANUFACTURING: 0.05,
		},
		HORTUS: {
			AGRICULTURE: 0.03,
			FOOD_INDUSTRIES: 0.02,
		},
		MORIA: {
			METALLURGY: 0.02,
			CONSTRUCTION: 0.03,
		},
		OUTSIDEREGION: {
			CHEMISTRY: 0.02,
			FUEL_REFINING: 0.02,
			RESOURCE_EXTRACTION: 0.02,
		},
	};

	/**
	 * Static, ingame expert bonus values
	 * @author jplacht
	 *
	 * @type {Record<number, number>}
	 */
	const expertBonus: Record<number, number> = {
		0: 0,
		1: 0.0306,
		2: 0.0696,
		3: 0.1248,
		4: 0.1974,
		5: 0.284,
	};

	/**
	 * Returns the expert bonus value on given expert amount.
	 * Will return 0 if an out-of-range expert amount (0-5) passed.
	 * @author jplacht
	 *
	 * @export
	 * @param {number} amount Expert Amount
	 * @returns {number} Expert Bonus
	 */
	function calculateExpertBonus(amount: number): number {
		if (Object.keys(expertBonus).includes(amount.toString())) {
			return expertBonus[amount];
		}

		return 0;
	}

	/**
	 * Calculates the buildings workforce efficiency by using the
	 * workforces efficiencies and the weighted efficiency by
	 * the buildings actual individual workforce type requirements
	 *
	 * @author jplacht
	 *
	 * @param {IBuilding} building Building Data
	 * @param {IWorkforceRecord} workforce Plan Workforce Result
	 * @returns {number} Building Workforce Efficiency
	 */
	function calculateBuildingWorkforceEfficiency(
		building: IBuilding,
		workforce: IWorkforceRecord
	): number {
		const totalWorkforce: number = getTotalWorkforce(building);
		let efficiency: number = 0;

		efficiency +=
			(building.pioneers / totalWorkforce) * workforce.pioneer.efficiency;
		efficiency +=
			(building.settlers / totalWorkforce) * workforce.settler.efficiency;
		efficiency +=
			(building.technicians / totalWorkforce) *
			workforce.technician.efficiency;
		efficiency +=
			(building.engineers / totalWorkforce) *
			workforce.engineer.efficiency;
		efficiency +=
			(building.scientists / totalWorkforce) *
			workforce.scientist.efficiency;

		return efficiency;
	}

	/**
	 * Calculates the buildings potential faction efficiency bonus
	 * @author jplacht
	 *
	 * @param {IBuilding} building Building Data
	 * @param {(IPlanEmpire | undefined)} empire Empire Data
	 * @returns {(IBuildingEfficiency | undefined)} Faction Bonus
	 */
	function calculateBuildingFactionBonus(
		building: IBuilding,
		empire: IPlanEmpire | undefined
	): IBuildingEfficiency | undefined {
		if (!empire || building.Expertise === null) return undefined;

		// multiplier using share of used and total available permits
		const multiplier: number =
			2 *
			(-2 * (empire.empire_permits_used / empire.empire_permits_total) +
				3);

		const efficiency: number | undefined =
			FACTION_BONUS_MAP[empire.empire_faction]?.[
				building.expertise as BUILDING_EXPERTISE_TYPE
			];

		if (!efficiency) return undefined;

		return {
			efficiencyType: "FACTION",
			value: 1 + efficiency * multiplier,
		};
	}

	/**
	 * Calculates a buildings total efficiency by taking into account
	 * all available factors that influence it like CorpHQ availability,
	 * COGC programs, workforce efficiency, expert setup and empire information
	 *
	 * @author jplacht
	 *
	 * @param {IBuilding} building Building Data
	 * @param {IPlanet} planet Planet Data
	 * @param {boolean} corphq Is Corporation HQ on Planet
	 * @param {PLAN_COGCPROGRAM_TYPE} cogc COGC
	 * @param {IWorkforceRecord} workforce Workforce Efficiencies
	 * @param {IExpertRecord} experts Expert Setup
	 * @param {(IPlanEmpire | undefined)} empire Plan Empire
	 * @returns {{
	 * 		totalEfficiency: number;
	 * 		elements: IBuildingEfficiency[];
	 * 	}} Total Efficiency and individual contributing factors
	 */
	function calculateBuildingEfficiency(
		building: IBuilding,
		planet: IPlanet,
		corphq: boolean,
		cogc: PLAN_COGCPROGRAM_TYPE,
		workforce: IWorkforceRecord,
		experts: IExpertRecord,
		empire: IPlanEmpire | undefined
	): {
		totalEfficiency: number;
		elements: IBuildingEfficiency[];
	} {
		const elements: IBuildingEfficiency[] = [];

		// Fertility and Farming buildings
		if (["FRM", "ORC"].includes(building.building_ticker)) {
			elements.push({
				efficiencyType: "FERTILITY",
				value:
					planet.fertility != -1.0
						? 1 + planet.fertility * (10 / 33)
						: 0,
			});
		}

		// Corporation HQ
		if (corphq) {
			elements.push({
				efficiencyType: "HQ",
				value: 1.1,
			});
		}

		// Expert + Advertising COGC
		if (building.Expertise !== null) {
			// COGC on programs
			if (cogc === building.expertise) {
				elements.push({
					efficiencyType: "COGC",
					value: 1.25,
				});
			}

			const expertElement: IExpertElement =
				experts[
					MAP_BUILDING_EXPERTISE_EXPERTS[
						building.expertise as BUILDING_EXPERTISE_TYPE
					]
				];

			if (expertElement.amount > 0) {
				elements.push({
					efficiencyType: "EXPERT",
					value: 1 + expertElement.bonus,
				});
			}
		}

		// Workforce COGC
		if (
			[
				"PIONEERS",
				"SETTLERS",
				"TECHNICIANS",
				"ENGINEERS",
				"SCIENTISTS",
			].includes(cogc)
		) {
			// Create a MAP of Workforce COGC and buildings workforce
			// number to then check for existance

			const workforceMap: Record<string, number> = {
				PIONEERS: building.pioneers,
				SETTLERS: building.settlers,
				TECHNICIANS: building.technicians,
				ENGINEERS: building.engineers,
				SCIENTISTS: building.scientists,
			};

			if (workforceMap[cogc] > 0) {
				elements.push({
					efficiencyType: "COGC",
					value: 1.1,
				});
			}
		}

		// Workforce
		elements.push({
			efficiencyType: "WORKFORCE",
			value: calculateBuildingWorkforceEfficiency(building, workforce),
		});

		// Faction Bonus
		const factionEfficiency: IBuildingEfficiency | undefined =
			calculateBuildingFactionBonus(building, empire);

		if (factionEfficiency) {
			elements.push(factionEfficiency);
		}

		// total efficiency is the product of all individual
		// efficiency factors this building has

		const totalEfficiency: number = elements.reduce(
			(result, e) => result * e.value,
			1
		);

		return { totalEfficiency, elements };
	}

	return {
		calculateExpertBonus,
		calculateBuildingWorkforceEfficiency,
		calculateBuildingFactionBonus,
		calculateBuildingEfficiency,
	};
}
