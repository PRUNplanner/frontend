import { computed, ComputedRef, Ref } from "vue";

// Composables
import { usePlanetData } from "@/database/services/usePlanetData";

// Types & Interfaces
import { IFIOSitePlanet, IFIOSiteShip } from "@/features/api/gameData.types";
import {
	IFIOSitesRepairTablePlanetElement,
	IFIOSitesRepairTableShipElement,
} from "@/features/fio/useFIORepair.types";

/**
 * Composable making use of FIO Sites Data
 * @author jplacht
 *
 * @export
 * @param {Ref<Record<string, IFIOSitePlanet>>} planets Planets Sites Data
 * @param {Ref<Record<string, IFIOSiteShip>>} ships Ships Sites Data
 */
export function useFIORepair(
	planets: Ref<Record<string, IFIOSitePlanet>>,
	ships: Ref<Record<string, IFIOSiteShip>>
) {
	const { planetNames, loadPlanetNames } = usePlanetData();

	const MINTCONDITION: number = 1.0;

	/**
	 * Decides if a building ticker is an infrastructure building, those
	 * are either habitations, storage or the core module
	 * @author jplacht
	 *
	 * @param {string} ticker Building Ticker
	 * @returns {boolean} Is infrastructure Building
	 */
	function isInfrastructureBuilding(ticker: string): boolean {
		return ticker.startsWith("HB") || ticker === "STO" || ticker === "CM" ||
			ticker === "STA" || ticker === "STE" || ticker === "STV" || ticker === "STW";
	}

	/**
	 * Transforms FIO Planets Site data into the Repair Table View
	 * @author jplacht
	 *
	 * @type {ComputedRef<IFIOSitesRepairTablePlanetElement[]>}
	 */
	const planetRepairTable: ComputedRef<IFIOSitesRepairTablePlanetElement[]> =
		computed(() => {
			const data: IFIOSitesRepairTablePlanetElement[] = [];

			// trigger planet name loading
			loadPlanetNames(Object.keys(planets.value));

			Object.values(planets.value).forEach((planetData) => {
				// generate average condition and building factors

				let buildingAmount: number = 0;
				let productionBuildingAmount: number = 0;
				let infrastructureBuildingAmount: number = 0;
				let sumCondition: number = 0;
				let minCondition: number = MINTCONDITION;
				let maxLastRepairDays: number = 0;

				planetData.Buildings.forEach((planetBuilding) => {
					// Increase the building amounts and handle conditions
					buildingAmount += 1;
					if (
						isInfrastructureBuilding(planetBuilding.BuildingTicker)
					) {
						infrastructureBuildingAmount += 1;
					} else {
						productionBuildingAmount += 1;

						// building condition is only relevant for production buildings

						sumCondition += planetBuilding.Condition;

						// find minimum condition
						if (planetBuilding.Condition < minCondition)
							minCondition = planetBuilding.Condition;

						// find maximum age of last repair
						if (
							planetBuilding.AgeDays &&
							planetBuilding.AgeDays !== null &&
							planetBuilding.AgeDays > maxLastRepairDays
						)
							maxLastRepairDays = planetBuilding.AgeDays;
					}
				});

				data.push({
					planetId: planetData.PlanetIdentifier,
					planetName:
						planetNames.value[planetData.PlanetIdentifier] ??
						"Loading",
					amountBuildings: buildingAmount,
					amountProductionBuildings: productionBuildingAmount,
					amountInfrastructureBuildings: infrastructureBuildingAmount,
					minCondition: minCondition,
					averageCondition: sumCondition / productionBuildingAmount,
					maxLastRepairDays: maxLastRepairDays,
				});
			});

			return data;
		});

	/**
	 * Transforms FIO Ships Site data into the repair table view
	 * @author jplacht
	 *
	 * @type {ComputedRef<IFIOSitesRepairTableShipElement[]>}
	 */
	const shipRepairTable: ComputedRef<IFIOSitesRepairTableShipElement[]> =
		computed(() => {
			const data: IFIOSitesRepairTableShipElement[] = [];

			Object.values(ships.value).forEach((shipData) => {
				data.push({
					shipRegistration: shipData.Registration,
					shipName: shipData.Name ? shipData.Name : "Unnamed",
					condition: shipData.Condition,
					repairMaterials: shipData.RepairMaterials.map((rm) => {
						return { ticker: rm.MaterialTicker, amount: rm.Amount };
					}).sort((a, b) => (a.ticker > b.ticker ? 1 : -1)),
				});
			});

			return data;
		});

	return {
		isInfrastructureBuilding,
		planetRepairTable,
		shipRepairTable,
	};
}
