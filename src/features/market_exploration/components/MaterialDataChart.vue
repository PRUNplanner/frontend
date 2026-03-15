<script setup lang="ts">
	import { computed, ComputedRef, onMounted, ref, Ref } from "vue";

	// Types & Interfaces
	import {
		IMaterialExplorationRecord,
		IMaterialMarketHistory,
	} from "@/features/market_exploration/marketExploration.types";

	// Composables
	import { useMarketExploration } from "@/features/market_exploration/useMarketExploration";
	const { getMaterialExplorationData } = useMarketExploration();

	// Util
	import { dateStringFromEpoch } from "@/util/date";

	// Components
	import MarketHistoryChart from "@/ui/charts/MarketHistoryChart.vue";

	// UI
	import { PSpin } from "@/ui";

	// Props
	const props = defineProps({
		materialTicker: {
			type: String,
			required: true,
		},
		displayValue: {
			type: String,
			required: false,
			default: "traded",
		},
	});

	onMounted(async () => {
		await getMaterialExplorationData(props.materialTicker).then(
			(result: IMaterialExplorationRecord) => {
				chartData.value = result;
			}
		);
	});

	const chartData: Ref<IMaterialExplorationRecord | undefined> =
		ref(undefined);

	const transformedChartData: ComputedRef<IMaterialMarketHistory[]> =
		computed(() => {
			const data = chartData.value;
			if (!data) return [];
			else {
				const exchanges = Object.keys(data);

				const allEpochs = new Set<number>();
				exchanges.forEach((ex) => {
					data[ex].forEach((d) => allEpochs.add(d.date_epoch));
				});

				const sortedEpochs = Array.from(allEpochs).sort(
					(a, b) => a - b
				);
				const lastSevenEpochs = sortedEpochs.slice(-7);

				return lastSevenEpochs.map((epoch) => {
					const row: IMaterialMarketHistory = {
						date: dateStringFromEpoch(epoch),
						AI1: 0,
						CI1: 0,
						IC1: 0,
						NC1: 0,
					};

					exchanges.forEach((ex) => {
						const dayEntry = data[ex].find(
							(d) => d.date_epoch === epoch
						);
						row[ex] = dayEntry ? dayEntry[props.displayValue] : 0;
					});

					return row;
				});
			}
		});
</script>

<template>
	<div v-if="!chartData" class="w-full h-75 flex items-center justify-center">
		<div class="text-white text-center">
			<PSpin size="lg" />
			<div class="text-white/60">Loading Data...</div>
		</div>
	</div>
	<div v-else>
		<MarketHistoryChart :data="transformedChartData" />
	</div>
</template>
