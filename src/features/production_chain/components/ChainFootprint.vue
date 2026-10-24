<script setup lang="ts">
	import { computed } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatMoney } from "@/features/production_chain/productionChain.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type {
		IChainBuildingType,
		IChainTotals,
	} from "@/features/production_chain/engine/chainSolver.types";

	const { totals, buildingTypes, prices } = defineProps<{
		totals: IChainTotals;
		buildingTypes: IChainBuildingType[];
		/** CX BUY price by ticker, for the construction materials */
		prices: (ticker: string) => number;
	}>();

	const money = (v: number) =>
		t("production_chains.money", { value: formatMoney(v) });

	const expertise = computed(() =>
		Object.entries(totals.expertise).sort((a, b) => b[1] - a[1])
	);
	const habArea = computed(() => totals.habs.reduce((s, h) => s + h.area, 0));
</script>

<template>
	<!-- its sections are items of the aside's grid -->
	<div class="contents">
		<section class="rounded-panel border border-line p-3">
			<div class="flex justify-between pb-2">
				<h2 class="font-bold">{{ $t("production_chains.footprint.buildings") }}</h2>
				<span class="text-xs text-muted">{{ $t("production_chains.footprint.exact_built") }}</span>
			</div>
			<ul class="flex flex-col gap-1 tabular-nums" data-testid="chain-footprint-buildings">
				<li
					v-for="b in buildingTypes"
					:key="b.ticker"
					class="grid grid-cols-[1fr_auto_2rem] gap-2 items-baseline">
					<span class="min-w-0 truncate">
						<span class="font-mono font-bold">{{ b.ticker }}</span>
						<span class="text-xs text-muted pl-1">{{ b.materials.join(", ") }}</span>
					</span>
					<span class="text-muted">{{ formatNumber(b.exact, 2) }}</span>
					<span class="text-right font-bold">{{ b.built }}</span>
				</li>
			</ul>
			<p class="text-xs text-muted pt-2">{{ $t("production_chains.footprint.share_note") }}</p>
		</section>

		<section class="rounded-panel border border-line p-3">
			<h2 class="font-bold pb-2">{{ $t("production_chains.footprint.workforce") }}</h2>
			<div class="grid grid-cols-5 gap-1">
				<div
					v-for="(n, tier) in totals.workforce"
					:key="tier"
					class="rounded-control border border-line px-1.5 py-1 min-w-0">
					<div class="text-xs text-muted truncate">{{ $t(`game.workforce_type.${tier}`) }}</div>
					<div class="font-bold tabular-nums">{{ formatNumber(n, 0) }}</div>
				</div>
			</div>
			<p class="text-xs text-muted pt-2">
				{{ $t("production_chains.footprint.workforce_note", { value: money(totals.upkeep) }) }}
			</p>
		</section>

		<section v-if="totals.habs.length" class="rounded-panel border border-line p-3">
			<div class="flex justify-between pb-2">
				<h2 class="font-bold">{{ $t("production_chains.footprint.habitation") }}</h2>
				<span class="text-xs text-muted">
					{{ $t("production_chains.footprint.area", { n: formatNumber(habArea, 0) }) }}
				</span>
			</div>
			<ul class="flex flex-col gap-1 tabular-nums">
				<li
					v-for="h in totals.habs"
					:key="h.ticker"
					class="grid grid-cols-[1fr_auto_2rem] gap-2">
					<span class="font-mono">{{ h.ticker }}</span>
					<span class="text-muted">
						{{ $t("production_chains.footprint.area", { n: formatNumber(h.area, 0) }) }}
					</span>
					<span class="text-right font-bold">{{ h.amount }}</span>
				</li>
			</ul>
		</section>

		<section class="rounded-panel border border-line p-3">
			<div class="flex justify-between pb-2">
				<h2 class="font-bold">{{ $t("production_chains.footprint.expertise") }}</h2>
				<span class="text-xs text-muted">{{ $t("production_chains.footprint.expertise_unit") }}</span>
			</div>
			<ul class="flex flex-col gap-1 tabular-nums">
				<li v-for="[name, n] in expertise" :key="name" class="flex justify-between">
					<span>{{ $t(`game.expertise.${name}`) }}</span>
					<span>{{ n }}</span>
				</li>
			</ul>
		</section>

		<section class="rounded-panel border border-line p-3">
			<div class="flex justify-between pb-2">
				<h2 class="font-bold">{{ $t("production_chains.footprint.construction") }}</h2>
				<span class="text-xs text-muted tabular-nums">{{ money(totals.construction) }}</span>
			</div>
			<ul class="flex flex-col gap-1 tabular-nums">
				<li
					v-for="m in totals.constructionMaterials"
					:key="m.ticker"
					class="grid grid-cols-[auto_1fr_3.5rem] gap-2 items-center">
					<MaterialTile :key="m.ticker" :ticker="m.ticker" />
					<span class="text-right text-muted">{{ money(m.amount * prices(m.ticker)) }}</span>
					<span class="text-right">{{ formatNumber(m.amount, 0) }}</span>
				</li>
			</ul>
			<p class="text-xs text-muted pt-2">{{ $t("production_chains.footprint.construction_note") }}</p>
		</section>
	</div>
</template>
