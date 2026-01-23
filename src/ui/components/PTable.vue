<script setup lang="ts">
	const { striped = false } = defineProps<{ striped?: boolean }>();
</script>

<template>
	<div class="ptable-container relative flex flex-col overflow-x-auto">
		<table class="ptable" :class="striped ? 'ptable-striped' : ''">
			<slot />
		</table>
	</div>
</template>

<style>
	@reference "tailwindcss";

	.ptable-container {
		@apply border border-[#2d2d30] rounded  bg-clip-border;
	}

	.ptable {
		@apply text-left table-auto;
	}

	.ptable th {
		@apply bg-black text-left font-bold;
	}

	.ptable th,
	.ptable td {
		@apply px-1 py-1 sm:px-2 @lg:px-2;
	}

	.ptable th {
		@apply border-b border-[#2d2d30];
	}
	.ptable td {
		@apply border-b border-[#2d2d30];
	}

	.ptable-striped tr {
		@apply odd:bg-white/3;
	}

	.ptable tr:last-child td {
		@apply border-b-0;
	}
</style>
