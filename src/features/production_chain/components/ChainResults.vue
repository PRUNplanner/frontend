<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import {
		formatMoney,
		formatShare,
	} from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IChainTotals } from "@/features/production_chain/engine/chainSolver.types";

	const { totals, baseline = null } = defineProps<{
		totals: IChainTotals;
		/** the chain without own production, null without Have */
		baseline?: IChainTotals | null;
	}>();

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });

	const stats = computed(() => {
		const tt = totals;
		const workforce = Object.values(tt.workforce);
		const own = tt.ownCount > 0;
		const payback =
			tt.payback !== null
				? t("production_chains.results.payback", {
						n: formatNumber(tt.payback, 0),
					})
				: t("production_chains.results.no_payback");
		return [
			{
				key: "profit",
				value: money(tt.profit),
				tone: tt.profit >= 0 ? "text-positive" : "text-negative",
				sub: own
					? t("production_chains.have.profit_sub")
					: t("production_chains.results.profit_share", {
							pct: formatShare(
								tt.outputValue ? tt.profit / tt.outputValue : 0
							),
						}),
			},
			{
				key: "output",
				value: money(tt.outputValue),
				sub: tt.byproductsValue
					? t("production_chains.results.output_byproducts", {
							value: money(tt.byproductsValue),
						})
					: t("production_chains.results.output_targets"),
			},
			own
				? {
						key: "bought",
						label: t("production_chains.have.inputs"),
						value: money(tt.bought + tt.own),
						sub: t("production_chains.have.inputs_sub", {
							own: money(tt.own),
							bought: money(tt.bought),
						}),
					}
				: {
						key: "bought",
						value: money(tt.bought),
						sub: t(
							"production_chains.results.bought_count",
							tt.boughtCount
						),
					},
			{
				key: "upkeep",
				value: money(tt.upkeep + tt.wear),
				sub: t("production_chains.results.upkeep_workforce", {
					value: money(tt.upkeep),
				}),
			},
			{
				key: "buildings",
				value: formatNumber(tt.built, 0),
				sub:
					baseline && baseline.built > tt.built
						? t("production_chains.have.buildings_fewer", {
								n: formatNumber(baseline.built - tt.built, 0),
							})
						: t("production_chains.results.buildings_exact", {
								n: formatNumber(tt.exact, 2),
							}),
			},
			{
				key: "area",
				value: formatNumber(tt.area, 0),
				sub: t("production_chains.results.area_habs", {
					n: formatNumber(tt.habArea, 0),
				}),
			},
			{
				key: "workforce",
				value: formatNumber(
					workforce.reduce((a, b) => a + b, 0),
					0
				),
				sub: Object.entries(tt.workforce)
					.filter(([, w]) => w > 0)
					.map(
						([tier, w]) =>
							`${t(`production_chains.results.tier.${tier}`)} ${formatNumber(w, 0)}`
					)
					.join(" · "),
			},
			{
				key: "construction",
				value: money(tt.construction),
				sub:
					baseline && baseline.construction > tt.construction
						? t("production_chains.have.construction_less", {
								value: money(
									baseline.construction - tt.construction
								),
								payback,
							})
						: payback,
			},
		];
	});
</script>

<template>
	<section
		:aria-label="t('production_chains.results.label')"
		class="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 rounded-panel border border-line divide-x divide-y 2xl:divide-y-0 divide-line overflow-hidden">
		<div
			v-for="s in stats"
			:key="s.key"
			class="px-3 py-3 min-w-0"
			:data-testid="`chain-result-${s.key}`">
			<div class="text-xs uppercase tracking-wide text-muted">
				{{
					"label" in s
						? s.label
						: $t(`production_chains.results.${s.key}`)
				}}
			</div>
			<div class="text-xl font-bold tabular-nums" :class="s.tone">
				{{ s.value }}
			</div>
			<div class="text-xs text-muted" :title="s.sub">
				{{ s.sub }}
			</div>
		</div>
	</section>
</template>
