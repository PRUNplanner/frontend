<script setup lang="ts">
	// Composables
	import { useDelay } from "@/features/wrapper/useDelay";

	// UI
	import { PSpin } from "@/ui";

	defineProps({
		height: {
			type: Number,
			required: false,
			default: undefined,
		},
	});

	// fast renders skip the stripes
	const show = useDelay(400);
</script>

<template>
	<!-- keeps its size while hidden, so the layout doesn't jump -->
	<div
		class="relative w-full bg-center bg-repeat"
		:class="[
			height ? `h-[${height}px]` : 'h-full',
			show && 'bg-[url(/images/bg_striped_prunplanner.png)]',
		]">
		<div v-if="show" class="absolute inset-0 flex items-center justify-center">
			<div class="bg-black p-8 rounded shadow-lg text-center">
				<PSpin size="lg" />
				<div class="pt-3">Rendering View</div>
			</div>
		</div>
	</div>
</template>
