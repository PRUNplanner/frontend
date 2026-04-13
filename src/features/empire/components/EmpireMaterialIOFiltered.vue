<script setup lang="ts">
	import { computed, PropType, ref, Ref, watch } from "vue";

	// Components
	import EmpireMaterialIOFilters from "@/features/empire/components/EmpireMaterialIOFilters.vue";
	import EmpireMaterialIO from "@/features/empire/components/EmpireMaterialIO.vue";
	import EmpireAnalysis from "@/features/empire/components/EmpireAnalysis.vue";
	import EmpireOpportunities from "@/features/empire/components/EmpireOpportunities.vue";

	// Composables
	import { usePlanetData } from "@/database/services/usePlanetData";
	const { getPlanetName } = usePlanetData();

	// Util
	import { inertClone } from "@/util/data";

	// Types & Interfaces
	import {
		IEmpireMaterialIO,
		IEmpirePlanListData,
	} from "@/features/empire/empire.types";
	import { PSelectOption } from "@/ui/ui.types";
	import { WORKFORCE_CONSUMPTION_MAP } from "@/features/planning/calculations/workforceCalculations";

	const props = defineProps({
		content: {
			type: String as PropType<
				"materialio" | "analysis" | "opportunities"
			>,
			required: true,
		},
		empireMaterialIO: {
			type: Array as PropType<IEmpireMaterialIO[]>,
			required: true,
		},
		planListData: {
			type: Array as PropType<IEmpirePlanListData[]>,
			required: true,
		},
	});

	const workforceMaterial: string[] = [
		...new Set(
			Object.values(WORKFORCE_CONSUMPTION_MAP)
				.flat()
				.map((wm) => wm.ticker)
		),
	];

	// Local State
	const localEmpireMaterialIO: Ref<IEmpireMaterialIO[]> = ref([]);
	const localPlanListData = computed(() => props.planListData);

	const filteredMaterialIO: Ref<IEmpireMaterialIO[]> = ref([]);
	const refMaterialSelectOptions: Ref<PSelectOption[]> = ref([]);
	const refFilterMaterials: Ref<string[]> = ref([]);
	const refPlanetSelectOptions: Ref<PSelectOption[]> = ref([]);
	const refFilterPlanets: Ref<string[]> = ref([]);
	const refFilterLoadbalance: Ref<boolean> = ref(false);
	const refFilterHideConsumables: Ref<boolean> = ref(false);

	// Prop Watcher
	watch(
		() => props.empireMaterialIO,
		(newData: IEmpireMaterialIO[]) => {
			localEmpireMaterialIO.value = newData;
			createFilter();
			applyFilter();
		},
		{ immediate: true }
	);

	/**
	 * Creates filter options based on material i/o data
	 * @author jplacht
	 *
	 * @returns {void}
	 */
	async function createFilter(): Promise<void> {
		refMaterialSelectOptions.value = localEmpireMaterialIO.value.map(
			(m) => {
				return {
					label: m.ticker,
					value: m.ticker,
				};
			}
		);

		let availPlanetIds: string[] = [];

		localEmpireMaterialIO.value.map((p) => {
			availPlanetIds = availPlanetIds.concat(
				p.inputPlanets
					.flat()
					.filter((v) => v)
					.map((pm) => pm.planetId),
				p.outputPlanets
					.flat()
					.filter((v) => v)
					.map((pm) => pm.planetId)
			);
		});

		refPlanetSelectOptions.value = await Promise.all(
			[...new Set(availPlanetIds)].map(async (o) => {
				return {
					label: await getPlanetName(o),
					value: o,
				};
			})
		);
	}

	/**
	 * Applies filter set by user to data
	 * @author jplacht
	 *
	 * @returns {void}
	 */
	function applyFilter(): void {
		filteredMaterialIO.value = inertClone(localEmpireMaterialIO.value);

		// material
		if (refFilterMaterials.value.length > 0) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter((m) =>
				refFilterMaterials.value.includes(m.ticker)
			);
		}

		// planets
		if (refFilterPlanets.value.length > 0) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter((p) => {
				const inputFlat = p.inputPlanets.flat().map((i) => i.planetId);
				const outputFlat = p.outputPlanets
					.flat()
					.map((o) => o.planetId);

				return (
					inputFlat.some((r) =>
						refFilterPlanets.value.flat().includes(r)
					) ||
					outputFlat.some((r) =>
						refFilterPlanets.value.flat().includes(r)
					)
				);
			});
		}

		// loadbalance
		if (refFilterLoadbalance.value) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter(
				(lb) => lb.input != 0 && lb.output != 0
			);
		}

		// consumables
		if (refFilterHideConsumables.value) {
			filteredMaterialIO.value = filteredMaterialIO.value.filter(
				(m) => !workforceMaterial.includes(m.ticker)
			);
		}
	}
</script>

<template>
	<div class="">
		<div
			v-if="content != 'opportunities'"
			class="border rounded-[3px] border-b-0 border-white/15 p-3">
			<EmpireMaterialIOFilters
				v-model:load-balance="refFilterLoadbalance"
				v-model:hide-consumables="refFilterHideConsumables"
				v-model:filter-materials="refFilterMaterials"
				v-model:filter-planets="refFilterPlanets"
				:material-options="refMaterialSelectOptions"
				:planet-options="refPlanetSelectOptions"
				@apply-filter="applyFilter" />
		</div>
		<EmpireMaterialIO
			v-if="content === 'materialio'"
			:empire-material-i-o="filteredMaterialIO" />
		<EmpireAnalysis
			v-else-if="content === 'analysis'"
			:empire-material-i-o="filteredMaterialIO"
			:plan-list-data="localPlanListData" />
		<EmpireOpportunities
			v-else-if="content === 'opportunities'"
			:empire-material-i-o="empireMaterialIO" />
	</div>
</template>
