<script setup lang="ts">
	import { computed, defineAsyncComponent, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { formatNumber, formatPercent } from "@/util/numbers";
	import { capitalizeString } from "@/util/text";
	import { profitHistory } from "@/features/base_roi/baseROIHistory";
	import { recipeLabel } from "@/features/base_roi/baseROIDetail.util";

	// Static
	import {
		BASE_ROI_COLUMNS,
		WORKFORCE_SHORT,
	} from "@/features/base_roi/baseROI.constants";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import BaseROIColumnsMenu from "@/features/base_roi/components/BaseROIColumnsMenu.vue";
	import BaseROITableSkeleton from "@/features/base_roi/components/BaseROITableSkeleton.vue";
	import PSparkline from "@/ui/charts/PSparkline.vue";
	import PInlineBar from "@/ui/charts/PInlineBar.vue";
	const BaseROIRowDetail = defineAsyncComponent(
		() => import("@/features/base_roi/components/BaseROIRowDetail.vue")
	);

	// Types & Interfaces
	import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";
	import type {
		BaseROIStep,
		IBaseROIHidden,
		IBaseROIRow,
		IBaseROISeries,
	} from "@/features/base_roi/baseROI.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable, PPopover, PProgressBar, PTag } from "@/ui";
	import { WarningAmberSharp } from "@vicons/material";

	const settings = defineModel<BaseROISettings>("settings", {
		required: true,
	});

	const {
		rows,
		hidden,
		step,
		progress,
		firstLoad,
		planetRowsPending,
		series,
		historyFailed,
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

	const atExperts = computed(() =>
		settings.value.experts === "ramp"
			? t("base_roi.table.at_experts", { n: 5 })
			: t("base_roi.table.at_experts", { n: settings.value.experts })
	);

	type Column = PDataTableColumn<IBaseROIRow>;
	const by =
		(value: (r: IBaseROIRow) => number) => (a: IBaseROIRow, b: IBaseROIRow) => {
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
	};
	const left = ["expertise", "workforce", "history"];
	// a fixed layout (the table scrolls in its box): every column its width
	const WIDTHS: Record<string, number> = {
		product: 280,
		expertise: 210,
		daily_profit: 150,
		break_even: 140,
		weekly_return: 120,
		building_cost: 140,
		running_cost: 170,
		cargo: 110,
		market_capacity: 140,
		workforce: 170,
		history: 130,
	};

	const columns = computed<Column[]>(() => [
		{
			key: "product",
			title: t("base_roi.columns.product"),
			width: WIDTHS.product,
		},
		...BASE_ROI_COLUMNS.filter((c) => !hiddenColumns.value.includes(c)).map(
			(c): Column => ({
				key: c,
				title: t(`base_roi.columns.${c}`),
				align: left.includes(c) ? "left" : "right",
				width: WIDTHS[c],
				sorter: sorters[c],
				defaultSortOrder: c === "break_even" ? "ascend" : undefined,
			})
		),
	]);
	const titles = computed(() =>
		columns.value.map((c) => c.title ?? c.key)
	);
	// expand button + every column
	const tableWidth = computed(() =>
		columns.value.reduce((w, c) => w + (WIDTHS[c.key] ?? 120), 48)
	);

	const maxProfit = computed(() =>
		Math.max(0, ...rows.map((r) => r.metrics.dailyProfit))
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
			hidden.negative
	);
	const showSkeleton = computed(() => firstLoad && !rows.length && busy.value);

	const histories = computed(() => {
		const map = new Map<string, number[]>();
		if (!series) return map;
		for (const row of rows)
			map.set(
				row.key,
				profitHistory(row.materials, row.degradation, series).profit
			);
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
		`@ ${row.planetName ?? row.planetNaturalId} (${
			row.jumps ?? t("base_roi.table.no_route")
		})`;
	const expertise = (row: IBaseROIRow) =>
		row.expertise ? capitalizeString(row.expertise) : "—";
	const workforceText = (row: IBaseROIRow) =>
		row.workforce
			.map((w) => `${formatNumber(w.required, 0)} ${WORKFORCE_SHORT[w.tier]}`)
			.join(" · ");
	const kindType = { resource: "primary", farming: "success", recipe: "secondary" } as const;
</script>

<template>
	<div class="flex flex-col gap-2">
		<div
			class="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 min-h-8">
			<div class="flex flex-col min-w-0 grow" aria-live="polite">
				<p v-if="!showSkeleton" class="text-sm">
					<span class="font-bold">
						{{ t("base_roi.table.rows", { n: rows.length }, rows.length) }}
					</span>
					<template v-if="!planetRowsPending && totalHidden">
						·
						<span class="font-bold">
							{{ t("base_roi.table.hidden", { n: formatNumber(totalHidden, 0) }) }}
						</span>
						{{
							[
								t("base_roi.table.hidden_jumps", { n: formatNumber(hidden.maxJumps, 0) }),
								t("base_roi.table.hidden_logistics", { n: formatNumber(hidden.logistics, 0) }),
								t("base_roi.table.hidden_market", { n: formatNumber(hidden.marketCapacity, 0) }),
								...(settings.showNegative
									? []
									: [t("base_roi.table.hidden_negative", { n: formatNumber(hidden.negative, 0) })]),
							].join(" · ")
						}}
					</template>
				</p>
				<p v-if="step === 'error'" class="text-sm text-negative" role="alert">
					{{ statusText }}
				</p>
				<div
					v-else-if="busy || planetRowsPending"
					class="flex flex-row items-center gap-3 text-xs text-muted">
					<span>
						{{ planetRowsPending && !busy ? t("base_roi.status.planet_rows") : statusText }}
					</span>
					<PProgressBar
						v-if="progress.total"
						class="w-48"
						:step="progress.current"
						:total="progress.total" />
				</div>
			</div>
			<BaseROIColumnsMenu v-model:hidden-columns="hiddenColumns" />
		</div>

		<!-- one box at its final size from the first paint, it scrolls inside -->
		<div class="h-[70vh] min-h-96 flex flex-col">
			<BaseROITableSkeleton v-if="showSkeleton" :titles="titles" />
			<template v-else>
				<PDataTable
					v-model:expanded-row-keys="expanded"
					:class="planetRowsPending ? 'shrink-0 max-h-[60%]' : ''"
					:columns="columns"
					:data="rows"
					:row-key="rowKey"
					:row-class="rowClass"
					:aria-label="t('base_roi.table.label')"
					:expand-label="(row) => t('base_roi.table.details', { name: row.outputs.map((o) => o.ticker).join(', ') || row.building })"
					fill
					striped
					sticky-first
					dense
					:min-width="tableWidth"
					:page-size="50">
					<template #header-daily_profit>
						<span class="flex flex-col leading-tight">
							{{ t("base_roi.columns.daily_profit") }}
							<span class="text-xs font-normal text-muted">{{ atExperts }}</span>
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
						v-for="c in ['expertise', 'weekly_return', 'building_cost', 'running_cost', 'cargo', 'market_capacity', 'workforce']"
						:key="c"
						#[`header-${c}`]>
						<span class="whitespace-normal">{{ t(`base_roi.columns.${c}`) }}</span>
					</template>
					<template #header-history>
						<span :title="t('base_roi.table.history_tooltip')">
							{{ t("base_roi.columns.history") }}
						</span>
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
								<span class="flex flex-row items-center gap-1.5 whitespace-nowrap min-w-0">
									<span v-if="row.planetNaturalId" class="font-bold truncate">
										{{ planetLine(row) }}
									</span>
									<span v-else class="font-bold">{{ row.building }}</span>
									<PTag
										v-if="row.kind !== 'recipe'"
										size="sm"
										:type="kindType[row.kind]"
										:value="t(`base_roi.table.${row.kind}`)" />
									<PPopover v-if="row.metrics.scenarios.length" placement="bottom-start">
										<template #trigger>
											<button
												type="button"
												class="inline-flex items-center gap-0.5 rounded border border-warning/60 px-1 text-xs text-warning"
												:aria-label="t('base_roi.table.volatility', { n: row.metrics.scenarios.length }, row.metrics.scenarios.length)">
												<WarningAmberSharp class="size-3.5" />
												{{ row.metrics.scenarios.length }}
											</button>
										</template>
										<div class="flex flex-col gap-1 max-w-80 text-sm">
											<p class="font-bold">{{ t("base_roi.table.volatility_title") }}</p>
											<ul class="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
												<li
													v-for="(s, i) in row.metrics.scenarios"
													:key="i"
													class="flex flex-row justify-between gap-3">
													<span>
														{{ s.prices.map((p) => `${p.ticker} (${t(`base_roi.table.${p.side}`)} ${formatNumber(p.price)})`).join(", ") }}
													</span>
													<span class="font-mono" :class="s.dailyProfit > 0 ? 'text-positive' : 'text-negative'">
														{{ formatNumber(s.dailyProfit, 0) }}
													</span>
												</li>
											</ul>
										</div>
									</PPopover>
								</span>
								<span class="text-xs text-muted truncate">
									{{ row.planetNaturalId ? `${row.building} · ` : "" }}{{ recipeLabel(row) }}
								</span>
							</div>
						</div>
					</template>
					<template #cell-expertise="{ row }">
						<span class="block truncate" :title="`${expertise(row)} ${row.building}`">
							{{ expertise(row) }}
							<span class="text-muted">{{ row.building }}</span>
						</span>
					</template>
					<template #cell-daily_profit="{ row }">
						<div class="flex items-center justify-end gap-2">
							<PInlineBar
								class="w-8 shrink-0"
								tone="positive"
								:value="Math.max(row.metrics.dailyProfit, 0)"
								:max="maxProfit" />
							<span
								class="font-mono whitespace-nowrap"
								:class="row.metrics.dailyProfit > 0 ? '' : 'text-negative'">
								{{ formatNumber(row.metrics.dailyProfit, 0) }}
							</span>
						</div>
					</template>
					<template #cell-break_even="{ row }">
						<span class="flex flex-col items-end leading-tight">
							<span class="font-bold font-mono">{{ days(row.metrics.breakEven) }}</span>
							<span
								v-if="settings.experts === 'ramp' && Number.isFinite(row.metrics.payback)"
								class="text-xs text-muted whitespace-nowrap">
								{{ t("base_roi.table.at_five", { days: days(row.metrics.payback) }) }}
							</span>
						</span>
					</template>
					<template #cell-weekly_return="{ row }">
						<span class="font-mono whitespace-nowrap">
							{{ formatPercent(row.metrics.weeklyReturn * 100, 1) }}
						</span>
					</template>
					<template #cell-building_cost="{ row }">
						<span class="font-mono">{{ formatNumber(row.metrics.buildingCost, 0) }}</span>
					</template>
					<template #cell-running_cost="{ row }">
						<span class="font-mono">{{ formatNumber(row.metrics.runningCost, 0) }}</span>
					</template>
					<template #cell-cargo="{ row }">
						<span class="flex flex-col items-end leading-tight font-mono whitespace-nowrap">
							<span>{{ formatNumber(Math.max(row.weightIn, row.weightOut), 1) }} t</span>
							<span class="text-xs text-muted">
								{{ formatNumber(Math.max(row.volumeIn, row.volumeOut), 1) }} m³
							</span>
						</span>
					</template>
					<template #cell-market_capacity="{ row }">
						<span
							class="font-mono"
							:class="row.metrics.marketCapacity < 1 ? 'text-warning' : ''">
							{{ formatNumber(row.metrics.marketCapacity, 2) }}
						</span>
					</template>
					<template #cell-workforce="{ row }">
						<span class="block truncate text-xs" :title="workforceText(row)">
							{{ workforceText(row) }}
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
							:row="row"
							:settings="settings"
							:series="series"
							:try-on-planet="tryOnPlanet"
							:cx-uuid="cxUuid"
							@close="expanded = expanded.filter((k) => k !== row.key)" />
					</template>
					<template #empty>
						<p class="py-6 text-center text-muted">{{ t("base_roi.table.empty") }}</p>
					</template>
				</PDataTable>
				<BaseROITableSkeleton
					v-if="planetRowsPending"
					class="flex-1 min-h-0"
					:titles="titles"
					:header="false" />
			</template>
		</div>
	</div>
</template>
