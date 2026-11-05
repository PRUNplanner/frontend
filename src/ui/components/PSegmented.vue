<script setup lang="ts" generic="T extends string | number | null">
	/**
	 * Segmented control: one choice of a few views, a pressed button per
	 * option in a sunken track. Single toggles stay `PButton pressed`.
	 * The `option` slot renders richer content (a dot, a count) per option.
	 * `h-fit`: a flex parent never stretches the track taller than its segments.
	 *
	 * @author jplacht
	 */
	const {
		options,
		label,
		size = "md",
		block = false,
	} = defineProps<{
		options: {
			value: T;
			label: string;
			disabled?: boolean;
			title?: string;
		}[];
		/** the group's accessible name */
		label: string;
		/** 24 or 28 px segments */
		size?: "sm" | "md";
		/** fills the width, the segments share it; "phone" below `sm` only */
		block?: boolean | "phone";
	}>();

	defineSlots<{
		option?(props: {
			option: {
				value: T;
				label: string;
				disabled?: boolean;
				title?: string;
			};
		}): unknown;
	}>();

	const value = defineModel<T>("value", { required: true });
	// every click, also on the picked option (v-model only reports changes)
	const emit = defineEmits<{ select: [value: T] }>();

	function pick(option: T): void {
		value.value = option;
		emit("select", option);
	}
</script>

<template>
	<div
		role="group"
		:aria-label="label"
		class="h-fit items-center gap-0.5 p-0.5 rounded-panel border border-line bg-surface-sunken"
		:class="
			block === 'phone'
				? 'flex w-full sm:inline-flex sm:w-fit'
				: block
					? 'flex w-full'
					: 'inline-flex w-fit'
		">
		<button
			v-for="o in options"
			:key="String(o.value)"
			type="button"
			class="touch-target inline-flex items-center justify-center gap-1.5 px-3 rounded-control text-[13px] leading-none font-medium whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
			:class="[
				size === 'sm' ? 'h-6' : 'h-7',
				block ? 'flex-1 min-w-0' : '',
				block === 'phone' ? 'sm:flex-none' : '',
				value === o.value
					? 'bg-selected text-ink-strong ring-1 ring-inset ring-line-strong'
					: 'text-muted-strong enabled:hover:bg-hover enabled:hover:text-ink-strong',
			]"
			:disabled="o.disabled"
			:title="o.title"
			:aria-pressed="value === o.value"
			@click="pick(o.value)">
			<slot name="option" :option="o">{{ o.label }}</slot>
		</button>
	</div>
</template>
