<script setup lang="ts">
	import { computed, onMounted, Ref, ref } from "vue";
	import { useHead } from "@unhead/vue";

	useHead({
		title: "Market Exploration | PRUNplanner",
	});

	// Stores
	import { useMaterialData } from "@/database/services/useMaterialData";
	const {
		materialSelectOptions,
		getMaterialClass,
		preload: preloadMaterials,
		materials,
	} = useMaterialData();
	import { useExchangeData } from "@/database/services/useExchangeData";
	const { getMaterialExchangeOverview } = await useExchangeData();

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import MarketExplorationChart from "@/ui/charts/MarketExplorationChart.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import MaterialCXOverviewTable from "@/features/cx/components/MaterialCXOverviewTable.vue";

	// Composables
	import { useMarketExplorationChart } from "@/features/market_exploration/useMarketExplorationChart";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import { PSelectOption } from "@/ui/ui.types";
	import { IMaterialExchangeOverview } from "@/database/services/useExchangeData.types";

	// UI
	import { PSelect, PButton } from "@/ui";
	import { XNDataTable, XNDataTableColumn } from "@skit/x.naive-ui";
	import { CloseFullscreenSharp, OpenInFullSharp } from "@vicons/material";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	const exchangeOptions: Ref<PSelectOption[]> = ref(
		["AI1", "CI1", "IC1", "NC1"].map((e) => {
			return { label: e, value: e };
		})
	);

	const materialOptions = ref<PSelectOption[]>([]);

	const selectedExchange: Ref<string> = ref("AI1");
	const selectedMaterial: Ref<string> = ref("DW");
	const selectedChartFullscreen: Ref<boolean> = ref(false);

	const {
		fetchData,
		isLoading: loading,
		dataCandlestick,
	} = useMarketExplorationChart(selectedExchange, selectedMaterial);

	function fetch(): void {
		trackEvent("marketexploration_explore", {
			exchange: selectedExchange.value,
			materialTicker: selectedMaterial.value,
		});
		fetchData();
	}

	interface IExchangeOverview {
		material_ticker: string;
		vwap_universe_7d: number;
		vwap_universe_30d: number;
		vwap_trend: number;
		volume_7d: number;
		volume_30d: number;
		supply_universe: number;
		demand_universe: number;
		delta_supply_demand_universe: number;
		weighted_trend: number;
		price_cohesion: number;
		overview: IMaterialExchangeOverview;
	}

	const dataOverview = ref<IExchangeOverview[]>([]);

	const dataOverviewMap = computed(() => {
		return new Map(
			dataOverview.value.map((item) => [item.material_ticker, item])
		);
	});

	async function generateDataOverview(): Promise<void> {
		if (!materials.value) return;

		const overviewPromises = materials.value.map(async (m) => {
			const overview = await getMaterialExchangeOverview(m.ticker);

			return {
				material_ticker: m.ticker,
				vwap_universe_7d: overview.vwap_7d.UNIVERSE,
				vwap_universe_30d: overview.vwap_30d.UNIVERSE,
				vwap_trend: overview.vwap_analysis.UNIVERSE.percentChange,
				volume_7d: overview.sum_traded_7d.UNIVERSE,
				volume_30d: overview.sum_traded_30d.UNIVERSE,
				supply_universe: overview.supply.UNIVERSE,
				demand_universe: overview.demand.UNIVERSE,
				delta_supply_demand_universe:
					overview.delta_supply_demand.UNIVERSE,
				weighted_trend: overview.systemic_health.weightedTrend,
				price_cohesion: overview.systemic_health.priceCohesion,
				overview: overview,
			};
		});

		const result: IExchangeOverview[] = (
			await Promise.all(overviewPromises)
		).sort((a, b) => (a.material_ticker > b.material_ticker ? 1 : -1));

		dataOverview.value = result;
	}

	onMounted(async () => {
		await preloadMaterials().then(async () => await generateDataOverview());
		materialOptions.value = materialSelectOptions.value;

		fetch();
	});

	function materialOverviewData(): IExchangeOverview {
		const data = dataOverviewMap.value.get(selectedMaterial.value);

		if (!data) {
			console.error(`Missing data for ${selectedMaterial.value}`);
			return {} as IExchangeOverview;
		}

		return data;
	}

	function getTrendClass(value: number, reverse: boolean = false): string {
		const trend = Math.round(value);

		if (
			value === undefined ||
			value === null ||
			isNaN(trend) ||
			trend === 0
		) {
			return "";
		}

		const isPositive = trend > 0;
		const finalOutcome = reverse ? !isPositive : isPositive;
		return finalOutcome ? "text-positive" : "text-negative";
	}

	function switchChartFullscreen(): void {
		selectedChartFullscreen.value = !selectedChartFullscreen.value;
	}

	const chartFullscreenClass = computed(() =>
		!selectedChartFullscreen.value ? "xl:grid-cols-2" : ""
	);
</script>

<template>
	<WrapperGameDataLoader
		:key="`GAMEDATAWRAPPER#MarketExploration`"
		load-materials
		load-exchanges>
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
			<div v-if="dataOverview.length > 0" class="px-6 py-3">
				<div class="pb-3">
					<div class="flex gap-x-3 pb-3">
						<div class="w-[80px] my-auto">
							<div
								:class="getMaterialClass(selectedMaterial)"
								class="text-center text-nowrap p-2 px-4 text-2xl text-shadow-[0_1px_1px_rgb(34,34,34)]">
								{{ selectedMaterial }}
							</div>
						</div>
						<div class="grow">
							<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
								<div
									class="p-3 rounded border border-white/10 flex flex-col">
									<div class="pb-1 text-white/50">
										Universe VWAP 7D
									</div>
									<div class="text-3xl font-bold">
										{{
											formatNumber(
												materialOverviewData()
													.vwap_universe_7d
											)
										}}
										<span
											class="pl-1 font-light text-white/50">
											ȼ
										</span>
									</div>
									<div class="">
										<span
											:class="
												getTrendClass(
													materialOverviewData()
														.vwap_trend * 100
												)
											">
											{{
												formatNumber(
													materialOverviewData()
														.vwap_trend * 100,
													2,
													false,
													true
												)
											}}
											% Trend
										</span>
									</div>
								</div>
								<div
									class="p-3 rounded border border-white/10 flex flex-col">
									<div class="pb-1 text-white/50">
										Universe Traded Volume 7D
									</div>
									<div class="text-3xl font-bold">
										{{
											formatAmount(
												materialOverviewData().volume_7d
											)
										}}
									</div>
									<div class="text-white/50">
										30D:
										{{
											formatAmount(
												materialOverviewData()
													.volume_30d
											)
										}}
									</div>
								</div>
								<div
									class="p-3 rounded border border-white/10 flex flex-col">
									<div class="pb-1 text-white/50">
										Universe Market Delta
									</div>
									<div class="text-3xl font-bold">
										<span
											:class="
												getTrendClass(
													materialOverviewData()
														.delta_supply_demand_universe,
													true
												)
											">
											{{
												formatAmount(
													materialOverviewData()
														.delta_supply_demand_universe
												)
											}}
										</span>
									</div>
									<div
										class="text-white/50 flex flex-row justify-between">
										<div>
											Supply:
											{{
												formatAmount(
													materialOverviewData()
														.supply_universe
												)
											}}
										</div>
										<div>
											Demand:
											{{
												formatAmount(
													materialOverviewData()
														.demand_universe
												)
											}}
										</div>
									</div>
								</div>
								<div
									class="p-3 rounded border border-white/10 flex flex-col">
									<div class="pb-1 text-white/50">
										Weighted Trend
									</div>
									<div class="text-3xl font-bold">
										<span
											:class="
												getTrendClass(
													materialOverviewData()
														.weighted_trend * 100
												)
											">
											{{
												formatNumber(
													materialOverviewData()
														.weighted_trend * 100
												)
											}}
											<span class="pl-1 font-light">
												%
											</span>
										</span>
									</div>
									<div class="text-white/50">
										Volume-Adjusted Delta
									</div>
								</div>
								<div
									class="p-3 rounded border border-white/10 flex flex-col">
									<div class="pb-1 text-white/50">
										Price Cohesion
									</div>
									<div class="text-3xl font-bold">
										<span
											:class="
												getTrendClass(
													materialOverviewData()
														.price_cohesion
												)
											">
											{{
												formatNumber(
													materialOverviewData()
														.price_cohesion
												)
											}}
											<span class="pl-1 font-light">
												%
											</span>
										</span>
									</div>
									<div class="text-white/50">
										Variance Index
									</div>
								</div>
							</div>
						</div>
					</div>
					<div
						class="grid grid-cols-1 gap-3"
						:class="chartFullscreenClass">
						<div
							class="rounded border border-white/10 p-3 flex flex-col h-full min-h-[500px]">
							<div
								class="flex flex-row pb-3 child:my-auto flex-none">
								<h3 class="font-bold text-lg grow">
									Market Chart
								</h3>
								<div class="flex flex-row gap-3">
									<template
										v-for="option in exchangeOptions"
										:key="option.value">
										<PButton
											:type="
												option.value == selectedExchange
													? 'primary'
													: 'secondary'
											"
											@click="
												() => {
													if (
														option.value &&
														typeof option.value ===
															'string'
													) {
														selectedExchange =
															option.value;
														fetch();
													}
												}
											">
											{{ option.label }}
										</PButton>
									</template>
									<PButton @click="switchChartFullscreen">
										<template #icon>
											<OpenInFullSharp
												v-if="
													!selectedChartFullscreen
												" />
											<CloseFullscreenSharp v-else />
										</template>
									</PButton>
								</div>
							</div>
							<div
								if="!loading && !error && dataChart.length > 0"
								class="flex-grow min-h-0">
								<MarketExplorationChart
									:data="dataCandlestick" />
							</div>
						</div>
						<div class="p-3 rounded border border-white/10">
							<h3 class="font-bold text-lg pb-3">Market Data</h3>

							<MaterialCXOverviewTable
								:overview-data="materialOverviewData().overview"
								:ticker="selectedMaterial" />
						</div>
					</div>
				</div>

				<h3 class="font-bold text-lg pb-3">Material Market Overview</h3>

				<XNDataTable
					:data="dataOverview"
					striped
					virtual-scroll
					:max-height="800">
					<XNDataTableColumn
						key="material_ticker"
						title="Material"
						sorter="default">
						<template #render-cell="{ rowData }">
							<MaterialTile
								:key="rowData.material_ticker"
								:ticker="rowData.material_ticker" />
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn
						key="vwap_universe_7d"
						title="VWAP 7D"
						sorter="default">
						<template #render-cell="{ rowData }">
							{{ formatNumber(rowData.vwap_universe_7d) }}
							<span class="pl-1 font-light text-white/50">
								ȼ
							</span>
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn
						key="vwap_universe_30d"
						title="VWAP 30D"
						sorter="default">
						<template #render-cell="{ rowData }">
							{{ formatNumber(rowData.vwap_universe_30d) }}
							<span class="pl-1 font-light text-white/50">
								ȼ
							</span>
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn
						key="weighted_trend"
						title="Trend"
						sorter="default">
						<template #render-cell="{ rowData }">
							<span
								:class="
									getTrendClass(rowData.weighted_trend * 100)
								">
								{{ formatNumber(rowData.weighted_trend * 100) }}
								<span class="pl-1 font-light"> % </span>
							</span>
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn
						key="volume_7d"
						title="Volume 7D"
						sorter="default">
						<template #render-cell="{ rowData }">
							{{ formatAmount(rowData.volume_7d) }}
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn
						key="volume_30d"
						title="Volume 30D"
						sorter="default">
						<template #render-cell="{ rowData }">
							{{ formatAmount(rowData.volume_30d) }}
						</template>
					</XNDataTableColumn>
					<XNDataTableColumn key="explore" title="Details">
						<template #render-cell="{ rowData }">
							<PButton
								@click="
									() => {
										selectedMaterial =
											rowData.material_ticker;
										fetch();
									}
								">
								Explore
							</PButton>
						</template>
					</XNDataTableColumn>
				</XNDataTable>
			</div>
		</div>
	</WrapperGameDataLoader>
</template>
