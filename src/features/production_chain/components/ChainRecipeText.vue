<script setup lang="ts">
	// Types & Interfaces
	import type { Recipe } from "@/features/api/schemas/gameData.schemas";

	const { recipe, ticker } = defineProps<{
		recipe: Recipe;
		/** the material the chain makes with it, in bold */
		ticker: string;
	}>();
</script>

<template>
	<span class="inline-flex items-center gap-x-1 tabular-nums whitespace-nowrap">
		<template v-for="(m, i) in recipe.inputs" :key="`i-${m.material_ticker}`">
			<span v-if="i > 0" class="text-muted">+</span>
			<span>{{ m.material_amount }}&#8239;{{ m.material_ticker }}</span>
		</template>
		<span v-if="!recipe.inputs.length" class="text-muted">
			{{ $t("production_chains.table.nothing") }}
		</span>
		<span class="text-muted">→</span>
		<template
			v-for="(m, i) in recipe.outputs"
			:key="`o-${m.material_ticker}`">
			<span v-if="i > 0" class="text-muted">+</span>
			<span :class="{ 'font-bold': m.material_ticker === ticker }">
				{{ m.material_amount }}&#8239;{{ m.material_ticker }}
			</span>
		</template>
	</span>
</template>
