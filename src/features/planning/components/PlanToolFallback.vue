<script setup lang="ts">
	// Composables
	import { useDelay } from "@/features/wrapper/useDelay";

	// UI
	import { PSpin } from "@/ui";

	// quick tool loads show no spinner
	const show = useDelay(200);
</script>

<template>
	<!--
		fixed root: Suspense keeps the fallback's first root node, a v-if
		root goes stale once shown and the next tool switch inserts into null
	-->
	<div>
		<div v-if="show" class="w-full text-center py-5">
			<PSpin />
		</div>
	</div>
</template>
