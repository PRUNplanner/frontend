<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import {
		CX_DOT_COLOR,
		exchangeOptionLabel,
	} from "@/features/exchanges/exchangeLabel.util";
	import {
		basesFor,
		presetAverage,
		presetExchange,
		presetTradeNow,
		readRule,
		RULE_EXCHANGES,
		switchMode,
		toChoice,
		writeRule,
		type ExchangeBasis,
		type ExchangeRuleMode,
		type IExchangeChoice,
		type IExchangeRuleState,
	} from "@/features/exchanges/exchangeRule.util";

	// Types & Interfaces
	import type { CXDataExchangeOption } from "@/features/api/schemas/cxData.schemas";
	import type { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";

	// UI
	import { PButton, PButtonGroup, PSelect, PTooltip } from "@/ui";

	/*
	 * The exchange rule of one scope: presets, mode (planet: use the
	 * all-planets rule, same for buy and sell, separate), exchange and
	 * basis. Writes the stored rules, never BOTH with BUY or SELL.
	 */
	const rules = defineModel<CXDataExchangeOption[]>("rules", {
		required: true,
	});

	const { isPlanet = false, inherited = [] } = defineProps<{
		isPlanet?: boolean;
		// the all-planets rules a planet inherits
		inherited?: CXDataExchangeOption[];
	}>();

	const { t } = useI18n();

	const state = computed(() => readRule(rules.value, isPlanet));

	// where a planet's own rule starts, and the presets' exchange
	const startChoice = computed<IExchangeChoice>(
		() =>
			readRule(inherited, false).both ??
			(inherited[0] ? toChoice(inherited[0].exchange) : null) ?? {
				exchange: "NC1",
				basis: "30D",
			}
	);
	const presetCX = computed(() => presetExchange(rules.value, inherited));
	const presetLabel = computed(() =>
		presetCX.value === "UNIVERSE"
			? t("exchanges.labels.universe")
			: presetCX.value
	);

	const modes = computed<ExchangeRuleMode[]>(() =>
		isPlanet ? ["inherit", "same", "separate"] : ["same", "separate"]
	);

	const BASIS_KEY: Record<ExchangeBasis, string> = {
		"7D": "vwap_7d",
		"30D": "vwap_30d",
		ASK: "ask",
		BID: "bid",
	};

	function write(next: IExchangeRuleState): void {
		rules.value = writeRule(next);
	}

	function setMode(mode: ExchangeRuleMode): void {
		write(switchMode(state.value, mode, startChoice.value));
	}

	type Side = "both" | "buy" | "sell";

	function setExchange(side: Side, exchange: EXCHANGES_TYPE | null): void {
		const current = state.value[side];
		write({
			...state.value,
			[side]: exchange
				? { exchange, basis: current?.basis ?? "30D" }
				: null,
		});
	}

	function setBasis(side: Side, basis: ExchangeBasis): void {
		const current = state.value[side];
		if (current) write({ ...state.value, [side]: { ...current, basis } });
	}

	function basisOptions(choice: IExchangeChoice | null) {
		return basesFor(choice?.exchange ?? "NC1").map((b) => ({
			label: t(`exchanges.labels.basis.${BASIS_KEY[b]}`),
			value: b,
		}));
	}

	function applyPreset(preset: "average" | "trade_now"): void {
		const exchange = presetCX.value;
		if (preset === "trade_now" && exchange === "UNIVERSE") return;
		rules.value =
			preset === "average"
				? presetAverage(exchange)
				: presetTradeNow(exchange as Exclude<EXCHANGES_TYPE, "UNIVERSE">);
		trackEvent("exchange:preset", {
			preset,
			scope: isPlanet ? "planet" : "all",
		});
	}

	const sides = computed<Side[]>(() =>
		state.value.mode === "same"
			? ["both"]
			: state.value.mode === "separate"
				? ["buy", "sell"]
				: []
	);

	const inheritedLabel = computed(() =>
		inherited.length
			? inherited
					.map((o) =>
						t("exchanges.rule.inherited_part", {
							type: t(`exchanges.rule.side.${o.type.toLowerCase()}`),
							rule: exchangeOptionLabel(o.exchange, t),
						})
					)
					.join(" · ")
			: t("exchanges.rule.inherited_none")
	);
</script>

<template>
	<section class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h3 class="text-lg font-bold">
				{{ $t("exchanges.rule.title") }}
			</h3>
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-muted text-sm">
					{{ $t("exchanges.rule.presets_on", { exchange: presetLabel }) }}
				</span>
				<PButton type="secondary" size="sm" @click="applyPreset('average')">
					{{ $t("exchanges.rule.preset_average") }}
				</PButton>
				<PTooltip :disabled="presetCX !== 'UNIVERSE'">
					<template #trigger>
						<PButton
							type="secondary"
							size="sm"
							:disabled="presetCX === 'UNIVERSE'"
							@click="applyPreset('trade_now')">
							{{ $t("exchanges.rule.preset_trade_now") }}
						</PButton>
					</template>
					{{ $t("exchanges.rule.preset_trade_now_universe") }}
				</PTooltip>
			</div>
		</div>

		<PButtonGroup
			role="group"
			:aria-label="$t('exchanges.rule.mode_label')"
			class="self-start flex-wrap">
			<PButton
				v-for="mode in modes"
				:key="mode"
				size="sm"
				:pressed="state.mode === mode"
				@click="setMode(mode)">
				{{ $t(`exchanges.rule.mode.${mode}`) }}
			</PButton>
		</PButtonGroup>

		<p v-if="state.mode === 'inherit'" class="text-sm">
			<span class="text-muted">{{ $t("exchanges.rule.inherited") }}</span>
			{{ inheritedLabel }}
		</p>

		<div
			v-for="side in sides"
			:key="side"
			class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<span class="w-10 text-muted text-sm">
				{{ $t(`exchanges.rule.side.${side}`) }}
			</span>
			<PButtonGroup
				role="group"
				class="flex-wrap"
				:aria-label="
					$t('exchanges.rule.exchange_label', {
						side: $t(`exchanges.rule.side.${side}`),
					})
				">
				<PButton
					v-for="exchange in RULE_EXCHANGES"
					:key="exchange"
					size="sm"
					:pressed="state[side]?.exchange === exchange"
					@click="setExchange(side, exchange)">
					<span
						class="inline-block size-2 rounded-full mr-1.5"
						:style="{ background: CX_DOT_COLOR[exchange] }" />
					{{
						exchange === "UNIVERSE"
							? $t("exchanges.labels.universe")
							: exchange
					}}
				</PButton>
				<PButton
					v-if="side !== 'both'"
					size="sm"
					:pressed="state[side] === null"
					@click="setExchange(side, null)">
					{{ $t("exchanges.rule.not_set") }}
				</PButton>
			</PButtonGroup>
			<PSelect
				v-if="state[side]"
				class="w-32"
				size="sm"
				:aria-label="
					$t('exchanges.rule.basis_label', {
						side: $t(`exchanges.rule.side.${side}`),
					})
				"
				:value="state[side]!.basis"
				:options="basisOptions(state[side])"
				@update:value="(v) => setBasis(side, v as ExchangeBasis)" />
		</div>

		<p class="text-muted text-sm">{{ $t("exchanges.rule.help") }}</p>
	</section>
</template>
