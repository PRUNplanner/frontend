<script setup lang="ts">
	import {
		computed,
		defineAsyncComponent,
		onBeforeUnmount,
		ref,
		type Ref,
	} from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";
	import { profitHistory } from "@/features/base_roi/baseROIHistory";
	import { planetPlots } from "@/features/planet_search/planetPlots.util";
	import { recipeLabel } from "@/features/base_roi/baseROIDetail.util";

	// Static
	import {
		BASE_ROI_COLUMNS,
		WORKFORCE_SHORT,
	} from "@/features/base_roi/baseROI.constants";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import PlanetPlots from "@/features/planet_search/components/PlanetPlots.vue";
	import BaseROIColumnsMenu from "@/features/base_roi/components/BaseROIColumnsMenu.vue";
	import BaseROITableSkeleton from "@/features/base_roi/components/BaseROITableSkeleton.vue";
	import BaseROICellMath from "@/features/base_roi/components/BaseROICellMath.vue";
	import PSparkline from "@/ui/charts/PSparkline.vue";
	const BaseROIRowDetail = defineAsyncComponent(
		() => import("@/features/base_roi/components/BaseROIRowDetail.vue")
	);

	// Types & Interfaces
	import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
	import type {
		BaseROIStep,
		IBaseROIHidden,
		IBaseROIStaffing,
		IBaseROIRow,
		IBaseROISeries,
	} from "@/features/base_roi/baseROI.types";
	import type { PDataTableColumn, PSelectOption } from "@/ui/ui.types";

	// UI
	import {
		PDataTable,
		PInput,
		PPopover,
		PProgressBar,
		PSelect,
		PTooltip,
	} from "@/ui";
	import { SearchSharp, WarningAmberSharp } from "@vicons/material";

	const settings = defineModel<BaseROISettings>("settings", {
		required: true,
	});
	/** filters the rows by industry, building or product, in the page */
	const search = defineModel<string>("search", { required: true });

	const {
		rows,
		hidden,
		step,
		progress,
		firstLoad,
		planetRowsPending,
		series,
		historyFailed,
		staffing,
		populationFailed,
		active = null,
		tryOnPlanet,
		cxUuid,
	} = defineProps<{
		/** filtered and sorted */
		rows: IBaseROIRow[];
		hidden: IBaseROIHidden;
		step: BaseROIStep;
		progress: { current: number; total: number };
		firstLoad: boolean;
		planetRowsPending: boolean;
		series: IBaseROISeries | null;
		historyFailed: boolean;
		/** checked planet rows by key, empty until the reports are in */
		staffing: Map<string, IBaseROIStaffing>;
		populationFailed: boolean;
		/** row key hovered in the chart */
		active?: string | null;
		tryOnPlanet: (row: IBaseROIRow, planet: string) => Promise<IBaseROIRow>;
		cxUuid: string | undefined;
	}>();

	const expanded = ref<(string | number)[]>([]);

	const hiddenColumns = computed({
		get: () => settings.value.hiddenColumns,
		set: (v) => (settings.value = { ...settings.value, hiddenColumns: v }),
	});

	const capacityOptions = computed<PSelectOption[]>(() =>
		Array.from({ length: 11 }, (_, i) => ({
			label: t("base_roi.settings.bases", { n: (i / 10).toFixed(1) }),
			value: i / 10,
		}))
	);

	const atExperts = computed(() =>
		settings.value.experts === "ramp"
			? t("base_roi.table.at_experts", { n: 5 })
			: t("base_roi.table.at_experts", { n: settings.value.experts })
	);

	type Column = PDataTableColumn<IBaseROIRow>;
	const by =
		(value: (r: IBaseROIRow) => number) =>
		(a: IBaseROIRow, b: IBaseROIRow) => {
			const x = value(a);
			const y = value(b);
			// never (Infinity) and missing values last when ascending
			if (x === y) return 0;
			if (!Number.isFinite(x)) return 1;
			if (!Number.isFinite(y)) return -1;
			return x - y;
		};
	const sorters: Partial<Record<string, Column["sorter"]>> = {
		expertise: (a, b) =>
			(a.expertise ?? "").localeCompare(b.expertise ?? "") ||
			a.building.localeCompare(b.building),
		daily_profit: by((r) => r.metrics.dailyProfit),
		break_even: by((r) => r.metrics.breakEven),
		weekly_return: by((r) => r.metrics.weeklyReturn),
		building_cost: by((r) => r.metrics.buildingCost),
		running_cost: by((r) => r.metrics.runningCost),
		cargo: by((r) => r.metrics.cargo),
		market_capacity: by((r) => r.metrics.marketCapacity),
		plots: by((r) => planetPlots(r.plots)?.free ?? -1),
	};
	// a pinned Product column would leave a phone 54 px for the numbers
	const wideQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(min-width: 640px)")
			: null;
	const isPhone: Ref<boolean> = ref(!(wideQuery?.matches ?? true));
	const onMedia = (e: MediaQueryListEvent) => (isPhone.value = !e.matches);
	wideQuery?.addEventListener("change", onMedia);
	onBeforeUnmount(() => wideQuery?.removeEventListener("change", onMedia));

	const left = ["expertise", "plots", "workforce", "history"];
	// every column its width; wider than the page, the table scrolls sideways
	const WIDTHS: Record<string, number> = {
		product: 230,
		expertise: 130,
		daily_profit: 150,
		break_even: 120,
		weekly_return: 120,
		building_cost: 130,
		running_cost: 170,
		cargo: 120,
		market_capacity: 130,
		plots: 110,
		workforce: 140,
		history: 130,
	};

	const columns = computed<Column[]>(() => [
		{
			key: "product",
			title: t("base_roi.columns.product"),
			titleTooltip: t("base_roi.tooltips.product"),
			width: WIDTHS.product,
		},
		...BASE_ROI_COLUMNS.filter((c) => !hiddenColumns.value.includes(c)).map(
			(c): Column => ({
				key: c,
				title: t(`base_roi.columns.${c}`),
				titleTooltip: t(`base_roi.tooltips.${c}`),
				align: left.includes(c) ? "left" : "right",
				width: WIDTHS[c],
				sorter: sorters[c],
				defaultSortOrder: c === "break_even" ? "ascend" : undefined,
			})
		),
	]);
	const titles = computed(() => columns.value.map((c) => c.title!));
	// expand button + every column
	const tableWidth = computed(() =>
		columns.value.reduce((w, c) => w + WIDTHS[c.key], 48)
	);

	const rowKey = (row: IBaseROIRow) => row.key;
	const rowClass = (row: IBaseROIRow) =>
		row.key === active ? "!bg-white/10" : "";

	const statusText = computed(() => {
		const { current, total } = progress;
		switch (step) {
			case "game":
				return t("base_roi.status.game");
			case "recipes":
				return t("base_roi.status.recipes", { current, total });
			case "planets":
				return t("base_roi.status.planets", {
					n: settings.value.maxJumps,
				});
			case "calculating":
				return t("base_roi.status.calculating", { current, total });
			case "error":
				return t("base_roi.status.error");
			default:
				return "";
		}
	});
	const busy = computed(
		() => step !== "done" && step !== "idle" && step !== "error"
	);
	const totalHidden = computed(
		() =>
			hidden.maxJumps +
			hidden.logistics +
			hidden.marketCapacity +
			hidden.noPlots +
			hidden.unstaffed +
			hidden.negative
	);
	const showSkeleton = computed(
		() => firstLoad && !rows.length && busy.value
	);

	const histories = computed(() => {
		const map = new Map<string, number[]>();
		if (!series) return map;
		for (const row of rows)
			map.set(row.key, profitHistory(row, series).profit);
		return map;
	});
	function trend(points: number[]): number {
		const first = points[0];
		const last = points[points.length - 1];
		return first ? ((last - first) / Math.abs(first)) * 100 : 0;
	}

	const days = (n: number) =>
		Number.isFinite(n) ? formatNumber(n, 1) : t("base_roi.table.never");
	const planetLine = (row: IBaseROIRow) =>
		`@ ${row.planetName ?? row.planetNaturalId} · ${
			row.jumps === null
				? t("base_roi.table.no_route")
				: t("base_roi.table.jumps", { n: row.jumps }, row.jumps)
		}`;
	// the product cell's tooltip: planet rows name their building too
	const recipeText = (row: IBaseROIRow) =>
		row.planetNaturalId
			? `${row.building} · ${recipeLabel(row)}`
			: recipeLabel(row);
	const industry = (row: IBaseROIRow) =>
		row.expertise ? t(`base_roi.industry.${row.expertise}`) : "—";
	// under the workforce: why this planet can't staff the base
	const staffingNotes = (row: IBaseROIRow): string[] => {
		const s = staffing.get(row.key);
		if (!s) return [];
		if (!s.hasReport) return [t("base_roi.table.no_population")];
		return s.gaps.map((g) =>
			t("base_roi.table.workforce_free", {
				free: formatNumber(g.available, 0),
				tier: WORKFORCE_SHORT[g.tier],
			})
		);
	};
	const workforceText = (row: IBaseROIRow) =>
		row.workforce
			.map(
				(w) =>
					`${formatNumber(w.required, 0)} ${WORKFORCE_SHORT[w.tier]}`
			)
			.join(" · ");
</script>

<template>
	<div class="flex flex-col gap-2">
		<div
			class="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 min-h-8">
			<div class="flex flex-col min-w-0 grow" aria-live="polite">
				<p v-if="!showSkeleton" class="text-sm">
					<span class="font-bold">
						{{
							t(
								"base_roi.table.rows",
								{ n: rows.length },
								rows.length
							)
						}}
					</span>
					<span v-if="!planetRowsPending && totalHidden">
						·
						<span class="font-bold">
							{{
								t("base_roi.table.hidden", {
									n: formatNumber(totalHidden, 0),
								})
							}}
						</span>
						{{
							[
								t("base_roi.table.hidden_jumps", {
									n: formatNumber(hidden.maxJumps, 0),
								}),
								t("base_roi.table.hidden_logistics", {
									n: formatNumber(hidden.logistics, 0),
								}),
								t("base_roi.table.hidden_market", {
									n: formatNumber(hidden.marketCapacity, 0),
								}),
								...(settings.showUnbuildable
									? []
									: [
											t(
												"base_roi.table.hidden_no_plots",
												{
													n: formatNumber(
														hidden.noPlots,
														0
													),
												}
											),
											t(
												"base_roi.table.hidden_unstaffed",
												{
													n: formatNumber(
														hidden.unstaffed,
														0
													),
												}
											),
										]),
								...(settings.showNegative
									? []
									: [
											t(
												"base_roi.table.hidden_negative",
												{
													n: formatNumber(
														hidden.negative,
														0
													),
												}
											),
										]),
							].join(" · ")
						}}
					</span>
				</p>
				<p
					v-if="populationFailed"
					class="text-sm text-warning"
					role="status">
					{{ t("base_roi.table.population_failed") }}
				</p>
				<p
					v-if="step === 'error'"
					class="text-sm text-negative"
					role="alert">
					{{ statusText }}
				</p>
				<div
					v-else-if="busy || planetRowsPending"
					class="flex flex-row items-center gap-3 text-xs text-muted">
					<span>
						{{
							planetRowsPending && !busy
								? t("base_roi.status.planet_rows")
								: statusText
						}}
					</span>
					<PProgressBar
						v-if="progress.total"
						class="w-48"
						:step="progress.current"
						:total="progress.total" />
				</div>
			</div>
		</div>
		<div class="flex flex-row flex-wrap items-center gap-2">
			<PInput
				v-model:value="search"
				class="w-full sm:w-96"
				:aria-label="t('base_roi.table.search')"
				:placeholder="t('base_roi.table.search')">
				<template #prefix><SearchSharp class="w-4 h-4" /></template>
			</PInput>
			<label class="flex flex-row items-center gap-2">
				<span class="text-sm text-muted whitespace-nowrap">
					{{ t("base_roi.settings.min_market_capacity") }}
				</span>
				<PSelect
					class="w-32"
					:aria-label="t('base_roi.settings.min_market_capacity')"
					:value="settings.minMarketCapacity"
					:options="capacityOptions"
					@update:value="
						(v) =>
							(settings = {
								...settings,
								minMarketCapacity: v as number,
							})
					" />
			</label>
			<BaseROIColumnsMenu
				v-model:hidden-columns="hiddenColumns"
				class="ml-auto" />
		</div>

		<!-- part of the page: it grows with its rows, the page scrolls -->
		<div class="flex flex-col">
			<BaseROITableSkeleton v-if="showSkeleton" :titles="titles" />
			<template v-else>
				<PDataTable
					v-model:expanded-row-keys="expanded"
					:columns="columns"
					:data="rows"
					:row-key="rowKey"
					:row-class="rowClass"
					:aria-label="t('base_roi.table.label')"
					:expand-label="
						(row) =>
							t('base_roi.table.details', {
								name:
									row.outputs
										.map((o) => o.ticker)
										.join(', ') || row.building,
							})
					"
					striped
					:sticky-first="!isPhone"
					dense
					:min-width="tableWidth"
					:page-size="50"
					pagination-top>
					<template #header-daily_profit>
						<span class="flex flex-col leading-tight">
							{{ t("base_roi.columns.daily_profit") }}
							<span class="text-xs font-normal text-muted">{{
								atExperts
							}}</span>
						</span>
					</template>
					<template #header-break_even>
						<span class="flex flex-col leading-tight">
							{{ t("base_roi.columns.break_even") }}
							<span
								v-if="settings.experts === 'ramp'"
								class="text-xs font-normal text-muted">
								{{ t("base_roi.table.from_zero") }}
							</span>
						</span>
					</template>
					<template
						v-for="c in [
							'expertise',
							'weekly_return',
							'building_cost',
							'running_cost',
							'cargo',
							'market_capacity',
							'plots',
							'workforce',
						]"
						:key="c"
						#[`header-${c}`]>
						<span class="whitespace-normal">{{
							t(`base_roi.columns.${c}`)
						}}</span>
					</template>

					<template #cell-product="{ row }">
						<div class="flex flex-row items-center gap-2 min-w-0">
							<div class="flex flex-row gap-1 shrink-0">
								<MaterialTile
									v-for="o in row.outputs.slice(0, 3)"
									:key="o.ticker"
									:ticker="o.ticker" />
							</div>
							<div class="flex flex-col min-w-0 flex-1">
								<span
									class="flex flex-row items-center gap-1.5 whitespace-nowrap min-w-0">
									<!-- the recipe on hover, not on the tiles (their market card) -->
									<div class="min-w-0">
										<PTooltip no-focus placement="top">
											<template #trigger>
												<span
													class="flex flex-row items-center gap-1.5 min-w-0">
													<span
														v-if="
															row.planetNaturalId
														"
														class="font-bold truncate">
														{{ planetLine(row) }}
													</span>
													<span
														v-else
														class="font-bold">
														{{ row.building }}
													</span>
												</span>
											</template>
											<span
												data-recipe
												class="font-mono text-xs">
												{{ recipeText(row) }}
											</span>
										</PTooltip>
									</div>
									<PPopover
										v-if="row.metrics.scenarios.length"
										placement="bottom-start">
										<template #trigger>
											<button
												type="button"
												class="inline-flex items-center gap-0.5 rounded border border-warning/60 px-1 text-xs text-warning"
												:aria-label="
													t(
														'base_roi.table.volatility',
														{
															n: row.metrics
																.scenarios
																.length,
														},
														row.metrics.scenarios
															.length
													)
												">
												<WarningAmberSharp
													class="size-3.5" />
												{{
													row.metrics.scenarios.length
												}}
											</button>
										</template>
										<div
											class="flex flex-col gap-1 max-w-80 text-sm">
											<p class="font-bold">
												{{
													t(
														"base_roi.table.volatility_title"
													)
												}}
											</p>
											<ul
												class="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
												<li
													v-for="(s, i) in row.metrics
														.scenarios"
													:key="i"
													class="flex flex-row justify-between gap-3">
													<span>
														{{
															s.prices
																.map(
																	(p) =>
																		`${p.ticker} (${t(`base_roi.table.${p.side}`)} ${formatNumber(p.price)})`
																)
																.join(", ")
														}}
													</span>
													<span
														class="font-mono"
														:class="
															s.dailyProfit > 0
																? 'text-positive'
																: 'text-negative'
														">
														{{
															formatNumber(
																s.dailyProfit,
																0
															)
														}}
													</span>
												</li>
											</ul>
										</div>
									</PPopover>
								</span>
							</div>
						</div>
					</template>
					<template #cell-expertise="{ row }">
						<span class="block truncate" :title="industry(row)">
							{{ industry(row) }}
						</span>
					</template>
					<template #cell-daily_profit="{ row }">
						<BaseROICellMath
							:row="row"
							column="daily_profit"
							:settings="settings">
							<span
								class="block text-right font-mono whitespace-nowrap"
								:class="
									row.metrics.dailyProfit > 0
										? ''
										: 'text-negative'
								">
								{{ formatNumber(row.metrics.dailyProfit, 0) }}
							</span>
						</BaseROICellMath>
					</template>
					<template #cell-break_even="{ row }">
						<BaseROICellMath
							:row="row"
							column="break_even"
							:settings="settings">
							<span class="font-bold font-mono">{{
								days(row.metrics.breakEven)
							}}</span>
						</BaseROICellMath>
					</template>
					<template #cell-weekly_return="{ row }">
						<BaseROICellMath
							:row="row"
							column="weekly_return"
							:settings="settings">
							<span class="font-mono whitespace-nowrap">
								{{
									formatPercent(
										row.metrics.weeklyReturn * 100,
										1
									)
								}}
							</span>
						</BaseROICellMath>
					</template>
					<template #cell-building_cost="{ row }">
						<BaseROICellMath
							:row="row"
							column="building_cost"
							:settings="settings">
							<span class="font-mono">{{
								formatNumber(row.metrics.buildingCost, 0)
							}}</span>
						</BaseROICellMath>
					</template>
					<template #cell-running_cost="{ row }">
						<BaseROICellMath
							:row="row"
							column="running_cost"
							:settings="settings">
							<span class="font-mono">{{
								formatNumber(row.metrics.runningCost, 0)
							}}</span>
						</BaseROICellMath>
					</template>
					<template #cell-cargo="{ row }">
						<BaseROICellMath
							:row="row"
							column="cargo"
							:settings="settings">
							<span
								class="flex flex-col items-end leading-tight font-mono whitespace-nowrap">
								<span
									>{{
										formatNumber(
											Math.max(
												row.weightIn,
												row.weightOut
											),
											1
										)
									}}
									t</span
								>
								<span class="text-xs text-muted">
									{{
										formatNumber(
											Math.max(
												row.volumeIn,
												row.volumeOut
											),
											1
										)
									}}
									m³
								</span>
							</span>
						</BaseROICellMath>
					</template>
					<template #cell-market_capacity="{ row }">
						<BaseROICellMath
							:row="row"
							column="market_capacity"
							:settings="settings">
							<span
								class="font-mono"
								:class="
									row.metrics.marketCapacity < 1
										? 'text-warning'
										: ''
								">
								{{
									formatNumber(row.metrics.marketCapacity, 2)
								}}
								<abbr
									v-if="row.metrics.capacitySide"
									class="text-xs text-muted no-underline"
									:title="
										t(
											`base_roi.table.side_${row.metrics.capacitySide}_title`
										)
									"
									>({{
										t(
											`base_roi.table.side_${row.metrics.capacitySide}`
										)
									}})</abbr
								>
							</span>
						</BaseROICellMath>
					</template>
					<template #cell-plots="{ row }">
						<PlanetPlots
							v-if="row.planetNaturalId"
							:planet="row.plots" />
						<span v-else class="text-muted">—</span>
					</template>
					<template #cell-workforce="{ row }">
						<span
							class="block truncate text-xs"
							:title="workforceText(row)">
							{{ workforceText(row) }}
						</span>
						<span
							v-if="staffingNotes(row).length"
							class="block truncate text-xs text-warning"
							:title="staffingNotes(row).join(' · ')">
							{{ staffingNotes(row).join(" · ") }}
						</span>
					</template>
					<template #cell-history="{ row }">
						<span
							v-if="historyFailed"
							class="block h-6 w-[100px]"
							:title="t('base_roi.table.history_failed')" />
						<span
							v-else-if="!histories.get(row.key)"
							aria-busy="true"
							data-skeleton
							class="block h-6 w-[100px] rounded bg-white/5 motion-safe:animate-pulse" />
						<PSparkline
							v-else
							:points="histories.get(row.key)!"
							:trend="trend(histories.get(row.key)!)"
							:label="t('base_roi.table.history_label')" />
					</template>

					<template #expand="{ row }">
						<BaseROIRowDetail
							v-model:settings="settings"
							:row="row"
							:series="series"
							:try-on-planet="tryOnPlanet"
							:cx-uuid="cxUuid"
							@close="
								expanded = expanded.filter((k) => k !== row.key)
							" />
					</template>
					<template #empty>
						<p class="py-6 text-center text-muted">
							{{ t("base_roi.table.empty") }}
						</p>
					</template>
				</PDataTable>
				<BaseROITableSkeleton
					v-if="planetRowsPending"
					:titles="titles"
					:header="false" />
			</template>
		</div>
	</div>
</template>
