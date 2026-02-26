import { computed, ComputedRef, Ref } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Types & Interfaces
import { IPlanResult } from "@/features/planning/usePlanCalculation.types";
import { IFIOStorageElement } from "@/features/api/gameData.types";
import { IPlan } from "@/stores/planningStore.types";
import {
	IFIOBurnPlanetTableElement,
	IFIOBurnTableElement,
	IFIOBurnTableElementMaterial,
} from "@/features/fio/useFIOBurn.types";

export function useFIOBurn(
	plans: Ref<IPlan[]>,
	data: Ref<Record<string, IPlanResult>>
) {
	const planningStore = usePlanningStore();

	/**
	 * Burn data reference from Game Data Store
	 * @author jplacht
	 *
	 * @type {Record<string, IFIOStorageElement>}
	 */
	const burnData: Record<string, IFIOStorageElement> =
		planningStore.fio_storage_planets;

	/**
	 * Creates record of plan list
	 * @author jplacht
	 *
	 * @type {ComputedRef<Record<string, IPlan>>}
	 */
	const planRecord: ComputedRef<Record<string, IPlan>> = computed(() => {
		return plans.value.reduce(
			(acc, item) => ((acc[item.uuid!] = item), acc),
			{} as Record<string, IPlan>
		);
	});

	/**
	 * Plan Table from Burn Calculation
	 * @author jplacht
	 *
	 * @type {ComputedRef<IFIOBurnPlanetTableElement[]>}
	 */
	const planTable: ComputedRef<IFIOBurnPlanetTableElement[]> = computed(
		() => {
			const table: IFIOBurnPlanetTableElement[] = burnTable.value.map(
				(p) => {
					return {
						planUuid: p.planUuid,
						planName: p.planName,
						planetId: p.planetId,
						minDays: p.minDays,
					};
				}
			);

			// sort by planName
			table.sort((a, b) => (a.planName > b.planName ? 1 : -1));

			return table;
		}
	);

	/**
	 * Performs burn calculation on given plans and their production
	 * material io data taking existing storage information into account
	 *
	 * @author jplacht
	 *
	 * @type {ComputedRef<IFIOBurnTableElement[]>}
	 */
	const burnTable: ComputedRef<IFIOBurnTableElement[]> = computed(() => {
		const tableData: IFIOBurnTableElement[] = [];

		for (const [planUuid, plan] of Object.entries(data.value) as [
			string,
			IPlanResult,
		][]) {
			const planData: IPlan = planRecord.value[planUuid];
			const hasStorage: boolean = burnData[planData.planet_natural_id]
				? true
				: false;

			const elementData: IFIOBurnTableElement = {
				key: planUuid,
				planUuid: planUuid,
				planName: planData.plan_name ?? "Unnamed",
				planetId: planData.planet_natural_id,
				hasStorage,
				burnMaterials: [] as IFIOBurnTableElementMaterial[],
				minDays: 0,
			};

			let minDays: number = Infinity;

			// do burn analysis
			plan.materialio.forEach((m) => {
				let stock: number = 0;

				if (hasStorage && burnData[planData.planet_natural_id]) {
					const found = burnData[
						planData.planet_natural_id
					].StorageItems.find((bi) => bi.MaterialTicker === m.ticker);

					if (found) {
						stock = found.MaterialAmount;
					}
				}

				let exhaustion: number = Infinity;

				if (m.delta < 0) {
					exhaustion = stock / (m.delta * -1);
				}

				if (exhaustion < minDays) minDays = exhaustion;

				elementData.burnMaterials.push({
					ticker: m.ticker,
					input: m.input,
					output: m.output,
					delta: m.delta,
					stock: stock,
					exhaustion: exhaustion,
				});

				elementData.minDays = minDays;
			});

			tableData.push(elementData);
		}

		// sort by plan name
		tableData.sort((a, b) => (a.planName > b.planName ? 1 : -1));

		return tableData;
	});

	return {
		burnTable,
		planTable,
		planRecord,
	};
}
