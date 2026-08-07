<script setup lang="ts">
	import { computed, ComputedRef } from "vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// UI
	import { PTable } from "@/ui";

	/**
	 * Plan wide repair cost, shown per repair cycle and per day.
	 *
	 * @author raukk
	 */
	const props = defineProps<{
		/** Repair cycle length in days */
		repairDay: number;
		/** Plan total repair cost per day */
		totalCostPerDay: number;
		/** Repair material demand per day, keyed by ticker */
		materialUnitsPerDay: Record<string, number>;
	}>();

	const costPerPeriod: ComputedRef<number> = computed(
		() => props.totalCostPerDay * props.repairDay
	);

	const materialCount: ComputedRef<number> = computed(
		() => Object.keys(props.materialUnitsPerDay).length
	);
</script>

<template>
	<h3 class="font-bold pb-3">
		{{ $t("raukk_repair.totals.title") }}
	</h3>
	<PTable striped>
		<tbody>
			<tr>
				<td>{{ $t("raukk_repair.totals.cycle") }}</td>
				<td class="text-end">
					{{
						$t("raukk_repair.totals.cycle_value", {
							days: repairDay,
						})
					}}
				</td>
			</tr>
			<tr>
				<td>{{ $t("raukk_repair.totals.per_period") }}</td>
				<td class="text-end">
					{{ formatNumber(costPerPeriod) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
			</tr>
			<tr>
				<td>{{ $t("raukk_repair.totals.per_day") }}</td>
				<td class="text-end">
					{{ formatNumber(totalCostPerDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
			</tr>
			<tr>
				<td>{{ $t("raukk_repair.totals.materials") }}</td>
				<td class="text-end">
					{{ materialCount }}
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
