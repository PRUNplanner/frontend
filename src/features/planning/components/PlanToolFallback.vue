<script setup lang="ts">
	// Composables
	import { useDelay } from "@/features/wrapper/useDelay";

	// UI
	import { PSpin } from "@/ui";

	// quick tool loads show no spinner
	const show = useDelay(200);
</script>

<template>
	<div v-if="show" class="w-full text-center py-5">
		<PSpin />
	</div>
</template>
