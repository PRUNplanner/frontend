<script setup lang="ts" generic="T extends string">
	/**
	 * A small segmented control: one of a few values, each a pressed
	 * toggle button (sort, filter, unit)
	 *
	 * @author jplacht
	 */
	defineProps<{
		options: { value: T; label: string }[];
		label: string;
	}>();

	const model = defineModel<T>({ required: true });
</script>

<template>
	<div
		role="group"
		:aria-label="label"
		class="inline-flex shrink-0 border border-line rounded-control overflow-hidden">
		<button
			v-for="o in options"
			:key="o.value"
			type="button"
			:aria-pressed="model === o.value ? 'true' : 'false'"
			class="h-6 min-w-6 pointer-coarse:h-11 px-2 text-xs cursor-pointer text-nowrap"
			:class="
				model === o.value
					? 'bg-selected text-white'
					: 'text-muted-strong hover:bg-hover hover:text-white'
			"
			@click="model = o.value">
			{{ o.label }}
		</button>
	</div>
</template>
