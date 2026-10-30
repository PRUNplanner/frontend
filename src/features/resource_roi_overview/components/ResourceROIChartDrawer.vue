<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t, locale } = useI18n();

	// Composables
	import { useOverlayLayer } from "@/ui/useOverlayLayer";
	import { useDockHeight } from "@/ui/useDockHeight";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Util
	import {
		ROI_EXCHANGES,
		roiChartData,
		roiFrontier,
		roiInsight,
		roiRowKey,
		shortPlanetName,
	} from "@/features/resource_roi_overview/resourceROIChart.util";
	import { formatNumber } from "@/util/numbers";

	// Components
	import PScatter from "@/ui/charts/PScatter.vue";
	import PLayerClose from "@/ui/components/PLayerClose.vue";

	// Types & Interfaces
	import type {
		IResourceROIDistanceTarget,
		IResourceROIResult,
	} from "@/features/resource_roi_overview/useResourceROIOverview.types";
	import type { IScatterPoint } from "@/ui/charts/scatter.types";

	// UI
	import { PSelect } from "@/ui";

	// docked under the table in the page flow, not a modal: the table
	// stays usable above it. Esc closes it when no layer is above.
	const { rows } = defineProps<{
		/** the table's rows after its filters */
		rows: IResourceROIResult[];
	}>();

	const show = defineModel<boolean>("show", { required: true });
	/** hovered row key (roiRowKey), shared with the table */
	const active = defineModel<string | null>("active", { default: null });

	const theme = useChartTheme();
	const panel: Ref<HTMLElement | null> = ref(null);
	useOverlayLayer(show, panel, {
		modal: false,
		autoFocus: () => false,
		close: () => (show.value = false),
	});

	// height: dragged or stepped with the arrow keys on the grip
	const { height, dragStart, dragMove, dragEnd, resizeKey } = useDockHeight();

	/*
	 * Data
	 */
	const target: Ref<IResourceROIDistanceTarget> = ref("nearest");
	const targetOptions = computed(() => [
		{ label: t("resource_roi.chart.nearest"), value: "nearest" },
		...ROI_EXCHANGES.map((code) => ({ label: code, value: code })),
	]);

	const data = computed(() => roiChartData(rows, target.value));
	const frontier = computed(() => roiFrontier(data.value.points));
	const insight = computed(() =>
		roiInsight(data.value.points, frontier.value)
	);

	const yTitle = computed(() =>
		target.value === "nearest"
			? t("resource_roi.chart.y_nearest")
			: t("resource_roi.chart.y_cx", { cx: target.value })
	);
	const caption = computed(() =>
		target.value === "nearest"
			? t("resource_roi.chart.caption_nearest")
			: t("resource_roi.chart.caption_cx", { cx: target.value })
	);

	const points = computed((): IScatterPoint[] => {
		const profits = data.value.points.map((p) => p.row.dailyProfit);
		const min = Math.min(...profits);
		const max = Math.max(...profits);
		const onFrontier = new Set(frontier.value);
		return data.value.points.map((p) => ({
			key: roiRowKey(p.row),
			label: shortPlanetName(p.row.planetName),
			x: p.x,
			y: p.y,
			size: max > min ? (p.row.dailyProfit - min) / (max - min) : 0.5,
			color: theme.value.exchange(p.exchange),
			emphasis: onFrontier.has(roiRowKey(p.row)),
		}));
	});
	const byKey = computed(
		() => new Map(data.value.points.map((p) => [roiRowKey(p.row), p]))
	);

	const legend = computed(() =>
		ROI_EXCHANGES.filter((code) =>
			data.value.points.some((p) => p.exchange === code)
		)
	);

	// sentences under the chart about the rows it leaves out
	const leftOut = computed(() => {
		const { noPayback, noRoute, slow, maxDays } = data.value;
		const text: string[] = [];
		if (slow)
			text.push(
				t(
					"resource_roi.chart.slow",
					{ n: slow, days: formatNumber(maxDays) },
					slow
				)
			);
		if (noPayback)
			text.push(
				t("resource_roi.chart.no_payback", { n: noPayback }, noPayback)
			);
		if (noRoute)
			text.push(
				t(
					"resource_roi.chart.no_route",
					{
						n: noRoute,
						cx:
							target.value === "nearest"
								? t("resource_roi.chart.an_exchange")
								: target.value,
					},
					noRoute
				)
			);
		return text.join(" ");
	});

	const jumps = (n: number) => t("resource_roi.chart.jumps", { n }, n);
	const insightText = computed(() => {
		const i = insight.value;
		if (!i) return "";
		const names = new Intl.ListFormat(locale.value.replace("_", "-"), {
			type: "conjunction",
		}).format(i.frontier.map((p) => shortPlanetName(p.row.planetName)));
		const text = [
			t(
				"resource_roi.chart.insight_fastest",
				{
					names,
					jumps:
						i.minJumps === i.maxJumps
							? jumps(i.minJumps)
							: t("resource_roi.chart.jumps_range", {
									min: i.minJumps,
									max: i.maxJumps,
								}),
					cx: i.exchange ?? t("resource_roi.chart.an_exchange"),
				},
				i.frontier.length
			),
		];
		if (i.topProfit)
			text.push(
				t("resource_roi.chart.insight_top_profit", {
					name: shortPlanetName(i.topProfit.row.planetName),
					jumps: jumps(i.topProfit.y),
				})
			);
		return text.join(" ");
	});
</script>

<template>
	<section
		ref="panel"
		tabindex="-1"
		class="sticky bottom-0 z-10 flex flex-col border-t border-white/10 bg-surface shadow-panel outline-none"
		:style="{ height: `${height}px` }"
		:aria-label="t('resource_roi.chart.title')">
		<div
			role="separator"
			aria-orientation="horizontal"
			tabindex="0"
			:aria-label="t('resource_roi.chart.resize')"
			:aria-valuenow="height"
			class="touch-target h-3 shrink-0 flex items-center justify-center cursor-row-resize touch-none outline-none focus-visible:bg-white/10"
			@pointerdown="dragStart"
			@pointermove="dragMove"
			@pointerup="dragEnd"
			@pointercancel="dragEnd"
			@keydown.up.prevent="resizeKey(24)"
			@keydown.down.prevent="resizeKey(-24)">
			<span class="h-1 w-10 rounded-full bg-white/20" />
		</div>

		<div
			class="px-6 pb-2 flex flex-row flex-wrap items-center gap-x-4 gap-y-2">
			<div class="flex flex-row flex-wrap items-baseline gap-x-3 min-w-0">
				<h2 class="text-base font-bold">
					{{ t("resource_roi.chart.title") }}
				</h2>
				<span class="text-xs text-muted">{{ caption }}</span>
			</div>
			<div
				class="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 ml-auto">
				<div class="flex flex-row items-center gap-2">
					<span class="text-muted">
						{{ t("resource_roi.chart.distance_to") }}
					</span>
					<PSelect
						:value="target"
						class="w-36"
						:aria-label="t('resource_roi.chart.distance_to')"
						:options="targetOptions"
						@update:value="
							(v) => (target = v as IResourceROIDistanceTarget)
						" />
				</div>
				<ul
					class="flex flex-row flex-wrap gap-x-3 gap-y-1 text-xs text-muted"
					:aria-label="t('resource_roi.chart.legend')">
					<li
						v-for="code in legend"
						:key="code"
						class="flex items-center gap-1.5">
						<span
							class="size-2.5 rounded-full"
							:style="{ background: theme.exchange(code) }" />
						{{ code }}
					</li>
				</ul>
				<!-- above the chart, so its 44 px touch area isn't covered -->
				<PLayerClose class="z-[1]" @click="show = false" />
			</div>
		</div>

		<div class="flex-1 min-h-0 px-6 pb-3 flex flex-col gap-1">
			<div v-if="points.length" class="flex-1 min-h-0">
				<PScatter
					v-model:active="active"
					:points="points"
					:frontier="frontier"
					y-better="low"
					:x-zero="false"
					:x-title="t('resource_roi.chart.x')"
					:y-title="yTitle"
					:label="t('resource_roi.chart.label', { y: yTitle })">
					<template #tooltip="{ point }">
						<dl
							class="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 min-w-48">
							<dt class="font-bold col-span-2">
								{{ byKey.get(point.key)?.row.planetName }}
							</dt>
							<dt class="text-muted">
								{{ t("resource_roi.chart.tooltip_roi") }}
							</dt>
							<dd class="font-mono text-right">
								{{ formatNumber(point.x) }}
							</dd>
							<dt class="text-muted">
								{{ t("resource_roi.chart.tooltip_profit") }}
							</dt>
							<dd class="font-mono text-right">
								{{
									formatNumber(
										byKey.get(point.key)?.row.dailyProfit ??
											0
									)
								}}
							</dd>
							<dt class="text-muted">
								{{
									t("resource_roi.chart.tooltip_jumps", {
										cx: byKey.get(point.key)?.exchange,
									})
								}}
							</dt>
							<dd class="font-mono text-right">{{ point.y }}</dd>
						</dl>
					</template>
				</PScatter>
			</div>
			<p v-else class="flex-1 py-3 text-center text-muted">
				{{ t("resource_roi.chart.empty") }}
			</p>
			<p v-if="insightText" class="text-sm">{{ insightText }}</p>
			<p v-if="leftOut" class="text-xs text-muted">{{ leftOut }}</p>
		</div>
	</section>
</template>
