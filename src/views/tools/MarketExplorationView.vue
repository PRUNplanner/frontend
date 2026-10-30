<script setup lang="ts">
	import { computed, onMounted, type Ref, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();
	import { useRoute } from "vue-router";
	const route = useRoute();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: t("market_exploration.view_title"),
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
	const { getMaterialExchangeOverview } = useExchangeData();

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import MarketExplorationChart from "@/ui/charts/MarketExplorationChart.vue";
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import MaterialExchangeTable from "@/features/material_tile/components/MaterialExchangeTable.vue";
	import MarketExplorationExchanges from "@/features/market_exploration/components/MarketExplorationExchanges.vue";
	import PSparkline from "@/ui/charts/PSparkline.vue";

	// Composables
	import { useMarketExplorationChart } from "@/features/market_exploration/useMarketExplorationChart";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { readStorage, writeStorage } from "@/lib/storage";

	// Types & Interfaces
	import type { PDataTableColumn, PSelectOption } from "@/ui/ui.types";
	import type { IMaterialExchangeOverview } from "@/database/services/useExchangeData.types";

	// UI
	import {
		PDataTable,
		PSelect,
		PButton,
		PButtonGroup,
		PTooltip,
		PValue,
	} from "@/ui";
	import { CloseFullscreenSharp, OpenInFullSharp } from "@vicons/material";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";
	import type {
		CandleInterval,
		ChartView,
		ExchangeMetric,
		ExchangeRange,
	} from "@/features/market_exploration/marketExploration.types";

	const exchangeOptions: Ref<PSelectOption[]> = ref(
		["AI1", "CI1", "IC1", "NC1"].map((e) => {
			return { label: e, value: e };
		})
	);

	const intervalOptions: Ref<PSelectOption[]> = ref(
		["daily", "weekly", "monthly"].map((e) => ({
			label: e,
			value: e,
		}))
	);

	const materialOptions = ref<PSelectOption[]>([]);

	const selectedExchange: Ref<string> = ref("AI1");
	const selectedMaterial: Ref<string> = ref("DW");
	const selectedChartFullscreen: Ref<boolean> = ref(false);

	const { fetchData, hasError, dataCandlestick, selectedInterval } =
		useMarketExplorationChart(selectedExchange, selectedMaterial);

	// the chart view is remembered for the session
	const CHART_VIEW_KEY = "market_exploration.chart_view";
	const chartView = ref<ChartView>(
		readStorage(CHART_VIEW_KEY, "session") === "exchanges"
			? "exchanges"
			: "candles"
	);
	function setChartView(view: ChartView): void {
		if (view !== chartView.value)
			trackEvent("market_exploration:view_change", { view });
		chartView.value = view;
		writeStorage(CHART_VIEW_KEY, view, "session");
	}
	const chartViews: ChartView[] = ["candles", "exchanges"];
	const exchangeMetrics: ExchangeMetric[] = ["vwap", "low", "high"];
	const exchangeRanges: ExchangeRange[] = [30, 90, 365, null];
	const exchangeMetric = ref<ExchangeMetric>("vwap");
	const exchangeRange = ref<ExchangeRange>(90);

	// 30 daily VWAPs per material of the overview's exchange (UNIVERSE, as
	// every overview column), one request
	const SPARKLINE_EXCHANGE = "UNIVERSE";
	const sparklines = ref<Record<string, (number | null)[]>>({});
	async function loadSparklines(): Promise<void> {
		try {
			const result = await useQuery("GetCXSparklines", {
				exchange: SPARKLINE_EXCHANGE,
			}).execute();
			sparklines.value = result.series;
		} catch {
			// the column stays empty, the numbers still show
		}
	}

	async function fetch(track = true): Promise<void> {
		const exchange = selectedExchange.value;
		const material_ticker = selectedMaterial.value;

		await fetchData();
		if (track && !hasError.value)
			trackEvent("tool:use", {
				tool_name: "market_exploration",
				exchange,
				material_ticker,
			});
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
		).sort((a, b) =>
			a.material_ticker < b.material_ticker
				? -1
				: a.material_ticker > b.material_ticker
					? 1
					: 0
		);

		dataOverview.value = result;
	}

	onMounted(loadSparklines);

	// runs once the loader has the game data, which on a first visit (empty
	// IndexedDB) is only after mount
	async function onGameDataLoaded(): Promise<void> {
		await preloadMaterials();
		// ?material=RAT, e.g. from a material tile, if it is a known ticker
		const wanted = route.query.material;
		if (materials.value?.some((m) => m.ticker === wanted))
			selectedMaterial.value = wanted as string;
		await generateDataOverview();
		materialOptions.value = materialSelectOptions.value;

		// the default material on page open is not a use of the tool
		fetch(false);
	}

	function materialOverviewData(): IExchangeOverview {
		const data = dataOverviewMap.value.get(selectedMaterial.value);

		if (!data) {
			if (import.meta.env.DEV)
				console.warn(`Missing data for ${selectedMaterial.value}`);
			return {} as IExchangeOverview;
		}

		return data;
	}

	function getTrendClass(value: number): string {
		const trend = Math.round(value);

		if (
			value === undefined ||
			value === null ||
			isNaN(trend) ||
			trend === 0
		) {
			return "";
		}

		return trend > 0 ? "text-positive" : "text-negative";
	}

	function switchChartFullscreen(): void {
		selectedChartFullscreen.value = !selectedChartFullscreen.value;
	}

	// side by side from 2xl: narrower, the market data table (up to nine
	// columns) would scroll
	const chartFullscreenClass = computed(() =>
		!selectedChartFullscreen.value ? "2xl:grid-cols-2" : ""
	);

	const overviewColumns = computed<PDataTableColumn<IExchangeOverview>[]>(
		() => {
			const sortable = (key: string, title: string) => ({
				key,
				title: t(`market_exploration.overview.table.${title}`),
				sorter: true as const,
			});
			return [
				sortable("material_ticker", "material"),
				sortable("vwap_universe_7d", "vwap_7d"),
				sortable("vwap_universe_30d", "vwap_30d"),
				{
					key: "sparkline",
					title: t("market_exploration.overview.table.sparkline"),
					// the 80px sparkline and the cell padding
					width: 100,
				},
				sortable("weighted_trend", "trend"),
				// the longest headers wrap (header slots), no fixed width
				sortable("volume_7d", "volume_7d"),
				sortable("volume_30d", "volume_30d"),
				{
					key: "explore",
					title: t("market_exploration.overview.table.details"),
				},
			];
		}
	);
</script>

<template>
	<WrapperGameDataLoader
		:key="`GAMEDATAWRAPPER#MarketExploration`"
		load-materials
		load-exchanges
		@complete="onGameDataLoaded">
		<div class="min-h-screen flex flex-col">
			<div
				class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap justify-between gap-3">
				<h1 class="text-2xl font-bold">
					{{ $t("market_exploration.title") }}
				</h1>
				<div>
					<div class="flex flex-row flex-wrap gap-3 child:my-auto">
						<div>
							{{ $t("market_exploration.switch_material") }}
						</div>
						<PSelect
							v-model:value="selectedMaterial"
							:aria-label="
								$t('market_exploration.switch_material')
							"
							searchable
							:options="materialOptions"
							class="w-30"
							@update:value="fetch()" />

						<HelpDrawer file-name="tools_market_exploration" />
					</div>
				</div>
			</div>
			<div v-if="dataOverview.length > 0" class="px-6 py-3">
				<div class="pb-3">
					<!-- Tiles size by the space they get (the sidebar may be open),
					     values never wrap between number and unit. -->
					<div class="@container pb-3">
						<div
							class="grid grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-3">
							<div class="flex items-center justify-center">
								<div
									:class="getMaterialClass(selectedMaterial)"
									class="text-center text-nowrap p-2 px-4 text-2xl text-shadow-[0_1px_1px_rgb(34,34,34)]">
									{{ selectedMaterial }}
								</div>
							</div>
							<div
								class="min-w-0 p-3 rounded border border-white/10 flex flex-col">
								<div class="pb-1 text-muted">
									{{
										$t(
											"market_exploration.kpis.universe_vwap_7d"
										)
									}}
								</div>
								<div
									class="text-xl @sm:text-2xl @7xl:text-3xl font-bold tabular-nums whitespace-nowrap">
									{{
										formatNumber(
											materialOverviewData()
												.vwap_universe_7d
										)
									}}
									<span class="pl-1 font-light text-muted">
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
										{{
											$t(
												"market_exploration.kpis.percent_trend"
											)
										}}
									</span>
								</div>
							</div>
							<div
								class="min-w-0 p-3 rounded border border-white/10 flex flex-col">
								<div class="pb-1 text-muted">
									{{
										$t(
											"market_exploration.kpis.universe_traded_7d"
										)
									}}
								</div>
								<div
									class="text-xl @sm:text-2xl @7xl:text-3xl font-bold tabular-nums whitespace-nowrap">
									{{
										formatAmount(
											materialOverviewData().volume_7d
										)
									}}
								</div>
								<div class="text-muted">
									{{ $t("market_exploration.kpis.30d") }}
									{{
										formatAmount(
											materialOverviewData().volume_30d
										)
									}}
								</div>
							</div>
							<div
								class="min-w-0 p-3 rounded border border-white/10 flex flex-col">
								<div class="pb-1 text-muted">
									{{
										$t(
											"market_exploration.kpis.universe_market_delta"
										)
									}}
								</div>
								<div
									class="flex flex-wrap items-baseline gap-x-2 text-xl @sm:text-2xl @7xl:text-3xl font-bold tabular-nums">
									<PValue
										class="whitespace-nowrap"
										:value="
											materialOverviewData()
												.delta_supply_demand_universe
										"
										:decimals="0" />
									<span
										v-if="
											materialOverviewData()
												.delta_supply_demand_universe !==
											0
										"
										class="text-lg font-normal text-muted">
										{{
											$t(
												materialOverviewData()
													.delta_supply_demand_universe <
													0
													? "market_exploration.kpis.shortage"
													: "market_exploration.kpis.surplus"
											)
										}}
									</span>
								</div>
								<div
									class="text-muted flex flex-row flex-wrap justify-between gap-x-3">
									<div class="whitespace-nowrap">
										{{
											$t("market_exploration.kpis.supply")
										}}
										{{
											formatAmount(
												materialOverviewData()
													.supply_universe
											)
										}}
									</div>
									<div class="whitespace-nowrap">
										{{
											$t("market_exploration.kpis.demand")
										}}
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
								class="min-w-0 p-3 rounded border border-white/10 flex flex-col">
								<div class="pb-1 text-muted">
									{{
										$t(
											"market_exploration.kpis.weighted_trend"
										)
									}}
								</div>
								<div
									class="text-xl @sm:text-2xl @7xl:text-3xl font-bold tabular-nums whitespace-nowrap">
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
										<span class="pl-1 font-light"> % </span>
									</span>
								</div>
								<div class="text-muted">
									{{
										$t(
											"market_exploration.kpis.volume_adjusted_delta"
										)
									}}
								</div>
							</div>
							<div
								class="min-w-0 p-3 rounded border border-white/10 flex flex-col">
								<div class="pb-1 text-muted">
									{{
										$t(
											"market_exploration.kpis.price_cohesion"
										)
									}}
								</div>
								<div
									class="text-xl @sm:text-2xl @7xl:text-3xl font-bold tabular-nums whitespace-nowrap">
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
										<span class="pl-1 font-light"> % </span>
									</span>
								</div>
								<div class="text-muted">
									{{
										$t(
											"market_exploration.kpis.variance_index"
										)
									}}
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
								class="flex flex-row flex-wrap gap-2 pb-3 child:my-auto flex-none">
								<h3 class="font-bold text-lg grow">
									{{ $t("market_exploration.chart.title") }}
								</h3>
								<div class="flex flex-row flex-wrap gap-2">
									<PButtonGroup
										role="group"
										:aria-label="
											$t(
												'market_exploration.chart.view.label'
											)
										">
										<PButton
											v-for="view in chartViews"
											:key="view"
											:pressed="chartView === view"
											@click="setChartView(view)">
											{{
												$t(
													`market_exploration.chart.view.${view}`
												)
											}}
										</PButton>
									</PButtonGroup>
									<template v-if="chartView === 'exchanges'">
										<PButtonGroup
											role="group"
											:aria-label="
												$t(
													'market_exploration.chart.metric.label'
												)
											">
											<PButton
												v-for="metric in exchangeMetrics"
												:key="metric"
												:pressed="
													exchangeMetric === metric
												"
												@click="
													exchangeMetric = metric
												">
												{{
													$t(
														`market_exploration.chart.metric.${metric}`
													)
												}}
											</PButton>
										</PButtonGroup>
										<PButtonGroup
											role="group"
											:aria-label="
												$t(
													'market_exploration.chart.range.label'
												)
											">
											<PButton
												v-for="range in exchangeRanges"
												:key="range ?? 'all'"
												:pressed="
													exchangeRange === range
												"
												@click="exchangeRange = range">
												{{
													$t(
														`market_exploration.chart.range.${range ?? "all"}`
													)
												}}
											</PButton>
										</PButtonGroup>
									</template>
									<template v-else>
										<div
											class="flex flex-row flex-wrap gap-1">
											<template
												v-for="option in exchangeOptions"
												:key="option.value">
												<PButton
													:pressed="
														option.value ==
														selectedExchange
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
										</div>
										<div
											class="flex flex-row flex-wrap gap-1">
											<template
												v-for="option in intervalOptions"
												:key="option.value">
												<PButton
													:pressed="
														option.value ==
														selectedInterval
													"
													@click="
														() => {
															if (
																option.value &&
																typeof option.value ===
																	'string'
															) {
																selectedInterval =
																	option.value as CandleInterval;
																fetch();
															}
														}
													">
													{{
														$t(
															`market_exploration.chart.intervals.${option.label}`
														)
													}}
												</PButton>
											</template>
										</div>
									</template>
									<PButton
										:aria-label="
											$t('common.buttons.fullscreen')
										"
										@click="switchChartFullscreen">
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
							<div class="flex-grow min-h-0">
								<MarketExplorationExchanges
									v-if="chartView === 'exchanges'"
									class="h-[420px] md:h-[560px]"
									:material-ticker="selectedMaterial"
									:metric="exchangeMetric"
									:range="exchangeRange" />
								<MarketExplorationChart
									v-else
									:data="dataCandlestick" />
							</div>
						</div>
						<div class="p-3 rounded border border-white/10">
							<h3 class="font-bold text-lg pb-3">
								{{ $t("market_exploration.market_data.title") }}
							</h3>

							<MaterialExchangeTable
								v-if="materialOverviewData().overview"
								:overview="materialOverviewData().overview" />
						</div>
					</div>
				</div>

				<h3 class="font-bold text-lg pb-3">
					{{ $t("market_exploration.overview.title") }}
				</h3>

				<PDataTable
					:columns="overviewColumns"
					:data="dataOverview"
					striped
					:max-height="800"
					:min-width="860"
					virtual
					sticky-first>
					<template
						v-for="col in overviewColumns.filter((c) => c.sorter)"
						:key="col.key"
						#[`header-${col.key}`]>
						<span class="whitespace-normal">{{ col.title }}</span>
					</template>
					<template #cell-material_ticker="{ row }">
						<MaterialTile
							:key="row.material_ticker"
							:ticker="row.material_ticker" />
					</template>
					<template #cell-vwap_universe_7d="{ row }">
						{{ formatNumber(row.vwap_universe_7d) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</template>
					<template #cell-vwap_universe_30d="{ row }">
						{{ formatNumber(row.vwap_universe_30d) }}
						<span class="pl-1 font-light text-muted"> ȼ </span>
					</template>
					<template #header-sparkline>
						<PTooltip>
							<template #trigger>
								<span class="hover:cursor-help">
									{{
										t(
											"market_exploration.overview.table.sparkline"
										)
									}}
								</span>
							</template>
							{{
								t(
									"market_exploration.overview.table.sparkline_hint"
								)
							}}
						</PTooltip>
					</template>
					<template #cell-sparkline="{ row }">
						<PSparkline
							v-if="sparklines[row.material_ticker]"
							:width="80"
							:points="sparklines[row.material_ticker]"
							:trend="row.weighted_trend * 100"
							:label="
								t(
									'market_exploration.overview.table.sparkline_label',
									{ ticker: row.material_ticker }
								)
							" />
					</template>
					<template #cell-weighted_trend="{ row }">
						<span :class="getTrendClass(row.weighted_trend * 100)">
							{{ formatNumber(row.weighted_trend * 100) }}
							<span class="pl-1 font-light"> % </span>
						</span>
					</template>
					<template #cell-volume_7d="{ row }">
						{{ formatAmount(row.volume_7d) }}
					</template>
					<template #cell-volume_30d="{ row }">
						{{ formatAmount(row.volume_30d) }}
					</template>
					<template #cell-explore="{ row }">
						<PButton
							@click="
								() => {
									selectedMaterial = row.material_ticker;
									fetch();
								}
							">
							{{ t("market_exploration.overview.table.explore") }}
						</PButton>
					</template>
				</PDataTable>
			</div>
		</div>
	</WrapperGameDataLoader>
</template>
