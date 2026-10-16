<script setup lang="ts">
	import { computed } from "vue";

	// Components
	import RepairDueTag from "@/features/repair_analysis/components/RepairDueTag.vue";
	import XITTransferActionButton from "@/features/xit/components/XITTransferActionButton.vue";

	// Util
	import { dueInDays } from "@/features/repair_analysis/repairAnalysis.util";
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import type { IRepairFIOBuilding } from "@/features/repair_analysis/useRepairAnalysis.types";

	/**
	 * The player's buildings of one type on the plan's planet (FIO): days
	 * since repair, condition and when each is due at the chosen interval.
	 * The XIT for due ones uses FIO's own repair materials.
	 *
	 * @author jplacht
	 */
	const { ticker, planet, buildings, interval, planned, stale } =
		defineProps<{
			ticker: string;
			planet: string;
			buildings: IRepairFIOBuilding[];
			interval: number;
			/** buildings of the type in the plan */
			planned: number;
			/** FIO data older than a day */
			stale: boolean;
		}>();

	const DUE_SOON = 7;

	const rows = computed(() =>
		buildings
			.map((b) => ({
				...b,
				due:
					b.ageDays === undefined
						? undefined
						: dueInDays(interval, b.ageDays),
			}))
			// due first, never repaired last
			.sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity))
	);

	const dueElements = computed(() => {
		const sum = new Map<string, number>();
		for (const b of rows.value)
			if (b.due !== undefined && b.due <= DUE_SOON)
				for (const m of b.repairMaterials)
					sum.set(m.ticker, (sum.get(m.ticker) ?? 0) + m.amount);
		return [...sum].map(([t, value]) => ({ ticker: t, value }));
	});
</script>

<template>
	<div class="flex flex-col gap-1 min-w-0" data-testid="repair-fio-buildings">
		<div class="flex justify-between items-center gap-2">
			<h3 class="text-sm font-bold text-ink-strong">
				{{
					$t("plan.tools.repair_analysis.fio.title", {
						ticker,
						planet,
					})
				}}
			</h3>
			<XITTransferActionButton
				v-if="dueElements.length"
				source="repair_due"
				:elements="dueElements"
				:button-text="$t('plan.tools.repair_analysis.fio.xit_due')"
				transfer-name="Repair" />
		</div>
		<p
			v-if="buildings.length !== planned"
			class="text-xs text-muted-strong"
			data-testid="repair-fio-count">
			{{
				$t("plan.tools.repair_analysis.fio.count", {
					built: buildings.length,
					planned,
				})
			}}
		</p>
		<div
			v-for="b in rows"
			:key="b.index"
			class="grid grid-cols-[24px_1fr_auto_auto] items-center gap-2 py-1 border-t border-line text-sm"
			data-testid="repair-fio-building">
			<span class="text-muted">#{{ b.index }}</span>
			<span>
				{{
					b.ageDays === undefined
						? $t("plan.tools.repair_analysis.fio.never_repaired")
						: $t("plan.tools.repair_analysis.fio.since_repair", {
								n: b.ageDays,
							})
				}}
			</span>
			<span class="text-muted-strong">
				{{ formatNumber(b.condition * 100, 1) }} %
			</span>
			<RepairDueTag v-if="b.due !== undefined" :days="b.due" />
			<span v-else />
		</div>
		<p
			v-if="stale && dueElements.length"
			class="text-xs text-muted"
			data-testid="repair-fio-stale">
			{{ $t("plan.tools.repair_analysis.fio.stale_amounts") }}
		</p>
	</div>
</template>
