<script setup lang="ts">
	import { computed, ComputedRef } from "vue";

	// Calculations
	import { calculateRepairPerUnit } from "@/features/raukk_sourcing/calculations/repairPerUnit";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { IProductionBuilding } from "@/features/planning/usePlanCalculation.types";
	import {
		IRaukkRepairOutputCost,
		IRaukkRepairPerUnitResult,
	} from "@/features/raukk_sourcing/calculations/repairPerUnit";

	// UI
	import { PTable } from "@/ui";

	/**
	 * Repair cost attributed to each unit of plan output.
	 *
	 * @author raukk
	 */
	const props = defineProps<{
		/** Plan production buildings, recipes included */
		buildings: IProductionBuilding[];
		/** Key: building name, value: repair cost per day */
		repairCostPerDayByBuilding: Record<string, number>;
		/** Repair cycle length in days */
		repairDay: number;
	}>();

	const result: ComputedRef<IRaukkRepairPerUnitResult> = computed(() =>
		calculateRepairPerUnit({
			buildings: props.buildings,
			repairCostPerDayByBuilding: props.repairCostPerDayByBuilding,
		})
	);

	const elements: ComputedRef<IRaukkRepairOutputCost[]> = computed(() =>
		Object.values(result.value.outputs).sort(
			(a, b) => b.costPerDay - a.costPerDay
		)
	);

	const allocatedCostPerDay: ComputedRef<number> = computed(() =>
		elements.value.reduce((sum, e) => sum + e.costPerDay, 0)
	);
</script>

<template>
	<h3 class="font-bold pb-1">
		{{ $t("raukk_repair.per_unit.title") }}
	</h3>
	<div class="pb-3 text-white/50 text-sm">
		{{ $t("raukk_repair.per_unit.description") }}
	</div>

	<div v-if="elements.length === 0" class="text-white/50">
		{{ $t("raukk_repair.per_unit.no_data") }}
	</div>

	<PTable v-else striped>
		<thead>
			<tr>
				<th>{{ $t("raukk_repair.per_unit.material") }}</th>
				<th class="text-end!">
					{{ $t("raukk_repair.per_unit.units_per_day") }}
				</th>
				<th class="text-end!">
					{{ $t("raukk_repair.per_unit.cost_per_unit") }}
				</th>
				<th class="text-end!">
					{{ $t("raukk_repair.per_unit.cost_per_day") }}
				</th>
				<th class="text-end!">
					{{ $t("raukk_repair.per_unit.cost_per_period") }}
				</th>
				<th class="text-end!">
					{{ $t("raukk_repair.per_unit.share") }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr
				v-for="element in elements"
				:key="`RaukkRepairPerUnit#${element.ticker}`">
				<td>
					<MaterialTile
						:key="`RaukkRepairPerUnit#Tile#${element.ticker}`"
						:ticker="element.ticker" />
				</td>
				<td class="text-end">
					{{ formatNumber(element.unitsPerDay) }}
				</td>
				<td class="text-end">
					{{ formatNumber(element.costPerUnit) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td class="text-end">
					{{ formatNumber(element.costPerDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td class="text-end">
					{{ formatNumber(element.costPerDay * repairDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td class="text-end">
					{{
						formatNumber(
							allocatedCostPerDay > 0
								? (100 * element.costPerDay) /
										allocatedCostPerDay
								: 0
						)
					}}
					<span class="pl-1 font-light text-white/50">%</span>
				</td>
			</tr>
		</tbody>
		<tfoot>
			<tr>
				<td colspan="3" class="border-t! font-bold">
					{{ $t("raukk_repair.per_unit.total") }}
				</td>
				<td class="border-t! text-end font-bold">
					{{ formatNumber(allocatedCostPerDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td class="border-t! text-end font-bold">
					{{ formatNumber(allocatedCostPerDay * repairDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td class="border-t!" />
			</tr>
			<tr v-if="result.unallocatedCostPerDay > 0">
				<td colspan="3">
					{{ $t("raukk_repair.per_unit.unallocated") }}
				</td>
				<td class="text-end">
					{{ formatNumber(result.unallocatedCostPerDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td class="text-end">
					{{ formatNumber(result.unallocatedCostPerDay * repairDay) }}
					<span class="pl-1 font-light text-white/50">ȼ</span>
				</td>
				<td />
			</tr>
		</tfoot>
	</PTable>
</template>
