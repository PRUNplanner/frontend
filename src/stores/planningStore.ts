import { defineStore } from "pinia";
import { ref, Ref } from "vue";

// Util
import { inertClone } from "@/util/data";

// Types & Interfaces
import {
	ICX,
	ICXRecord,
	IEmpireRecord,
	IPlan,
	IPlanEmpireElement,
	IPlanRecord,
	ISharedPlan,
	ISharedRecord,
} from "@/stores/planningStore.types";
import { IShared } from "@/features/api/sharingData.types";

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

		/**
		 * Resets all store variables to their initial values
		 * @author jplacht
		 */
		function $reset(): void {
			plans.value = {};
			empires.value = {};
			cxs.value = {};
			shared.value = {};
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
				empires.value[e.uuid] = e;
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
				cxs.value[c.uuid] = c;
			});
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
				shared.value[s.plan_uuid] = s;
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
		 * Fetches all plans from the backend, stores them in this store
		 * and then returns them as list
		 * @author jplacht
		 *
		 * @async
		 * @returns {Promise<IPlan[]>} Plan Data List
		 */
		async function getAllPlans(): Promise<IPlan[]> {
			return inertClone(Object.values(plans.value));
		}

		/**
		 * Gets all empires the user has either from previous fetch
		 * or will load it again from the backend API
		 * @author jplacht
		 *
		 * @async
		 * @param {boolean} [force=false] Force Load from backend
		 * @returns {Promise<IPlanEmpireElement[]>} Empire List
		 */
		async function getAllEmpires(): Promise<IPlanEmpireElement[]> {
			return inertClone(Object.values(empires.value));
		}

		/**
		 * Gets all exchange preferences either from store or directly from
		 * the backend API if they were not fetched already
		 *
		 * @author jplacht
		 *
		 * @async
		 * @returns {Promise<ICX[]>} CX Preference Data Array
		 */
		async function getAllCX(): Promise<ICX[]> {
			return inertClone(Object.values(cxs.value));
		}

		/**
		 * Gets all sharing information from backend
		 * @author jplacht
		 *
		 * @async
		 * @returns {Promise<ISharedPlan[]>} Sharing Information List
		 */
		async function getSharedList(): Promise<ISharedPlan[]> {
			return inertClone(Object.values(shared.value));
		}

		return {
			// state
			plans,
			empires,
			cxs,
			shared,
			// reset
			$reset,
			// setters
			setEmpires,
			setPlan,
			setPlans,
			setCXs,
			setSharedList,
			deleteShared,
			deletePlan,
			// getters
			getCX,
			getPlan,
			getAllEmpires,
			getAllCX,
			getAllPlans,
			getSharedList,
		};
	},
	{
		persist: {
			pick: ["plans", "empires", "cxs", "shared"],
		},
	}
);
