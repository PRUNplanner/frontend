<script setup lang="ts">
	import type { PropType } from "vue";

	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	// Util
	import { formatNumber } from "@/util/numbers";

	// Components

	// Types & Interfaces
	import type { IGraphFlowMaterialAnalysis } from "@/features/production_chain/productionGraph.types";

	// UI
	import { PTable } from "@/ui";

	defineProps({
		materialAnalysis: {
			type: Object as PropType<IGraphFlowMaterialAnalysis>,
			required: true,
		},
	});
</script>

<template>
	<h3 class="font-bold py-3">
		{{ $t("production_chains.analysis_materials.title") }}
	</h3>
	<PTable striped>
		<thead>
			<tr>
				<th>
					{{
						$t(
							"production_chains.analysis_materials.table.material"
						)
					}}
				</th>
				<th>
					{{
						$t("production_chains.analysis_materials.table.amount")
					}}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr
				v-for="material in materialAnalysis"
				:key="material.materialTicker">
				<td>
					<MaterialTile
						:key="material.materialTicker"
						:ticker="material.materialTicker" />
				</td>
				<td>
					{{ formatNumber(material.amount) }}
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
