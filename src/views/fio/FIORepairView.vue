<script setup lang="ts">
	import { ref } from "vue";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useFIORepair } from "@/features/fio/useFIORepair";

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import FIORepairPlanet from "@/features/fio/components/FIORepairPlanet.vue";
	import FIORepairShip from "@/features/fio/components/FIORepairShip.vue";

	// Util
	import { relativeFromDate } from "@/util/date";

	const planningStore = usePlanningStore();

	const { planetRepairTable } = useFIORepair(
		ref(planningStore.fio_sites_planets)
	);
</script>

<template>
	<WrapperGameDataLoader load-materials>
		<div class="min-h-screen flex flex-col">
			<div
				class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
				<h1 class="text-2xl font-bold my-auto">FIO Repair</h1>
				<div class="my-auto">
					FIO Data Update:
					{{
						relativeFromDate(
							planningStore.fio_storage_timestamp ?? 0,
							true
						)
					}}
				</div>
			</div>

			<div
				class="grow grid grid-cols-1 gap-3 divide-x divide-white/10 child:px-6 child:py-3">
				<div>
					<FIORepairPlanet :repair-data="planetRepairTable" />
				</div>
			</div>
		</div>
	</WrapperGameDataLoader>
</template>
