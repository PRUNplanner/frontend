<script setup lang="ts">
	import { computed, ref } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";

	// Util
	import { formatAmount, formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IRepairMaterialList } from "@/features/repair_analysis/useRepairAnalysis.types";

	/**
	 * Materials of one repair: tile, share of the cost, amount and cost,
	 * with totals and an XIT transfer. `limit` shows the most expensive
	 * ones first and a "Show all" button.
	 *
	 * @author jplacht
	 */
	const {
		list,
		title,
		subtitle = undefined,
		limit = undefined,
	} = defineProps<{
		list: IRepairMaterialList;
		title: string;
		subtitle?: string;
		limit?: number;
	}>();

	const showAll = ref(false);

	const shown = computed(() =>
		limit === undefined || showAll.value
			? list.materials
			: list.materials.slice(0, limit)
	);
	const maxCost = computed(() => list.materials[0]?.cost || 1);
	const xitElements = computed(() =>
		list.materials.map((m) => ({ ticker: m.ticker, value: m.amount }))
	);
</script>

<template>
	<div class="flex flex-col gap-1 min-w-0">
		<div class="flex justify-between items-center gap-3">
			<div class="flex flex-col min-w-0">
				<h3 class="text-sm font-bold text-ink-strong">{{ title }}</h3>
				<span v-if="subtitle" class="text-xs text-muted">
					{{ subtitle }}
				</span>
			</div>
			<XITTransferActionButton
				source="repair_materials"
				:elements="xitElements"
				transfer-name="Repair" />
		</div>
		<div
			v-for="m in shown"
			:key="m.ticker"
			class="grid grid-cols-[46px_minmax(0,1fr)_auto_88px] items-center gap-2 py-0.5 border-t border-line text-sm"
			data-testid="repair-material">
			<MaterialTile :key="m.ticker" :ticker="m.ticker" />
			<div class="h-1.5 rounded-sm bg-white/6" aria-hidden="true">
				<div
					class="h-full rounded-sm bg-white/45"
					:style="{ width: `${(m.cost / maxCost) * 100}%` }" />
			</div>
			<span class="text-end">{{ formatAmount(m.amount) }}</span>
			<span class="text-end text-nowrap">
				{{ formatNumber(m.cost, 0) }}
				<span class="text-muted">ȼ</span>
			</span>
		</div>
		<button
			v-if="limit !== undefined && list.materials.length > limit"
			type="button"
			class="min-h-11 border-t border-line text-link font-medium"
			:aria-expanded="showAll"
			@click="showAll = !showAll">
			{{
				showAll
					? $t("plan.tools.repair_analysis.materials.show_less")
					: $t("plan.tools.repair_analysis.materials.show_all", {
							n: list.materials.length,
						})
			}}
		</button>
		<div
			class="flex justify-between flex-wrap gap-x-3 pt-1.5 border-t border-line-strong text-sm">
			<span class="text-muted-strong">
				{{ formatNumber(list.weight, 1) }} t ·
				{{ formatNumber(list.volume, 1) }} m³
			</span>
			<span class="font-bold text-ink-strong">
				{{
					$t("plan.tools.repair_analysis.materials.total", {
						cost: formatNumber(list.cost, 0),
					})
				}}
			</span>
		</div>
	</div>
</template>
