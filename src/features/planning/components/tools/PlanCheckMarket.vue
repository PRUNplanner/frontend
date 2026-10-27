<script setup lang="ts">
	import { computed, ref } from "vue";
	import { useI18n } from "vue-i18n";
	import { RouterLink } from "vue-router";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useExchangeData } from "@/database/services/useExchangeData";
	import { useMaterialData } from "@/database/services/useMaterialData";
	import { usePlanContext } from "@/features/planning/usePlanContext";

	// Engine
	import { calculatePlan } from "@/features/planning/engine/calculatePlan";

	// Util
	import {
		countLevels,
		formatShare,
		MARKET_SHARE_AMBER,
		MARKET_SHARE_RED,
		marketCheck,
	} from "@/features/cx/marketCheck.util";
	import { realisticPlan } from "@/features/planning/util/whatIf.util";
	import { priceSourceLabel } from "@/features/exchanges/exchangeLabel.util";
	import { ALL_PLANETS } from "@/features/exchanges/cxEdit.util";
	import { formatNumber, formatPayback } from "@/util/numbers";

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import MarketFlagIcon from "@/features/cx/components/MarketFlagIcon.vue";
	import PInlineBar from "@/ui/charts/PInlineBar.vue";

	// Types & Interfaces
	import type { Planet } from "@/features/api/schemas/gameData.schemas";
	import type { PlanEmpire } from "@/features/api/schemas/planningData.schemas";
	import type { IPlanInput } from "@/features/planning/engine/engine.types";
	import type {
		IMarketCheck,
		MarketFlagLevel,
	} from "@/features/cx/marketCheck.types";
	import type { PDataTableColumn } from "@/ui/ui.types";

	// UI
	import { PDataTable } from "@/ui";

	const { t } = useI18n();

	const props = defineProps<{
		plan: IPlanInput["plan"];
		empire: PlanEmpire | undefined;
		cxUuid: string | undefined;
		planet: Planet;
		/** the viewer's own plan: links to its CX and to setting one */
		own?: boolean;
	}>();

	const planningStore = usePlanningStore();
	const { getGameData, createPrices } = usePlanContext();
	const { getExchangeTickerLoaded } = useExchangeData();
	const { materialsMap, getMaterialClass } = useMaterialData();

	// runs only while the view is open; a new price book per run picks up
	// CX preference changes
	const data = computed(() => {
		const input: IPlanInput = {
			plan: props.plan,
			empire: props.empire,
			cxUuid: props.cxUuid,
		};
		const ctx = {
			...getGameData(),
			planet: props.planet,
			prices: createPrices(props.planet.planet_natural_id, props.cxUuid),
		};
		const { result, overview } = calculatePlan(
			{ ...input, recipeOptions: false },
			ctx
		);
		return {
			overview,
			prices: ctx.prices,
			checks: marketCheck(
				result.materialio,
				ctx.prices,
				getExchangeTickerLoaded
			),
			// without a CX preference there's no exchange to price at
			real: props.cxUuid
				? realisticPlan(input, ctx, getExchangeTickerLoaded)
				: undefined,
		};
	});

	const checks = computed(() => data.value.checks);
	const counts = computed(() => countLevels(checks.value));

	/*
	 * Exchange caption
	 */

	const exchanges = computed(() => [
		...new Set(
			checks.value
				.map((c) => c.exchange)
				.filter((e) => e !== "UNIVERSE")
		),
	]);
	const exchangeLabel = computed(() =>
		exchanges.value.length
			? exchanges.value.join(", ")
			: t("cx.market_flags.all_exchanges")
	);

	/*
	 * At real prices
	 */

	const money = (v: number) => formatNumber(v, 0);
	const profit = computed(() => data.value.overview.profit);
	const real = computed(() => {
		const r = data.value.real;
		if (!r) return undefined;
		const traded = new Set(checks.value.map((c) => c.ticker));
		const askBid = r.calculation.overview.profit;
		const diff = askBid - profit.value;
		return {
			profit: askBid,
			diff,
			diffPct: profit.value ? (diff / Math.abs(profit.value)) * 100 : null,
			roi: r.calculation.overview.roi,
			keptZero: [...r.kept.zero].filter((k) => traded.has(k)),
			keptFallback: [...r.kept.fallback].filter((k) => traded.has(k)),
			keptUniverse: [...r.kept.universe].filter((k) => traded.has(k)),
		};
	});
	const cxName = computed(() =>
		props.cxUuid ? planningStore.getCX(props.cxUuid).cx_name : ""
	);

	/*
	 * What this means
	 */

	const worst = computed(() => {
		const c = checks.value[0];
		return c && (c.level === "red" || c.level === "amber") ? c : undefined;
	});
	function meaning(c: IMarketCheck): string {
		const flag = c.flags[0];
		const shareFlag = flag === "bigger" || flag === "large_share";
		const exchange =
			c.exchange === "UNIVERSE"
				? t("cx.market_flags.all_exchanges")
				: c.exchange;
		return t(
			`cx.market_flags.means.${shareFlag ? `${flag}_${c.delta > 0 ? "sell" : "buy"}` : flag}`,
			{ ticker: c.ticker, exchange, share: formatShare(c.sharePct) }
		);
	}

	// a flagged material's price rule in Exchanges, with a CX
	function ruleLink(c: IMarketCheck) {
		if (!props.cxUuid || !c.level) return undefined;
		const source = data.value.prices.getPriceSource(
			c.ticker,
			c.delta > 0 ? "SELL" : "BUY"
		);
		const planetLevel =
			source.level === "planet_ticker" ||
			source.level === "planet_exchange";
		const scope = planetLevel
			? props.planet.planet_natural_id
			: ALL_PLANETS;
		return {
			to: `/exchanges/${props.cxUuid}?scope=${scope}`,
			label: priceSourceLabel(source, t),
		};
	}

	/*
	 * Table and cards
	 */

	const LEVEL_TEXT: Record<MarketFlagLevel, string> = {
		red: "text-negative",
		amber: "text-warning",
		muted: "text-muted-strong",
	};
	const LEVEL_ROW: Record<MarketFlagLevel, string> = {
		red: "bg-negative/8",
		amber: "bg-warning/8",
		muted: "",
	};
	const LEVEL_CARD: Record<MarketFlagLevel, string> = {
		red: "border-negative/60",
		amber: "border-warning/60",
		muted: "border-white/10",
	};
	const barTone = (c: IMarketCheck) =>
		c.flags.includes("bigger")
			? "negative"
			: c.flags.includes("large_share")
				? "warning"
				: "neutral";
	const shareClass = (c: IMarketCheck) =>
		c.flags.includes("bigger")
			? "text-negative font-bold"
			: c.flags.includes("large_share")
				? "text-warning font-bold"
				: "";
	const chipClass = (ticker: string) =>
		materialsMap.value[ticker] ? getMaterialClass(ticker) : "bg-black/40";
	const side = (c: IMarketCheck) =>
		t(`plan.tools.plan_check.side.${c.delta > 0 ? "sell" : "buy"}`);
	const price = (v: number) =>
		v > 0 ? money(v) : t("cx.market_flags.popover.none");
	const MARKS = [MARKET_SHARE_AMBER, MARKET_SHARE_RED];

	const columns = computed<PDataTableColumn<IMarketCheck>[]>(() => {
		const col = (key: string, right = false) => ({
			key,
			title: t(`plan.tools.plan_check.market.columns.${key}`),
			...(right ? { align: "right" as const } : {}),
		});
		return [
			col("material"),
			col("side"),
			col("per_day", true),
			{ ...col("share"), minWidth: 160 },
			col("traded", true),
			col("bid_ask", true),
			col("spread", true),
			{ ...col("check"), minWidth: 160 },
		];
	});
	const rowKey = (c: IMarketCheck) => c.ticker;
	const rowClass = (c: IMarketCheck) => (c.level ? LEVEL_ROW[c.level] : "");

	// phone cards: the flagged ones and a few more, the rest on request
	const CARDS = 6;
	const allCards = ref(false);
	const cardCount = computed(() =>
		allCards.value
			? checks.value.length
			: Math.max(CARDS, counts.value.red + counts.value.amber)
	);
</script>

<template>
	<div class="flex flex-col gap-3">
		<p class="text-sm text-muted-strong @[1000px]:text-right">
			<template v-if="cxUuid">
				<span class="text-white font-bold" data-exchange-caption>
					{{
						exchanges.length
							? t(
									exchanges.length > 1
										? "cx.market_flags.exchange.many"
										: "cx.market_flags.exchange.one",
									{ exchange: exchangeLabel }
								)
							: t("cx.market_flags.exchange.all")
					}}
				</span>
				· {{ t("cx.market_flags.exchange.from_plan") }}
			</template>
			<template v-else>
				<span class="text-white font-bold">
					{{ t("cx.market_flags.exchange.all") }}
				</span>
				· {{ t("cx.market_flags.exchange.no_cx") }}
				<template v-if="own">
					·
					<RouterLink
						to="/exchanges"
						class="text-link hover:underline"
						data-set-cx>
						{{ t("cx.market_flags.exchange.set_cx") }}
					</RouterLink>
				</template>
			</template>
		</p>

		<p v-if="!checks.length" class="text-muted py-6">
			{{ t("plan.tools.plan_check.market.empty") }}
		</p>
		<div
			v-else
			class="grid grid-cols-[minmax(0,1fr)] @[1000px]:grid-cols-[minmax(0,1fr)_300px] gap-3 items-start">
			<div class="flex flex-col gap-2 min-w-0">
				<!-- table from 640 px, cards below -->
				<div class="hidden @[640px]:block">
					<PDataTable
						:columns="columns"
						:data="checks"
						:row-key="rowKey"
						:row-class="rowClass"
						:min-width="760">
						<!-- the long title wraps so the Check column keeps its room -->
						<template #header-share>
							<span class="whitespace-normal">
								{{ t("plan.tools.plan_check.market.columns.share") }}
							</span>
						</template>
						<template #cell-material="{ row }">
							<span
								class="inline-block min-w-10 px-1 rounded-sm text-xs text-center font-bold"
								:class="chipClass(row.ticker)">
								{{ row.ticker }}
							</span>
						</template>
						<template #cell-side="{ row }">
							<span
								class="px-1.5 border border-white/20 rounded-sm text-xs text-muted-strong">
								{{ side(row) }}
							</span>
						</template>
						<template #cell-per_day="{ row }">
							<span class="tabular-nums">
								{{ formatNumber(Math.abs(row.delta)) }}
							</span>
						</template>
						<template #cell-share="{ row }">
							<div
								class="flex items-center gap-3"
								:aria-label="
									t('plan.tools.plan_check.market.share_label', {
										ticker: row.ticker,
										share: formatShare(row.sharePct),
									})
								">
								<PInlineBar
									class="flex-1"
									:value="row.sharePct ?? 0"
									:max="100"
									:marks="MARKS"
									:tone="barTone(row)" />
								<span
									class="w-14 text-right tabular-nums"
									:class="shareClass(row)">
									{{ formatShare(row.sharePct) }}
								</span>
							</div>
						</template>
						<template #cell-traded="{ row }">
							<span class="tabular-nums">
								{{ money(row.traded30d) }}
							</span>
						</template>
						<template #cell-bid_ask="{ row }">
							<span class="tabular-nums whitespace-nowrap">
								{{ price(row.bid) }} · {{ price(row.ask) }}
							</span>
						</template>
						<template #cell-spread="{ row }">
							<span class="tabular-nums whitespace-nowrap">
								{{
									row.spreadPct === null
										? t("cx.market_flags.popover.none")
										: `${formatNumber(row.spreadPct, 1)} %`
								}}
							</span>
						</template>
						<template #cell-check="{ row }">
							<!-- "all exchanges" is said once above the table, not per row -->
							<span
								v-if="row.level && row.flags[0] !== 'all_exchanges'"
								class="inline-flex items-center gap-1.5"
								:class="LEVEL_TEXT[row.level as MarketFlagLevel]">
								<MarketFlagIcon :level="row.level" />
								{{ t(`cx.market_flags.flags.${row.flags[0]}`) }}
							</span>
							<RouterLink
								v-if="own && ruleLink(row)"
								:to="ruleLink(row)!.to"
								class="block py-1 text-xs text-link hover:underline"
								:aria-label="
									t('plan.tools.plan_check.market.rule_link', {
										ticker: row.ticker,
										source: ruleLink(row)!.label,
									})
								"
								data-rule-link>
								{{ ruleLink(row)!.label }}
							</RouterLink>
							<span
								v-else-if="ruleLink(row)"
								class="block py-1 text-xs text-muted-strong"
								data-rule-source>
								{{ ruleLink(row)!.label }}
							</span>
							<span v-if="!row.level" class="text-muted">
								{{ t("plan.tools.plan_check.market.ok") }}
							</span>
						</template>
					</PDataTable>
				</div>

				<ul class="flex flex-col gap-2 @[640px]:hidden" data-market-cards>
					<li
						v-for="c in checks.slice(0, cardCount)"
						:key="c.ticker"
						class="flex flex-col gap-2 rounded border p-3 text-sm"
						:class="c.level ? LEVEL_CARD[c.level] : 'border-white/10'">
						<div class="flex items-center gap-2">
							<span
								class="min-w-10 px-1 rounded-sm text-xs text-center font-bold"
								:class="chipClass(c.ticker)">
								{{ c.ticker }}
							</span>
							<span
								class="px-1.5 border border-white/20 rounded-sm text-xs text-muted-strong">
								{{
									t("plan.tools.plan_check.market.card_side", {
										side: side(c),
										value: formatNumber(Math.abs(c.delta)),
									})
								}}
							</span>
							<span
								v-if="c.level && c.flags[0] !== 'all_exchanges'"
								class="ml-auto inline-flex items-center gap-1.5 text-right"
								:class="LEVEL_TEXT[c.level]">
								<MarketFlagIcon :level="c.level" />
								{{ t(`cx.market_flags.flags.${c.flags[0]}`) }}
							</span>
							<span v-else class="ml-auto text-muted">
								{{ t("plan.tools.plan_check.market.ok") }}
							</span>
						</div>
						<div class="flex items-center gap-3">
							<PInlineBar
								class="flex-1"
								:value="c.sharePct ?? 0"
								:max="100"
								:marks="MARKS"
								:tone="barTone(c)" />
							<span
								class="w-14 text-right tabular-nums"
								:class="shareClass(c)">
								{{ formatShare(c.sharePct) }}
							</span>
						</div>
						<RouterLink
							v-if="own && ruleLink(c)"
							:to="ruleLink(c)!.to"
							class="self-start py-1 text-xs text-link hover:underline"
							:aria-label="
								t('plan.tools.plan_check.market.rule_link', {
									ticker: c.ticker,
									source: ruleLink(c)!.label,
								})
							"
							data-rule-link>
							{{ ruleLink(c)!.label }}
						</RouterLink>
						<span
							v-else-if="ruleLink(c)"
							class="self-start py-1 text-xs text-muted-strong"
							data-rule-source>
							{{ ruleLink(c)!.label }}
						</span>
						<span class="text-xs text-muted-strong">
							{{
								t("plan.tools.plan_check.market.card_traded", {
									traded: money(c.traded30d),
									bid: price(c.bid),
									ask: price(c.ask),
								})
							}}
						</span>
					</li>
					<li v-if="cardCount < checks.length">
						<button
							type="button"
							class="min-h-11 text-link hover:underline cursor-pointer"
							@click="allCards = true">
							{{
								t(
									"plan.tools.plan_check.market.more",
									{ n: checks.length - cardCount },
									checks.length - cardCount
								)
							}}
						</button>
					</li>
				</ul>

				<p class="text-xs text-muted">
					{{
						t("plan.tools.plan_check.market.footnote", {
							exchange: exchangeLabel,
						})
					}}
					<span class="whitespace-nowrap">
						{{ t("plan.tools.plan_check.market.marks") }}
					</span>
				</p>
			</div>

			<div class="flex flex-col gap-3 order-first @[1000px]:order-none">
				<div
					class="flex flex-col gap-2 border border-white/10 rounded p-3 text-sm"
					data-real-prices>
					<div>
						<h3 class="font-bold text-white">
							{{ t("plan.tools.plan_check.market.real.title") }}
						</h3>
						<p v-if="cxUuid" class="text-xs text-muted-strong">
							{{
								t("plan.tools.plan_check.market.real.subtitle", {
									source: cxName,
								})
							}}
						</p>
					</div>
					<dl class="flex flex-col divide-y divide-white/10">
						<div class="flex justify-between gap-3 py-1.5">
							<dt>
								{{ t("plan.tools.plan_check.market.real.plan_profit") }}
							</dt>
							<dd class="font-bold tabular-nums">
								{{ money(profit) }} ȼ
							</dd>
						</div>
						<div class="flex justify-between gap-3 py-1.5">
							<dt>
								{{ t("plan.tools.plan_check.market.real.ask_bid") }}
							</dt>
							<dd class="font-bold tabular-nums" data-ask-bid>
								{{
									real
										? `${money(real.profit)} ȼ`
										: t("cx.market_flags.popover.none")
								}}
							</dd>
						</div>
						<template v-if="real">
							<div class="flex justify-between gap-3 py-1.5">
								<dt>
									{{
										t(
											"plan.tools.plan_check.market.real.difference"
										)
									}}
								</dt>
								<dd
									class="font-bold tabular-nums"
									:class="
										real.diff < 0
											? 'text-negative'
											: real.diff > 0
												? 'text-positive'
												: ''
									">
									{{ formatNumber(real.diff, 0, false, true) }} ȼ
									<template v-if="real.diffPct !== null">
										({{
											formatNumber(
												real.diffPct,
												1,
												false,
												true
											)
										}}
										%)
									</template>
								</dd>
							</div>
							<div class="flex justify-between gap-3 py-1.5">
								<dt>
									{{ t("plan.tools.plan_check.market.real.roi") }}
								</dt>
								<dd class="font-bold tabular-nums">
									{{ formatPayback(real.roi) }}
								</dd>
							</div>
						</template>
					</dl>
					<p v-if="!real" class="text-xs text-muted-strong">
						{{ t("plan.tools.plan_check.market.real.no_cx") }}
						<RouterLink
							v-if="own"
							to="/exchanges"
							class="text-link hover:underline"
							data-set-cx>
							{{ t("cx.market_flags.exchange.set_cx") }}
						</RouterLink>
					</p>
					<p
						v-if="real?.keptZero.length"
						class="text-xs text-muted-strong">
						{{
							t(
								"plan.tools.plan_check.market.real.kept_zero",
								{ tickers: real.keptZero.join(", ") },
								real.keptZero.length
							)
						}}
					</p>
					<p
						v-if="real?.keptUniverse.length"
						class="text-xs text-muted-strong"
						data-kept-universe>
						{{
							t(
								"plan.tools.plan_check.market.real.kept_universe",
								{ tickers: real.keptUniverse.join(", ") },
								real.keptUniverse.length
							)
						}}
					</p>
					<p
						v-if="real?.keptFallback.length"
						class="text-xs text-muted-strong">
						{{
							t(
								"plan.tools.plan_check.market.real.kept_fallback",
								{ tickers: real.keptFallback.join(", ") },
								real.keptFallback.length
							)
						}}
					</p>
				</div>

				<div
					class="flex flex-col gap-2 border border-white/10 rounded p-3 text-sm"
					data-market-means>
					<h3 class="font-bold text-white">
						{{ t("plan.tools.plan_check.market.means.title") }}
					</h3>
					<p v-if="worst" class="flex gap-2">
						<span
							class="shrink-0 h-fit min-w-10 px-1 rounded-sm text-xs text-center font-bold"
							:class="chipClass(worst.ticker)">
							{{ worst.ticker }}
						</span>
						<span>{{ meaning(worst) }}</span>
					</p>
					<p v-else>
						{{ t("plan.tools.plan_check.market.means.fine") }}
					</p>
					<dl class="flex flex-col divide-y divide-white/10">
						<div class="flex justify-between gap-3 py-1.5">
							<dt>{{ t("plan.tools.plan_check.market.means.red") }}</dt>
							<dd
								class="font-bold tabular-nums"
								:class="counts.red ? 'text-negative' : ''">
								{{ counts.red }}
							</dd>
						</div>
						<div class="flex justify-between gap-3 py-1.5">
							<dt>
								{{ t("plan.tools.plan_check.market.means.amber") }}
							</dt>
							<dd
								class="font-bold tabular-nums"
								:class="counts.amber ? 'text-warning' : ''">
								{{ counts.amber }}
							</dd>
						</div>
						<div class="flex justify-between gap-3 py-1.5">
							<dt>{{ t("plan.tools.plan_check.market.means.ok") }}</dt>
							<dd class="font-bold tabular-nums">
								{{ counts.fine }}
							</dd>
						</div>
					</dl>
					<p class="text-xs text-muted-strong">
						{{ t("plan.tools.plan_check.market.means.caveat") }}
					</p>
					<HelpDrawer
						file-name="plan"
						button-size="sm"
						button-class="self-start"
						:button-title="
							t('plan.tools.plan_check.market.means.help')
						" />
				</div>
			</div>
		</div>
	</div>
</template>
