<script setup lang="ts">
	import { computed, ref, shallowRef, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useExchangeData } from "@/database/services/useExchangeData";
	import { trackEvent, reportError } from "@/lib/analytics/useAnalytics";
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Util
	import { targetFactor } from "@/features/planning/util/whatIf.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";
	import type { IPlanContext } from "@/features/planning/engine/engine.types";
	import type { ISensitivityRow } from "@/features/planning/util/whatIf.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PInputNumber, PSelect } from "@/ui";

	const { t } = useI18n();

	const props = defineProps<{
		ctx: IPlanContext;
		profit: number;
		// sorted by impact
		rows: ISensitivityRow[];
	}>();

	const { exchangeGameTypesArray, getExchangeTickerLoaded } =
		useExchangeData();

	/*
	 * Inputs: the sold material with the largest impact, the profit
	 * rounded up to the next 10k
	 */

	const picked = ref<string | number | null | undefined>(
		(props.rows.find((r) => r.side === "sell") ?? props.rows[0])?.ticker
	);
	const target = ref<number | null>(
		Math.ceil(props.profit / 10_000) * 10_000
	);
	// the range is fetched once the solver is used
	const used = ref(false);

	// tracked once, not per keystroke
	watch([picked, target], () => {
		if (used.value) return;
		used.value = true;
		trackEvent("plan:plancheck_target", {
			has_target: target.value !== null,
		});
	});

	const options = computed<PSelectOption[]>(() =>
		props.rows.map((r) => ({
			label: r.ticker,
			value: r.ticker,
			badge: t(`plan.tools.plan_check.side.${r.side}`),
		}))
	);

	const row = computed(() =>
		props.rows.find((r) => r.ticker === picked.value)
	);
	const type = computed(() => (row.value?.side === "sell" ? "SELL" : "BUY"));
	const today = computed(() =>
		row.value ? props.ctx.prices.getPrice(row.value.ticker, type.value) : 0
	);
	const exchange = computed<EXCHANGES_TYPE>(() =>
		row.value
			? props.ctx.prices.getPriceSource(row.value.ticker, type.value)
					.volume
			: "UNIVERSE"
	);
	const exchangeLabel = computed(() =>
		exchange.value === "UNIVERSE"
			? t("plan.tools.plan_check.target.all_exchanges")
			: exchange.value
	);
	const now = computed(() => {
		if (!row.value) return undefined;
		try {
			return getExchangeTickerLoaded(
				`${row.value.ticker}.${exchange.value}`
			);
		} catch {
			return undefined;
		}
	});

	const factor = computed(() =>
		row.value && target.value !== null && today.value > 0
			? targetFactor(props.profit, row.value.slope, target.value)
			: null
	);
	const needed = computed(() =>
		factor.value === null ? null : today.value * factor.value
	);

	/*
	 * 30-day range on the volume exchange, all four for UNIVERSE
	 */

	const DAY = 86_400_000;
	const range = shallowRef<{ low: number; high: number } | null>();
	const rangeFailed = ref(false);
	let latest = 0;

	watch(
		[used, () => row.value?.ticker, exchange],
		async ([isUsed, ticker, ex]) => {
			if (!isUsed || !ticker) return;
			const run = ++latest;
			range.value = undefined;
			rangeFailed.value = false;
			const codes = ex === "UNIVERSE" ? exchangeGameTypesArray : [ex];
			try {
				const days = (
					await Promise.all(
						codes.map((code) =>
							useQuery("GetExplorationData", {
								exchangeTicker: code,
								materialTicker: ticker,
							}).execute()
						)
					)
				)
					.flat()
					.filter((d) => d.traded > 0);
				if (run !== latest) return;
				const last = Math.max(...days.map((d) => d.date_epoch));
				const recent = days.filter(
					(d) => d.date_epoch > last - 30 * DAY
				);
				range.value = recent.length
					? {
							low: Math.min(...recent.map((d) => d.low_p)),
							high: Math.max(...recent.map((d) => d.high_p)),
						}
					: null;
			} catch (err) {
				reportError(err);
				if (run === latest) rangeFailed.value = true;
			}
		}
	);

	const outside = computed(() => {
		if (!range.value || needed.value === null) return undefined;
		if (needed.value > range.value.high) return "above";
		if (needed.value < range.value.low) return "below";
		return undefined;
	});

	const money = (v: number) => formatNumber(v, 0);
	const price = (v: number | undefined) =>
		v ? `${money(v)}` : t("cx.market_flags.popover.none");
</script>

<template>
	<div
		v-if="rows.length"
		class="flex flex-col gap-3 border border-white/10 rounded p-3 text-sm"
		data-target-price>
		<div>
			<h3 class="font-bold text-white">
				{{ t("plan.tools.plan_check.target.title") }}
			</h3>
			<p class="text-xs text-muted-strong">
				{{ t("plan.tools.plan_check.target.subtitle") }}
			</p>
		</div>
		<div class="grid grid-cols-2 gap-2">
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs text-muted-strong">
					{{ t("plan.tools.plan_check.target.material") }}
				</span>
				<PSelect
					v-model:value="picked"
					:options="options"
					:aria-label="t('plan.tools.plan_check.target.material')" />
			</label>
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs text-muted-strong">
					{{ t("plan.tools.plan_check.target.target") }}
				</span>
				<PInputNumber
					v-model:value="target"
					:aria-label="t('plan.tools.plan_check.target.target')" />
			</label>
		</div>

		<div
			v-if="row"
			class="rounded border border-white/15 bg-white/5 p-3"
			data-target-result>
			<template v-if="needed !== null && factor !== null">
				<div class="text-xs text-muted-strong">
					{{
						t(`plan.tools.plan_check.target.result_${row.side}`, {
							ticker: row.ticker,
						})
					}}
				</div>
				<div class="flex items-baseline gap-2">
					<span class="text-2xl font-bold tabular-nums">
						{{ money(needed) }} ȼ
					</span>
					<span
						class="font-bold tabular-nums"
						:class="factor >= 1 ? 'text-positive' : 'text-negative'"
						data-price-change>
						{{ formatNumber((factor - 1) * 100, 1, false, true) }} %
					</span>
				</div>
			</template>
			<p v-else class="text-muted-strong">
				{{
					t("plan.tools.plan_check.target.unreachable", {
						ticker: row.ticker,
					})
				}}
			</p>
		</div>

		<dl v-if="row" class="flex flex-col divide-y divide-white/10">
			<div class="flex justify-between gap-3 py-1.5">
				<dt>{{ t("plan.tools.plan_check.target.today") }}</dt>
				<dd class="tabular-nums">{{ money(today) }} ȼ</dd>
			</div>
			<div class="flex justify-between gap-3 py-1.5">
				<dt>
					{{
						t("plan.tools.plan_check.target.bid_ask", {
							exchange: exchangeLabel,
						})
					}}
				</dt>
				<dd class="tabular-nums">
					{{ price(now?.bid) }} · {{ price(now?.ask) }} ȼ
				</dd>
			</div>
			<div v-if="used" class="flex justify-between gap-3 py-1.5">
				<dt>
					{{
						t("plan.tools.plan_check.target.range", {
							exchange: exchangeLabel,
						})
					}}
				</dt>
				<dd class="tabular-nums" data-target-range>
					<span v-if="rangeFailed" class="text-negative">
						{{ t("plan.tools.plan_check.target.range_error") }}
					</span>
					<template v-else-if="range">
						{{ money(range.low) }} – {{ money(range.high) }} ȼ
					</template>
					<template v-else-if="range === null">
						{{ t("cx.market_flags.popover.none") }}
					</template>
					<span v-else class="text-muted">…</span>
				</dd>
			</div>
		</dl>
		<p v-if="outside && needed !== null" class="text-xs text-muted-strong">
			{{
				t(`plan.tools.plan_check.target.${outside}`, {
					price: money(needed),
					exchange: exchangeLabel,
				})
			}}
		</p>
	</div>
</template>
