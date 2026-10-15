<script setup lang="ts">
	import type { IStoreStatistic } from "@/database/composables/useIndexedDBStore";
	import {
		materialsStore,
		buildingsStore,
		recipesStore,
		planetsStore,
		exchangesStore,
	} from "@/database/stores";
	import { computed, onMounted, ref, type Ref } from "vue";

	interface IStatistic extends IStoreStatistic {
		name: string;
	}

	const stat: Ref<IStatistic[]> = ref([]);
	const total = computed(() => ({
		records: stat.value.reduce((sum, s) => sum + s.records, 0),
		sizeMB: stat.value.reduce((sum, s) => sum + s.sizeMB, 0),
	}));

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
	<details class="group">
		<summary
			class="cursor-pointer flex flex-wrap items-baseline gap-x-3 list-none [&::-webkit-details-marker]:hidden">
			<h2 class="text-white/80 font-bold text-lg">
				<span
					class="inline-block transition-transform group-open:rotate-90"
					aria-hidden="true">
					▸
				</span>
				{{ $t("profile.storage_data.title") }}
			</h2>
			<span v-if="stat.length" class="text-sm text-muted">
				{{
					$t("profile.storage_data.total", {
						size: formatNumber(total.sizeMB),
						records: formatAmount(total.records),
					})
				}}
			</span>
		</summary>
		<div class="py-3 text-muted">
			{{ $t("profile.storage_data.description") }}
		</div>
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
	</details>
</template>
