<script setup lang="ts">
	import { computed, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { formatShare } from "@/features/cx/marketCheck.util";
	import { formatNumber } from "@/util/numbers";

	// Components
	import MarketFlagIcon from "@/features/cx/components/MarketFlagIcon.vue";

	// Types & Interfaces
	import type {
		IFlaggedCheck,
		MarketFlagLevel,
	} from "@/features/cx/marketCheck.types";

	// UI
	import { PPopover } from "@/ui";

	/*
	 * A market flag: hover shows only a native title, click or tap opens
	 * the details. Esc, an outside click or a second click close them and
	 * focus returns to the icon (PPopover).
	 */
	const {
		check,
		where = "plan",
		planShares = undefined,
		openLink = false,
	} = defineProps<{
		check: IFlaggedCheck;
		where?: "plan" | "empire";
		// the empire: each plan's own share of the volume
		planShares?: { name: string; sharePct: number | null }[];
		// offers "Open Plan check →"
		openLink?: boolean;
	}>();

	const emit = defineEmits<{ (e: "open"): void }>();

	const { t } = useI18n();
	const show = ref(false);

	watch(show, (open) => {
		if (open)
			trackEvent("plan:market_flag_open", { where, level: check.level });
	});

	const flag = computed(() =>
		t(`cx.market_flags.flags.${check.flags[0]}`)
	);
	const title = computed(() =>
		t("cx.market_flags.title", { ticker: check.ticker, flag: flag.value })
	);
	const exchange = computed(() =>
		check.exchange === "UNIVERSE"
			? t("cx.market_flags.all_exchanges")
			: check.exchange
	);
	const side = computed(() => {
		const sells = check.delta > 0;
		if (where === "empire")
			return t(
				`cx.market_flags.popover.${sells ? "empire_sells" : "empire_buys"}`
			);
		return t(`cx.market_flags.popover.${sells ? "you_sell" : "you_buy"}`);
	});
	const price = (v: number) =>
		v > 0 ? `${formatNumber(v, 0)} ȼ` : t("cx.market_flags.popover.none");

	const LEVEL_CLASS: Record<MarketFlagLevel, string> = {
		red: "text-negative",
		amber: "text-warning",
		muted: "text-muted-strong",
	};

	function open(): void {
		show.value = false;
		emit("open");
	}
</script>

<template>
	<PPopover
		v-model:show="show"
		placement="bottom-start"
		panel-class="p-3 w-72 max-w-[calc(100vw-1rem)]"
		role="dialog"
		:aria-label="title">
		<template #trigger>
			<button
				type="button"
				class="inline-flex shrink-0 items-center justify-center size-11 sm:size-6 rounded cursor-pointer hover:bg-white/10"
				:title="title"
				:aria-label="title"
				aria-haspopup="dialog"
				data-market-flag>
				<MarketFlagIcon :level="check.level" />
			</button>
		</template>
		<div class="flex flex-col gap-1.5 text-sm">
			<div class="flex items-center gap-2 pb-1">
				<span class="font-bold text-white">{{ check.ticker }}</span>
				<span class="font-bold" :class="LEVEL_CLASS[check.level]">
					{{ flag }}
				</span>
			</div>
			<dl class="flex flex-col divide-y divide-white/10">
				<div class="flex justify-between gap-3 py-1">
					<dt class="text-muted-strong">{{ side }}</dt>
					<dd class="font-bold tabular-nums">
						{{
							t("cx.market_flags.popover.per_day", {
								value: formatNumber(Math.abs(check.delta)),
							})
						}}
					</dd>
				</div>
				<div class="flex justify-between gap-3 py-1">
					<dt class="text-muted-strong">
						{{ t("cx.market_flags.popover.traded", { exchange }) }}
					</dt>
					<dd class="font-bold tabular-nums text-right">
						{{
							t("cx.market_flags.popover.traded_value", {
								total: formatNumber(check.traded30d, 0),
								daily: formatNumber(check.traded30d / 30, 0),
							})
						}}
					</dd>
				</div>
				<div class="flex justify-between gap-3 py-1">
					<dt class="text-muted-strong">
						{{
							t(
								where === "empire"
									? "cx.market_flags.popover.empire_share"
									: "cx.market_flags.popover.share"
							)
						}}
					</dt>
					<dd
						class="font-bold tabular-nums"
						:class="
							check.flags.some(
								(f) => f === 'bigger' || f === 'large_share'
							)
								? LEVEL_CLASS[check.level]
								: ''
						">
						{{ formatShare(check.sharePct) }}
					</dd>
				</div>
				<div
					v-if="planShares?.length"
					class="flex flex-col gap-0.5 py-1"
					data-plan-shares>
					<span class="text-muted-strong">
						{{ t("cx.market_flags.empire.plan_shares") }}
					</span>
					<div
						v-for="p in planShares"
						:key="p.name"
						class="flex justify-between gap-3">
						<span class="truncate">{{ p.name }}</span>
						<span class="tabular-nums">
							{{ formatShare(p.sharePct) }}
						</span>
					</div>
				</div>
				<div class="flex justify-between gap-3 py-1">
					<dt class="text-muted-strong">
						{{ t("cx.market_flags.popover.bid_ask") }}
					</dt>
					<dd class="tabular-nums text-right">
						<span class="font-bold">
							{{ price(check.bid) }} · {{ price(check.ask) }}
						</span>
						<span
							v-if="check.spreadPct !== null"
							class="text-muted-strong">
							({{
								t("cx.market_flags.popover.spread", {
									spread: formatNumber(check.spreadPct, 0),
								})
							}})
						</span>
					</dd>
				</div>
			</dl>
			<p class="text-xs text-muted-strong">
				{{ t("cx.market_flags.popover.caveat") }}
			</p>
			<button
				v-if="openLink"
				type="button"
				class="self-start min-h-11 sm:min-h-6 text-link hover:underline cursor-pointer"
				@click="open">
				{{ t("cx.market_flags.popover.open") }}
			</button>
		</div>
	</PPopover>
</template>
