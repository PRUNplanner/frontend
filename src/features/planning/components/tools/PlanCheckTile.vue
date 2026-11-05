<script setup lang="ts">
	// Composables
	import { useMaterialData } from "@/database/services/useMaterialData";

	// Components
	import MaterialTile from "@/features/material_tile/components/MaterialTile.vue";

	/**
	 * A plan check's material: the usual tile, or for a ticker the game
	 * data doesn't know (crafted rows, stale plans) the same-sized neutral
	 * tile, without the tile's lookup and its error report.
	 *
	 * @author jplacht
	 */
	const { ticker } = defineProps<{ ticker: string }>();

	const { materialsMap } = useMaterialData();
</script>

<template>
	<MaterialTile v-if="materialsMap[ticker]" :ticker="ticker" />
	<span
		v-else
		translate="no"
		class="material-tile inline-flex items-center justify-center px-2 font-bold"
		data-unknown-material>
		{{ ticker }}
	</span>
</template>
