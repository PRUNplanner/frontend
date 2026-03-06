import { defineStore } from "pinia";
import { ref, Ref } from "vue";

// Util
import { getObjectSize, inertClone } from "@/util/data";

// Types & Interfaces
import {
	ICX,
	ICXData,
	ICXRecord,
	IEmpireRecord,
	IPlan,
	IPlanEmpireElement,
	IPlanRecord,
	ISharedPlan,
	ISharedRecord,
} from "@/stores/planningStore.types";
import { IShared } from "@/features/api/sharingData.types";
import {
	IFIOSitePlanet,
	IFIOStorage,
	IFIOStorageElement,
} from "@/features/api/gameData.types";

export const usePlanningStore = defineStore(
	"prunplanner_planning",
	() => {
		// state
		/** Key: Plan.uuid */
		const plans: Ref<IPlanRecord> = ref({});
		/** Key: Empire.uuid */
		const empires: Ref<IEmpireRecord> = ref({});
		/** Key: CX.uuid */
		const cxs: Ref<ICXRecord> = ref({});
		/** Key: Plan.uuid */
		const shared: Ref<ISharedRecord> = ref({});
		const fio_storage_planets: Ref<Record<string, IFIOStorageElement>> =
			ref({});
		const fio_storage_warehouses: Ref<Record<string, IFIOStorageElement>> =
			ref({});
		const fio_storage_ships: Ref<Record<string, IFIOStorageElement>> = ref(
			{}
		);
		const fio_sites_planets: Ref<Record<string, IFIOSitePlanet>> = ref({});

		const fio_storage_timestamp: Ref<Date | null> = ref(null);

		/**
		 * Resets all store variables to their initial values
		 * @author jplacht
		 */
		function $reset(): void {
			plans.value = {};
			empires.value = {};
			cxs.value = {};
			shared.value = {};
			fio_storage_planets.value = {};
			fio_storage_ships.value = {};
			fio_storage_warehouses.value = {};
			fio_sites_planets.value = {};
			fio_storage_timestamp.value = null;
		}

		// setters

		/**
		 * Sets empires by their Uuid
		 * @author jplacht
		 *
		 * @param {IPlanEmpireElement[]} empireList Empire Data
		 */
		function setEmpires(empireList: IPlanEmpireElement[]): void {
			empires.value = {};
			// store by Empire.uuid
			empireList.forEach((e) => {
				empires.value[e.uuid] = inertClone(e);
			});
		}

		/**
		 * Sets plans by their UUID
		 * @author jplacht
		 *
		 * @param {IPlan} data Plan Data
		 */
		function setPlan(data: IPlan): void {
			if (!data.uuid)
				throw new Error("Can't set plan data for undefined uuid.");

			plans.value[data.uuid] = data;
		}

		/**
		 * Sets multiple plans by their Uuid
		 * @author jplacht
		 *
		 * @param {IPlan[]} data Plan Data List
		 */
		function setPlans(data: IPlan[]): void {
			data.forEach((p) => setPlan(p));
		}

		/**
		 * Deletes a plan by its Uuid
		 * @author jplacht
		 *
		 * @param {string} planUuid Plan Uuid
		 */
		function deletePlan(planUuid: string): void {
			delete plans.value[planUuid];
		}

		/**
		 * Sets multiple CX by their Uuid
		 * @author jplacht
		 *
		 * @param {ICX[]} data CX Data List
		 */
		function setCXs(data: ICX[]): void {
			cxs.value = {};

			// store by CX.uuid
			data.forEach((c) => {
				cxs.value[c.uuid] = inertClone(c);
			});
		}

		function setCX(cxUuid: string, cxName: string, data: ICXData): void {
			if (cxs.value[cxUuid]) {
				cxs.value[cxUuid].cx_name = cxName;
				cxs.value[cxUuid].cx_data = data;
			}
		}

		/**
		 * Sets FIO Storage data separated by Planets, Warehouses and Ships
		 * @author jplacht
		 *
		 * @param {IFIOStorage} data FIO Storage Data
		 */
		function setFIOStorageData(data: IFIOStorage): void {
			fio_storage_planets.value = data.storage_data.planets;
			fio_storage_warehouses.value = data.storage_data.warehouses;
			fio_storage_ships.value = data.storage_data.ships;
			fio_sites_planets.value = data.sites_data;

			fio_storage_timestamp.value = data.last_modified;
		}

		/**
		 * Sets Shared Plans information by their Plan Uuid
		 * @author jplacht
		 *
		 * @param {IShared[]} data Shared Data List
		 */
		function setSharedList(data: IShared[]): void {
			shared.value = {};
			data.forEach((s) => {
				shared.value[s.plan] = inertClone(s);
			});
		}

		/**
		 * Deletes a shared plan by its plan Uuid
		 * @author jplacht
		 *
		 * @param {string} planUuid Plan Uuid
		 */
		function deleteShared(planUuid: string): void {
			delete shared.value[planUuid];
		}

		/**
		 * Get CX Preference information by CX Uuid
		 * @author jplacht
		 *
		 * @param {string} cxUuid UUid
		 * @returns {ICX} CX Preference Data
		 */
		function getCX(cxUuid: string): ICX {
			const findCX = cxs.value[cxUuid];

			if (findCX) return inertClone(findCX);

			throw new Error(
				`No data: CX '${cxUuid}'. Ensure CX uuid is valid and planning data has been loaded.`
			);
		}

		/**
		 * Gets a plan by its Uuid
		 *
		 * @author jplacht
		 *
		 * @async
		 * @param {string} planUuid Uuid
		 * @returns {Promise<IPlan>} Plan Data
		 */
		async function getPlan(planUuid: string): Promise<IPlan> {
			// try getting from already fetched data first
			const findPlan: IPlan | undefined = plans.value[planUuid];

			if (findPlan) return inertClone(plans.value[planUuid]);

			throw new Error(
				`No data: Plan '${planUuid}'. Ensure Plan uuid is valid and planning data has been loaded.`
			);
		}

		/**
		 * Gets all exchange preferences either from store or directly from
		 * the backend API if they were not fetched already
		 *
		 * @author jplacht
		 *
		 * @returns {ICX[]} CX Preference Data Array
		 */
		function getAllCX(): ICX[] {
			return Object.values(cxs.value);
		}

		/**
		 * Gets all sharing information from backend
		 * @author jplacht
		 *
		 * @returns {ISharedPlan[]} Sharing Information List
		 */
		function getSharedList(): ISharedPlan[] {
			return Object.values(shared.value);
		}
		async function getStoreSize() {
			const stores = [
				{ name: "Plans", source: plans.value },
				{ name: "Empires", source: empires.value },
				{ name: "Exchanges", source: cxs.value },
				{ name: "Sharings", source: shared.value },
				{
					name: "FIO Storage Planets",
					source: fio_storage_planets.value,
				},
				{ name: "FIO Storage Ships", source: fio_storage_ships.value },
				{
					name: "FIO Storage Warehouses",
					source: fio_storage_warehouses.value,
				},
				{ name: "FIO Sites Planets", source: fio_sites_planets.value },
			];

			const sizes = await Promise.all(
				stores.map((s) => getObjectSize(s.source))
			);

			return stores.map((s, i) => ({
				name: s.name,
				records: Object.keys(s.source).length,
				sizeMB: sizes[i],
			}));
		}

		return {
			// state
			plans,
			empires,
			cxs,
			shared,
			fio_storage_planets,
			fio_storage_warehouses,
			fio_storage_ships,
			fio_sites_planets,
			fio_storage_timestamp,
			// reset
			$reset,
			// setters
			setEmpires,
			setPlan,
			setPlans,
			setCXs,
			setCX,
			setSharedList,
			deleteShared,
			deletePlan,
			setFIOStorageData,
			// getters
			getCX,
			getPlan,
			getAllCX,
			getSharedList,
			// util
			getStoreSize,
		};
	},
	{
		persist: {
			pick: [
				"plans",
				"empires",
				"cxs",
				"shared",
				"fio_storage_planets",
				"fio_storage_warehouses",
				"fio_storage_ships",
				"fio_sites_planets",
				"fio_sites_ships",
				"fio_sites_timestamp",
				"fio_storage_timestamp",
			],
		},
		// broadcast: {
		// 	enable: true,
		// 	persisted: true,
		// 	pick: ["plans", "empires", "cxs", "shared"],
		// 	debounce: 2_000,
		// 	channel: "prunplanner_planning_data",
		// },
	}
);
