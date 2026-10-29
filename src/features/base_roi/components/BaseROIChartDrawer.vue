<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useOverlayLayer } from "@/ui/useOverlayLayer";
	import { useDockHeight } from "@/ui/useDockHeight";
	import { useChartTheme } from "@/ui/charts/chartTheme";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Components
	import PScatter from "@/ui/charts/PScatter.vue";
	import PLayerClose from "@/ui/components/PLayerClose.vue";

	// Types & Interfaces
	import type {
		BaseROIRowKind,
		IBaseROIRow,
	} from "@/features/base_roi/baseROI.types";
	import type { IScatterPoint } from "@/ui/charts/scatter.types";

	// docked under the table, not modal: the table stays usable above it;
	// Esc closes it when no layer is above
	const { rows } = defineProps<{
		/** the table's rows after its filters */
		rows: IBaseROIRow[];
	}>();
	const show = defineModel<boolean>("show", { required: true });
	/** hovered row key, shared with the table */
	const active = defineModel<string | null>("active", { default: null });

	const theme = useChartTheme();
	const panel: Ref<HTMLElement | null> = ref(null);
	useOverlayLayer(show, panel, {
		modal: false,
		autoFocus: () => false,
		close: () => (show.value = false),
	});
	const { height, dragStart, dragMove, dragEnd, resizeKey } =
		useDockHeight();

	const KINDS: BaseROIRowKind[] = ["resource", "farming", "recipe"];
	const colorOf = (kind: BaseROIRowKind) =>
		({
			resource: theme.value.exchange("AI1"),
			farming: theme.value.positive,
			recipe: theme.value.exchange("IC1"),
		})[kind];

	const drawn = computed(() =>
		rows.filter(
			(r) => Number.isFinite(r.metrics.breakEven) && r.metrics.breakEven > 0
		)
	);
	const never = computed(() => rows.length - drawn.value.length);
	const byKey = computed(() => new Map(drawn.value.map((r) => [r.key, r])));

	const points = computed((): IScatterPoint[] => {
		const profits = drawn.value.map((r) => r.metrics.dailyProfit);
		const min = Math.min(...profits);
		const max = Math.max(...profits);
		return drawn.value.map((r) => ({
			key: r.key,
			label: r.planetNaturalId
				? `${r.outputs[0]?.ticker ?? r.building} @ ${r.planetNaturalId}`
				: `${r.outputs.map((o) => o.ticker).join(", ")} ${r.building}`,
			x: r.metrics.marketCapacity,
			y: r.metrics.breakEven,
			size: max > min ? (r.metrics.dailyProfit - min) / (max - min) : 0.5,
			color: colorOf(r.kind),
		}));
	});
	const legend = computed(() =>
		KINDS.filter((k) => drawn.value.some((r) => r.kind === k))
	);
</script>

<template>
	<section
		ref="panel"
		tabindex="-1"
		class="sticky bottom-0 z-10 flex flex-col border-t border-white/10 bg-surface shadow-panel outline-none"
		:style="{ height: `${height}px` }"
		:aria-label="t('base_roi.chart.title')">
		<div
			role="separator"
			aria-orientation="horizontal"
			tabindex="0"
			:aria-label="t('base_roi.chart.resize')"
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
				<h2 class="text-base font-bold">{{ t("base_roi.chart.title") }}</h2>
				<span class="text-xs text-muted">{{ t("base_roi.chart.caption") }}</span>
			</div>
			<div class="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 ml-auto">
				<ul
					class="flex flex-row flex-wrap gap-x-3 gap-y-1 text-xs text-muted"
					:aria-label="t('base_roi.chart.legend')">
					<li v-for="k in legend" :key="k" class="flex items-center gap-1.5">
						<span class="size-2.5 rounded-full" :style="{ background: colorOf(k) }" />
						{{ t(`base_roi.table.${k}`) }}
					</li>
				</ul>
				<PLayerClose class="z-[1]" @click="show = false" />
			</div>
		</div>
		<div class="flex-1 min-h-0 px-6 pb-3 flex flex-col gap-1">
			<div v-if="points.length" class="flex-1 min-h-0">
				<PScatter
					v-model:active="active"
					:points="points"
					y-better="low"
					:x-title="t('base_roi.chart.x')"
					:y-title="t('base_roi.chart.y')"
					:label="t('base_roi.chart.label')">
					<template #tooltip="{ point }">
						<dl class="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 min-w-48">
							<dt class="font-bold col-span-2">{{ point.label }}</dt>
							<dt class="text-muted">{{ t("base_roi.chart.tooltip_break_even") }}</dt>
							<dd class="font-mono text-right">{{ formatNumber(point.y, 1) }}</dd>
							<dt class="text-muted">{{ t("base_roi.chart.tooltip_capacity") }}</dt>
							<dd class="font-mono text-right">{{ formatNumber(point.x, 2) }}</dd>
							<dt class="text-muted">{{ t("base_roi.chart.tooltip_profit") }}</dt>
							<dd class="font-mono text-right">
								{{ formatNumber(byKey.get(point.key)?.metrics.dailyProfit ?? 0, 0) }}
							</dd>
						</dl>
					</template>
				</PScatter>
			</div>
			<p v-else class="flex-1 py-3 text-center text-muted">{{ t("base_roi.chart.empty") }}</p>
			<p v-if="never" class="text-xs text-muted">
				{{ t("base_roi.chart.never", { n: never }, never) }}
			</p>
		</div>
	</section>
</template>
