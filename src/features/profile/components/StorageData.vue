<script setup lang="ts">
	import type { IStoreStatistic } from "@/database/composables/useIndexedDBStore";
	import {
		materialsStore,
		buildingsStore,
		recipesStore,
		planetsStore,
		exchangesStore,
	} from "@/database/stores";
	import { onMounted, ref, type Ref } from "vue";

	interface IStatistic extends IStoreStatistic {
		name: string;
	}

	const stat: Ref<IStatistic[]> = ref([]);

	import { formatAmount, formatNumber } from "@/util/numbers";
	import { usePlanningStore } from "@/stores/planningStore";
	const planningStore = usePlanningStore();

	import { PTable } from "@/ui";

	onMounted(async () => {
		const results = await Promise.all([
			materialsStore.statistics(),
			buildingsStore.statistics(),
			recipesStore.statistics(),
			planetsStore.statistics(),
			exchangesStore.statistics(),
			planningStore.getStoreSize(),
		]);

		stat.value = [
			{ name: "Materials", ...results[0] },
			{ name: "Buildings", ...results[1] },
			{ name: "Recipes", ...results[2] },
			{ name: "Planets", ...results[3] },
			{ name: "Exchanges", ...results[4] },
			...results[5],
		];
	});
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg my-auto">
		{{ $t("profile.storage_data.title") }}
	</h2>
	<div class="py-3 text-white/60">
		{{ $t("profile.storage_data.description") }}
	</div>
	<div>
		<PTable striped>
			<thead>
				<tr>
					<th>{{ $t("profile.storage_data.table.storage") }}</th>
					<th>{{ $t("profile.storage_data.table.records") }}</th>
					<th class="!text-end">
						{{ $t("profile.storage_data.table.size") }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="element in stat" :key="element.name">
					<td>{{ element.name }}</td>
					<td>{{ formatAmount(element.records) }}</td>
					<td class="!text-end">
						{{ formatNumber(element.sizeMB) }} MB
					</td>
				</tr>
			</tbody>
		</PTable>
	</div>
</template>
