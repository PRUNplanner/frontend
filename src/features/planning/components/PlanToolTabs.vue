<script setup lang="ts" generic="T extends string">
	/**
	 * One view at a time: a tab strip, where clicking the open tab closes
	 * it again. A dot marks a tab with something to look at.
	 */
	defineProps<{
		tabs: { key: T; label: string; dot?: string }[];
		active: T | null;
		label: string;
	}>();

	const emit = defineEmits<{
		(e: "toggle", key: T): void;
	}>();
</script>

<template>
	<nav :aria-label="label" class="flex min-w-0 overflow-x-auto [scrollbar-width:thin] gap-x-1">
		<button
			v-for="tab in tabs"
			:key="tab.key"
			type="button"
			:aria-pressed="active === tab.key ? 'true' : 'false'"
			class="flex items-center gap-1.5 h-10 pointer-coarse:h-11 px-2.5 border-b-2 cursor-pointer text-nowrap hover:text-white"
			:class="
				active === tab.key
					? 'border-prunplanner text-white font-medium'
					: 'border-transparent text-muted-strong'
			"
			@click="emit('toggle', tab.key)">
			{{ tab.label }}
			<span
				v-if="tab.dot"
				role="img"
				:aria-label="tab.dot"
				class="size-1.5 rounded-full bg-warning" />
		</button>
	</nav>
</template>
