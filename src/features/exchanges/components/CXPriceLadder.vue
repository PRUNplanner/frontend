<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { useExchangeData } from "@/database/services/useExchangeData";

	// Util
	import { formatNumber } from "@/util/numbers";
	import { explainPrice, type PriceType } from "@/features/cx/priceBook";
	import { exchangeBasisLabel } from "@/features/exchanges/exchangeLabel.util";
	import { ALL_PLANETS } from "@/features/exchanges/cxEdit.util";

	// Types & Interfaces
	import type { CXData } from "@/features/api/schemas/cxData.schemas";

	// UI
	import { PButton } from "@/ui";

	/*
	 * One price's cascade: every level with its value, the winner
	 * highlighted, the levels below it struck through. A winning exchange
	 * rule without a value shows "no price · 0.00" in amber.
	 */
	const { cxData, planet, ticker, type } = defineProps<{
		cxData: CXData | undefined;
		planet: string;
		ticker: string;
		type: PriceType;
	}>();

	const emit = defineEmits<{
		(e: "open", scope: string): void;
	}>();

	const { t } = useI18n();
	const { getExchangeTickerLoaded } = useExchangeData();

	const explanation = computed(() =>
		explainPrice(cxData, planet, ticker, type, getExchangeTickerLoaded)
	);

	const steps = computed(() => {
		const { steps: list, winner } = explanation.value;
		return list.map((step, i) => {
			const isExchange =
				step.level === "planet_exchange" ||
				step.level === "empire_exchange";
			const noPrice = i === winner && isExchange && step.value === 0;
			let value = "–";
			if (step.matched)
				value =
					step.value === null
						? t("exchanges.labels.unresolved")
						: noPrice
							? t("exchanges.ladder.no_price", {
									value: formatNumber(0),
								})
							: formatNumber(step.value);
			return {
				level: step.level,
				rule:
					isExchange && step.matched
						? exchangeBasisLabel(step.exchange!, step.key!, t)
						: undefined,
				value,
				winner: i === winner,
				noPrice,
				struck: winner >= 0 && i > winner && step.matched,
			};
		});
	});

	// where the winning rule is set, or would be added
	const ruleScope = computed(() => {
		const level = explanation.value.steps[explanation.value.winner]?.level;
		return level === "planet_ticker" || level === "planet_exchange"
			? planet
			: ALL_PLANETS;
	});
</script>

<template>
	<div class="flex flex-col gap-1 text-sm">
		<table class="w-full max-w-xl">
			<tbody>
				<tr
					v-for="step in steps"
					:key="step.level"
					class="border-b border-white/5 child:py-1 child:px-2"
					:class="[
						step.winner ? 'bg-white/5 text-white' : 'text-muted',
						step.noPrice ? 'text-warning' : '',
					]"
					:data-winner="step.winner || undefined">
					<td>
						{{ $t(`exchanges.ladder.${step.level}`) }}
						<span v-if="step.rule" class="text-xs text-muted">
							{{ step.rule }}
						</span>
					</td>
					<td
						class="text-right tabular-nums border-l-2"
						:class="[
							step.winner
								? step.noPrice
									? 'border-warning'
									: 'border-link'
								: 'border-transparent',
							step.struck ? 'line-through' : '',
						]">
						{{ step.value }}
					</td>
				</tr>
			</tbody>
		</table>
		<p v-if="explanation.winner < 0" class="text-warning">
			{{ $t("exchanges.ladder.unresolved") }}
		</p>
		<div>
			<PButton type="ghost" size="sm" @click="emit('open', ruleScope)">
				{{ $t("exchanges.ladder.open") }}
			</PButton>
		</div>
	</div>
</template>
