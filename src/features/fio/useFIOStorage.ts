import { computed, ComputedRef } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Types & Interfaces
import { PSelectOption } from "@/ui/ui.types";
import {
	IFIOStorageElement,
	IFIOStorageItem,
} from "@/features/api/gameData.types";
import { IFIOFindMaterialResult } from "@/features/fio/useFIOStorage.types";

export function useFIOStorage() {
	const planningStore = usePlanningStore();

	/**
	 * Users storage options, with a "None" option and all
	 * other stores grouped by their type (planet, war, ship)
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<PSelectOption[]>}
	 */
	const storageOptions: ComputedRef<PSelectOption[]> = computed(() => {
		const options: PSelectOption[] = [
			{
				label: "No FIO Storage",
				value: undefined,
			},
		];

		const planets: string[] = Object.keys(
			planningStore.fio_storage_planets
		);

		if (planets.length > 0) {
			options.push({
				label: "Planets",
				value: "planets",
				children: planets.map((elem) => ({
					label: elem,
					value: `PLANET#${elem}`,
				})),
			});
		}

		const warehouses: string[] = Object.keys(
			planningStore.fio_storage_warehouses
		);
		if (warehouses.length > 0) {
			options.push({
				label: "Warehouses",
				value: "warehouses",
				children: warehouses.map((elem) => ({
					label: elem,
					value: `WAR#${elem}`,
				})),
			});
		}

		const ships: string[] = Object.keys(planningStore.fio_storage_ships);
		if (ships.length > 0) {
			options.push({
				label: "Ships",
				value: "ships",
				children: ships.map((elem) => ({
					label: elem,
					value: `SHIP#${elem}`,
				})),
			});
		}

		return options;
	});

	/**
	 * Indicates if a user has storage, needs to be checked to have more
	 * options than 1, as the "None" option is always populated
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<boolean>}
	 */
	const hasStorage: ComputedRef<boolean> = computed(
		() => storageOptions.value.length > 1
	);

	/**
	 * Finds the stored amount of a material on its identifier,
	 * with the identifier always being of 'TYPE#ID', with type
	 * representing "PLANET", "WAR" or "SHIP" and the ID the stores
	 * individual identifier.
	 *
	 * @author jplacht
	 *
	 * @param {(string | undefined)} identifier Storage Identifier
	 * @param {string} ticker Material Ticker
	 * @returns {number} Stored amount, defaults to 0
	 */
	function findStorageValueFromOptions(
		identifier: string | undefined,
		ticker: string
	): number {
		if (identifier === undefined) return 0;

		let value: number = 0;

		const idParts: string[] = identifier.split("#");
		if (idParts[0] === "PLANET") {
			value =
				planningStore.fio_storage_planets[
					idParts[1]
				]?.StorageItems.find((e) => e.MaterialTicker === ticker)
					?.MaterialAmount ?? 0;
		} else if (idParts[0] === "WAR") {
			value =
				planningStore.fio_storage_warehouses[
					idParts[1]
				]?.StorageItems.find((e) => e.MaterialTicker === ticker)
					?.MaterialAmount ?? 0;
		} else if (idParts[0] === "SHIP") {
			value =
				planningStore.fio_storage_ships[idParts[1]]?.StorageItems.find(
					(e) => e.MaterialTicker === ticker
				)?.MaterialAmount ?? 0;
		}

		return value;
	}

	/**
	 * Checks for given Material ticker in all storage options (planet, warehouse, ship)
	 * and gets the total amount of available materials as well as an array of locations
	 *
	 * @author jplacht
	 *
	 * @param {string} ticker Ticker to search
	 * @returns {IFIOFindMaterialResult} Search Results
	 */
	function findMaterial(ticker: string): IFIOFindMaterialResult {
		const amountAndLocations: IFIOFindMaterialResult = {
			amount: 0,
			locations: [],
		};

		const sources = [
			{
				data: planningStore.fio_storage_planets,
				type: "PLANET",
				getName: (item: IFIOStorageElement) => item.Identifier,
			},
			{
				data: planningStore.fio_storage_warehouses,
				type: "WAR",
				getName: (item: IFIOStorageElement) => item.Identifier,
			},
			{
				data: planningStore.fio_storage_ships,
				type: "SHIP",
				getName: (item: IFIOStorageElement) => item.Identifier,
			},
		];

		sources.forEach(({ data, type, getName }) => {
			Object.values(data).forEach((location) => {
				location.StorageItems.forEach((item: IFIOStorageItem) => {
					if (item.MaterialTicker === ticker) {
						amountAndLocations.amount += item.MaterialAmount;
						amountAndLocations.locations.push({
							type,
							name: getName(location),
							amount: item.MaterialAmount,
						});
					}
				});
			});
		});

		return amountAndLocations;
	}

	return {
		hasStorage,
		storageOptions,
		findStorageValueFromOptions,
		findMaterial,
	};
}
