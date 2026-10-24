<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { money, signedMoney } from "@/features/production_chain/chainCheck.util";
	import { formatShare } from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		CheckKind,
		ICheckResult,
	} from "@/features/production_chain/engine/chainCheck.types";

	const { result, setup } = defineProps<{
		result: ICheckResult;
		/** setup gains shown */
		setup: boolean;
	}>();

	const IMPROVEMENTS: CheckKind[] = ["recipe", "buy", "location", "setup"];
	const k = (key: string, named: Record<string, unknown> = {}) =>
		t(`production_chains.check.results.${key}`, named);

	const stats = computed(() => {
		const tt = result.totals;
		const improvements = IMPROVEMENTS.reduce((s, x) => s + tt.counts[x], 0);
		return [
			{
				key: "profit",
				value: money(t, tt.profit),
				sub: k("profit_note", { n: result.bases.length }),
			},
			{
				key: "gain",
				value: signedMoney(t, tt.gain),
				tone: tt.gain > 0 ? "text-positive" : "",
				sub: k("gain_note", {
					pct: tt.profit > 0 ? formatShare(tt.gain / tt.profit) : "—",
				}),
			},
			{
				key: "checked",
				value: k("checked_value", { n: tt.checked, total: result.bases.length }),
				sub: t("production_chains.check.results.checked_note", result.chains.length),
			},
			{
				key: "optimal",
				value: String(tt.optimal),
				tone: tt.optimal ? "text-positive" : "",
				sub: k("optimal_note", { n: tt.checked }),
			},
			{
				key: "improvements",
				value: String(improvements),
				sub:
					IMPROVEMENTS.filter((x) => tt.counts[x])
						.map(
							(x) =>
								`${tt.counts[x]} ${t(`production_chains.check.kind.${x}`)}`
						)
						.join(" · ") || k("none"),
			},
			{
				key: "fixes",
				value: String(tt.counts.fix),
				tone: tt.counts.fix ? "text-negative" : "",
				sub: k("fixes_note"),
			},
			{
				key: "setup",
				value: setup ? signedMoney(t, tt.setupGain) : k("hidden"),
				tone: setup && tt.setupGain > 0 ? "text-positive" : "",
				sub: k("setup_note"),
			},
			{
				key: "moves",
				value: tt.counts.location ? money(t, tt.moveCost) : "—",
				sub: tt.counts.location
					? k("moves_note", {
							n: formatNumber(tt.moveCost / Math.max(tt.moveGain, 1), 0),
						})
					: k("no_moves"),
			},
		];
	});
</script>

<template>
	<section
		:aria-label="t('production_chains.check.results.label')"
		class="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 rounded-panel border border-line divide-x divide-y 2xl:divide-y-0 divide-line overflow-hidden">
		<div
			v-for="s in stats"
			:key="s.key"
			class="px-3 py-3 min-w-0"
			:data-testid="`check-result-${s.key}`">
			<div class="text-xs uppercase tracking-wide text-muted">
				{{ $t(`production_chains.check.results.${s.key}`) }}
			</div>
			<div class="text-xl font-bold tabular-nums" :class="s.tone">
				{{ s.value }}
			</div>
			<div class="text-xs text-muted truncate" :title="s.sub">
				{{ s.sub }}
			</div>
		</div>
	</section>
</template>
