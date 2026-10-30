<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";

	// Util
	import {
		formatQuantity,
		translateRef,
	} from "@/features/material_tile/materialMarket.util";

	// Types & Interfaces
	import type {
		DailyContext,
		IPlanLine,
	} from "@/features/material_tile/materialMarket.types";

	// the plan's amount and Market check's verdict, in the card and drawer
	const {
		plan,
		daily,
		dailyContext,
		limits = false,
	} = defineProps<{
		plan: IPlanLine;
		// + sold, − bought per day
		daily: number;
		dailyContext: DailyContext;
		// adds "same limits as Plan check"
		limits?: boolean;
	}>();

	const { t } = useI18n();

	const LEVEL_CLASS: Record<IPlanLine["level"], string> = {
		fine: "text-positive",
		amber: "text-warning",
		red: "text-negative",
		muted: "text-muted-strong",
	};

	const side = computed(() =>
		t(
			`material_tile.card.plan.${dailyContext}_${daily < 0 ? "buys" : "sells"}`
		)
	);
	const amount = (days: number) => formatQuantity(Math.abs(daily) * days);
</script>

<template>
	<div
		class="flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 rounded-panel bg-white/4 border border-line"
		data-plan-line>
		<div>
			<div class="text-xs text-muted">{{ side }}</div>
			<div class="font-bold text-ink-strong">
				{{
					$t("material_tile.card.plan.per_day", { amount: amount(1) })
				}}
			</div>
			<div class="text-xs text-muted">
				{{
					$t("material_tile.card.plan.periods", {
						d7: amount(7),
						d30: amount(30),
					})
				}}
			</div>
		</div>
		<div class="flex-1 min-w-48">
			<div class="text-xs text-muted">
				<template v-if="plan.checkExchange === 'UNIVERSE'">
					{{ $t("material_tile.card.plan.check_universe") }}
				</template>
				<template v-else-if="plan.checkExchange">
					{{ $t("material_tile.card.plan.check") }}
					<span class="font-bold text-ink-strong" data-check-cx>
						· {{ plan.checkExchange }}
					</span>
				</template>
				<template v-else>
					{{ $t("material_tile.card.plan.across") }}
				</template>
			</div>
			<div
				class="font-bold"
				:class="LEVEL_CLASS[plan.level]"
				:data-level="plan.level"
				data-plan-chip>
				{{ translateRef(t, plan.chip) }}
			</div>
			<div class="text-xs text-muted-strong" data-plan-detail>
				{{ translateRef(t, plan.detail) }}
				<template v-if="limits">
					· {{ $t("material_tile.details.same_limits") }}
				</template>
			</div>
		</div>
	</div>
</template>
