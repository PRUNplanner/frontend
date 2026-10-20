<script setup lang="ts">
	import { computed, onBeforeUnmount, onMounted, ref } from "vue";
	import { useI18n } from "vue-i18n";

	// Util
	import {
		changeColor,
		formatChange,
		formatMoney,
		squarify,
	} from "@/features/market_report/marketReport.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		MarketMaterial,
		MarketSummary,
	} from "@/features/api/schemas/marketSummary.schemas";

	const { summary } = defineProps<{ summary: MarketSummary }>();
	const { t } = useI18n();

	const box = ref<HTMLElement | null>(null);
	const width = ref(0);
	const height = ref(0);
	let resize: ResizeObserver | undefined;
	onMounted(() => {
		if (!box.value) return;
		width.value = box.value.clientWidth;
		height.value = box.value.clientHeight;
		if (typeof ResizeObserver === "undefined") return;
		resize = new ResizeObserver(([entry]) => {
			width.value = entry.contentRect.width;
			height.value = entry.contentRect.height;
		});
		resize.observe(box.value);
	});
	onBeforeUnmount(() => resize?.disconnect());

	const total = computed(() =>
		summary.materials.reduce((a, m) => a + m.turnover_30d, 0)
	);

	// sectors first, largest first, then the materials inside each
	const layout = computed(() => {
		const groups = summary.sectors
			.map((s) => {
				const kids = summary.materials
					.filter((m) => m.sector === s.key && m.turnover_30d > 0)
					.sort((a, b) => b.turnover_30d - a.turnover_30d);
				return {
					key: s.key,
					value: kids.reduce((a, m) => a + m.turnover_30d, 0),
					kids,
				};
			})
			.filter((g) => g.value > 0)
			.sort((a, b) => b.value - a.value);

		const sectors = squarify(
			groups.map((g) => ({ value: g.value, item: g })),
			0,
			0,
			width.value,
			height.value
		);
		return sectors.map((s) => {
			// a sector label where it fits
			const head = s.h > 48 && s.w > 96 ? 20 : 0;
			return {
				...s,
				head,
				tiles: squarify(
					s.item.kids.map((m) => ({
						value: m.turnover_30d,
						item: m,
					})),
					s.x,
					s.y + head,
					s.w,
					s.h - head
				),
			};
		});
	});

	const active = ref<{ m: MarketMaterial; x: number; y: number } | null>(
		null
	);

	function show(m: MarketMaterial, x: number, y: number) {
		active.value = { m, x, y };
	}

	// beside the pointer or the tile, kept inside the box
	const tipStyle = computed(() => {
		if (!active.value) return {};
		const W = 240;
		const H = 150;
		let { x, y } = active.value;
		x = x + 12 + W > width.value ? x - 12 - W : x + 12;
		y = y + 12 + H > height.value ? y - 12 - H : y + 12;
		return {
			left: `${Math.max(4, x)}px`,
			top: `${Math.max(4, y)}px`,
			width: `${W}px`,
		};
	});

	function pointer(event: PointerEvent, m: MarketMaterial) {
		const rect = box.value!.getBoundingClientRect();
		show(m, event.clientX - rect.left, event.clientY - rect.top);
	}

	const tileLabel = (m: MarketMaterial) =>
		`${m.ticker}, ${m.name}: ${formatMoney(m.turnover_30d)}, ${
			m.is_flat
				? t("market_report.treemap.flat")
				: formatChange(m.change_pct)
		}`;

	const HATCH =
		"repeating-linear-gradient(135deg, var(--color-selected) 0 6px, rgb(255 255 255 / 0.12) 6px 9px)";
</script>

<template>
	<div
		ref="box"
		class="relative h-120 overflow-hidden rounded-panel"
		role="list"
		:aria-label="t('market_report.treemap.label')">
		<template v-for="s in layout" :key="s.item.key">
			<div
				v-if="s.head"
				aria-hidden="true"
				class="absolute px-1.5 text-xs text-muted truncate leading-5"
				:style="{
					left: `${s.x}px`,
					top: `${s.y}px`,
					width: `${s.w}px`,
				}">
				{{ t(`market_report.sector.${s.item.key}`) }}
			</div>
			<div
				v-for="r in s.tiles"
				:key="r.item.ticker"
				role="listitem"
				:tabindex="r.w >= 24 && r.h >= 24 ? 0 : undefined"
				:aria-label="tileLabel(r.item)"
				:data-ticker="r.item.ticker"
				:data-flat="r.item.is_flat || undefined"
				class="absolute flex flex-col items-center justify-center overflow-hidden border border-surface text-ink focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2"
				:style="{
					left: `${r.x}px`,
					top: `${r.y}px`,
					width: `${r.w}px`,
					height: `${r.h}px`,
					background: r.item.is_flat
						? HATCH
						: changeColor(r.item.change_pct),
				}"
				@pointermove="pointer($event, r.item)"
				@pointerdown="pointer($event, r.item)"
				@pointerleave="
					(e: PointerEvent) =>
						e.pointerType === 'mouse' && (active = null)
				"
				@focus="show(r.item, r.x + r.w / 2, r.y + r.h / 2)"
				@blur="active = null">
				<b
					v-if="r.w > 34 && r.h > 18"
					class="text-xs leading-none px-1 py-0.5 rounded-sm bg-black/60 text-white"
					aria-hidden="true">
					{{ r.item.ticker }}
				</b>
				<span
					v-if="r.w > 56 && r.h > 40"
					class="mt-0.5 text-xs leading-none px-1 py-0.5 rounded-sm bg-black/60 text-white tabular-nums"
					aria-hidden="true">
					{{
						r.item.is_flat
							? t("market_report.treemap.flat")
							: formatChange(r.item.change_pct)
					}}
				</span>
			</div>
		</template>

		<div
			v-if="active"
			role="tooltip"
			class="absolute z-10 p-2 rounded-panel bg-[var(--chart-surface)] text-xs flex flex-col gap-1 pointer-events-none shadow-panel"
			:style="tipStyle">
			<div class="font-bold text-sm">
				{{ active.m.name }} · {{ active.m.ticker }}
			</div>
			<div class="flex justify-between gap-3">
				<span class="text-muted">{{
					t("market_report.treemap.sector")
				}}</span>
				{{ t(`market_report.sector.${active.m.sector}`) }}
			</div>
			<div class="flex justify-between gap-3">
				<span class="text-muted">
					{{ t("market_report.treemap.turnover_30d") }}
				</span>
				<span class="tabular-nums">
					{{ formatMoney(active.m.turnover_30d) }} ·
					{{
						formatNumber(
							total ? (active.m.turnover_30d / total) * 100 : 0,
							1
						)
					}}
					%
				</span>
			</div>
			<div class="flex justify-between gap-3">
				<span class="text-muted">{{
					t("market_report.treemap.vwap_7d")
				}}</span>
				<span class="tabular-nums">
					{{
						active.m.vwap_7d == null
							? "–"
							: `${formatNumber(active.m.vwap_7d, 2)} ȼ`
					}}
				</span>
			</div>
			<div class="flex justify-between gap-3">
				<span class="text-muted">{{
					t("market_report.treemap.vwap_30d")
				}}</span>
				<span class="tabular-nums">
					{{
						active.m.vwap_30d == null
							? "–"
							: `${formatNumber(active.m.vwap_30d, 2)} ȼ`
					}}
				</span>
			</div>
			<div class="flex justify-between gap-3">
				<span class="text-muted">{{
					t("market_report.treemap.change")
				}}</span>
				<span class="tabular-nums">
					{{
						active.m.change_pct == null
							? t("market_report.treemap.few_trades")
							: formatChange(active.m.change_pct)
					}}
				</span>
			</div>
			<div v-if="active.m.is_flat" class="text-warning">
				{{ t("market_report.treemap.flat_note") }}
			</div>
		</div>
	</div>
</template>
