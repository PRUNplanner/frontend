<script setup lang="ts">
	import { computed } from "vue";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Types & Interfaces
	import { IMaterialIO } from "@/features/planning/usePlanCalculation.types";

	// UI
	import { PTable } from "@/ui";

	const { materials } = defineProps<{
		materials: IMaterialIO[];
	}>();

	const totalData = computed(() => {
		return materials.reduce(
			(acc, current) => {
				acc.cost += current.price * -1;
				acc.weight += current.totalWeight * -1;
				acc.volume += current.totalVolume * -1;
				return acc;
			},
			{ cost: 0, weight: 0, volume: 0 }
		);
	});
</script>

<template>
	<PTable striped>
		<thead>
			<tr>
				<th>Material</th>
				<th>Amount</th>
				<th class="text-end!">Cost</th>
			</tr>
		</thead>
		<tbody>
			<tr
				v-for="material in materials"
				:key="`RepairMaterial#${material.ticker}`">
				<td>
					<MaterialTile
						:key="`RepairMaterial#Tile#${material.ticker}`"
						:ticker="material.ticker" />
				</td>
				<td>
					{{ material.input }}
				</td>
				<td class="text-end">
					{{ formatNumber(-1 * material.price) }}
					<span class="pl-1 font-light text-white/50"> $ </span>
				</td>
			</tr>
		</tbody>
		<tfoot>
			<tr>
				<td colspan="3" class="border-t!">
					<div
						class="grid grid-cols-2 gap-1 child:even:text-end child:not-even:font-bold">
						<div>Total Cost</div>
						<div>
							{{ formatNumber(totalData.cost) }}
							<span class="pl-1 font-light text-white/50">
								$
							</span>
						</div>
						<div>Total Weight</div>
						<div>
							{{ formatNumber(totalData.weight) }}
							<span class="pl-1 font-light text-white/50">
								t
							</span>
						</div>
						<div>Total Volume</div>
						<div>
							{{ formatNumber(totalData.volume) }}
							<span class="pl-1 font-light text-white/50">
								m³
							</span>
						</div>
					</div>
				</td>
			</tr>
		</tfoot>
	</PTable>
</template>
