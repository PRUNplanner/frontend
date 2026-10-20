<script setup lang="ts">
	import { computed } from "vue";

	// Util
	import { materialCategoryClass } from "@/util/text";

	// a material's ticker in its category colours, without the material
	// tile's game data
	const { ticker, category } = defineProps<{
		ticker: string;
		category: string;
	}>();

	const colour = computed(() => materialCategoryClass(category));
</script>

<template>
	<span
		class="inline-flex items-center justify-center w-12 h-8 shrink-0 rounded-sm text-xs font-bold text-shadow-[0_1px_1px_rgb(34,34,34)]"
		:class="colour">
		{{ ticker }}
	</span>
</template>
