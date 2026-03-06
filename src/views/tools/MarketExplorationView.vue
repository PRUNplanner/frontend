<script setup lang="ts">
	import { onMounted, Ref, ref } from "vue";
	import { useHead } from "@unhead/vue";

	useHead({
		title: "Market Exploration | PRUNplanner",
	});

	// Stores
	import { useMaterialData } from "@/database/services/useMaterialData";
	const { materialSelectOptions, preload: preloadMaterials } =
		useMaterialData();

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";

	// Composables
	import { useMarketExplorationChart } from "@/features/market_exploration/useMarketExplorationChart";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PSelect, PButton, PSpin } from "@/ui";
	import { Chart } from "highcharts-vue";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { formatDate } from "@/util/date";
	import { formatAmount } from "@/util/numbers";

	const exchangeOptions: Ref<PSelectOption[]> = ref(
		["AI1", "CI1", "IC1", "NC1"].map((e) => {
			return { label: e, value: e };
		})
	);

	const materialOptions = ref<PSelectOption[]>([]);

	const selectedExchange: Ref<string> = ref("AI1");
	const selectedMaterial: Ref<string> = ref("RAT");

	const {
		fetchData,
		isLoading: loading,
		hasError: error,
		chartOptions,
		dataChart,
	} = useMarketExplorationChart(selectedExchange, selectedMaterial);

	function fetch(): void {
		trackEvent("marketexploration_explore", {
			exchange: selectedExchange.value,
			materialTicker: selectedMaterial.value,
		});
		fetchData();
	}

	onMounted(async () => {
		await preloadMaterials();
		materialOptions.value = materialSelectOptions.value;
	});
</script>

<template>
	<WrapperGameDataLoader
		:key="`GAMEDATAWRAPPER#MarketExploration`"
		load-materials>
		<div class="min-h-screen flex flex-col">
			<div
				class="px-6 py-3 border-b border-white/10 flex flex-row justify-between gap-x-3">
				<h1 class="text-2xl font-bold">Market Exploration</h1>
				<div>
					<div class="flex flex-row gap-x-3 child:my-auto">
						<div>Exchange</div>
						<PSelect
							v-model:value="selectedExchange"
							:options="exchangeOptions"
							class="w-25" />

						<div>Material</div>
						<PSelect
							v-model:value="selectedMaterial"
							searchable
							:options="materialOptions"
							class="w-50" />
						<PButton :loading="loading" @click="fetch">
							Explore
						</PButton>
						<HelpDrawer file-name="tools_market_exploration" />
					</div>
				</div>
			</div>
			<div class="px-6 py-3">
				<div v-if="loading" class="text-center">
					<PSpin size="xl" /> <br />
					Loading Data from backend.
				</div>
				<div v-else-if="error" class="text-center">
					Error Loading Data.
				</div>
				<div v-else-if="!loading && !error && dataChart.length > 0">
					<Chart
						ref="marketchart"
						:constructor-type="'stockChart'"
						class="hc"
						:options="chartOptions" />
					<h2 class="text-xl py-2">Data</h2>
					<XNDataTable
						:data="dataChart"
						striped
						:pagination="{ pageSize: 50 }">
						<XNDataTableColumn
							key="Datetime"
							title="Date"
							sorter="default">
							<template #render-cell="{ rowData }">
								{{ formatDate(rowData.date_epoch) }}
							</template>
						</XNDataTableColumn>
						<XNDataTableColumn
							key="low_p"
							title="Lowest Price"
							sorter="default" />
						<XNDataTableColumn
							key="high_p"
							title="Highest Price"
							sorter="default" />
						<XNDataTableColumn
							key="volume"
							title="Traded Volume"
							sorter="default">
							<template #render-cell="{ rowData }">
								{{ formatAmount(rowData.volume) }}
							</template>
						</XNDataTableColumn>
					</XNDataTable>
				</div>
				<div v-else class="text-center">
					Please select an Exchange and Material. Press "Explore".
				</div>
			</div>
		</div>
	</WrapperGameDataLoader>
</template>
