<script setup lang="ts">
	const { title, description = undefined } = defineProps<{
		title: string;
		description?: string;
	}>();
</script>

<template>
	<section
		class="px-6 py-6 grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,48rem)] gap-x-12 gap-y-3 border-b border-line">
		<div>
			<h2 class="text-lg font-bold text-ink-strong">{{ title }}</h2>
			<p v-if="description" class="pt-1 text-sm text-muted">
				{{ description }}
			</p>
		</div>
		<div class="flex flex-col gap-3 min-w-0">
			<slot />
		</div>
	</section>
</template>
