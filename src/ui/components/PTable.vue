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
	@reference "../../assets/css/style.css";

	.ptable-container {
		@apply border border-line rounded-panel bg-clip-border;
	}

	.ptable {
		@apply text-left table-auto;
	}

	.ptable th {
		@apply bg-surface-sunken text-left font-bold;
	}

	.ptable th,
	.ptable td {
		@apply px-1 py-1 sm:px-2 @lg:px-2;
	}

	.ptable th {
		@apply border-b border-line;
	}
	.ptable td {
		@apply border-b border-line;
	}

	.ptable-striped tr {
		@apply odd:bg-white/3;
	}

	.ptable th.numeric,
	.ptable td.numeric {
		@apply text-right;
	}

	.ptable tr:last-child td {
		@apply border-b-0;
	}
</style>
