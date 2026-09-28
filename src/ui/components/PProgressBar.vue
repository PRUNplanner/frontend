<script setup lang="ts">
	import { computed } from "vue";

	const { step, total } = defineProps<{ step: number; total: number }>();

	const percentage = computed(() => Math.round((step / total) * 100));
</script>

<template>
	<div class="flex flex-row items-center">
		<div class="w-full bg-gray-800 size-2 rounded-full overflow-hidden">
			<div
				class="flex h-full overflow-hidden transition-all duration-300 ease-out bg-prunplanner"
				:style="{ width: percentage + '%' }"></div>
		</div>
		<div class="w-12.5 text-xs text-end text-nowrap text-white/60">
			{{ step }} / {{ total }}
		</div>
	</div>
</template>
