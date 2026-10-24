<script setup lang="ts" generic="T extends string | number">
	/**
	 * Segmented control: one choice of a few views, a pressed button per
	 * option in a sunken track. Single toggles stay `PButton pressed`.
	 *
	 * @author jplacht
	 */
	const {
		options,
		label,
		size = "md",
		block = false,
	} = defineProps<{
		options: { value: T; label: string; disabled?: boolean }[];
		/** the group's accessible name */
		label: string;
		/** 24 or 28 px segments */
		size?: "sm" | "md";
		/** fills the width, the segments share it; "phone" below `sm` only */
		block?: boolean | "phone";
	}>();

	const value = defineModel<T>("value", { required: true });
</script>

<template>
	<div
		role="group"
		:aria-label="label"
		class="gap-0.5 p-0.5 rounded-panel border border-line bg-surface-sunken"
		:class="
			block === 'phone'
				? 'flex w-full sm:inline-flex sm:w-auto'
				: block
					? 'flex w-full'
					: 'inline-flex'
		">
		<button
			v-for="o in options"
			:key="o.value"
			type="button"
			class="touch-target px-3 rounded-control text-[13px] font-medium whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
			:class="[
				size === 'sm' ? 'h-6' : 'h-7',
				block ? 'flex-1 min-w-0' : '',
				block === 'phone' ? 'sm:flex-none' : '',
				value === o.value
					? 'bg-selected text-ink-strong ring-1 ring-inset ring-line-strong'
					: 'text-muted-strong enabled:hover:bg-hover enabled:hover:text-ink-strong',
			]"
			:disabled="o.disabled"
			:aria-pressed="value === o.value"
			@click="value = o.value">
			{{ o.label }}
		</button>
	</div>
</template>
