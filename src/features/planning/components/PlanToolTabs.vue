<script setup lang="ts" generic="T extends string">
	/**
	 * One tool panel open at a time: a tab strip, where clicking the open
	 * tab closes it again.
	 */
	defineProps<{
		tabs: { key: T; label: string }[];
		active: T | null;
		label: string;
	}>();

	const emit = defineEmits<{
		(e: "toggle", key: T): void;
	}>();
</script>

<template>
	<nav :aria-label="label" class="flex flex-wrap gap-x-1">
		<button
			v-for="tab in tabs"
			:key="tab.key"
			type="button"
			:aria-pressed="active === tab.key ? 'true' : 'false'"
			class="px-3 py-2 -mb-px border-b-2 cursor-pointer hover:text-white"
			:class="
				active === tab.key
					? 'border-prunplanner text-white font-bold'
					: 'border-transparent text-muted-strong'
			"
			@click="emit('toggle', tab.key)">
			{{ tab.label }}
		</button>
	</nav>
</template>
