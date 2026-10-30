<script setup lang="ts">
	import { computed } from "vue";

	const { size = undefined, color = undefined } = defineProps<{
		size?: number;
		color?: string;
	}>();

	const style = computed(() => {
		return {
			...(size
				? {
						width: `${size}px`,
						height: `${size}px`,
						lineHeight: `${size}px`,
					}
				: {
						width: "1em",
						height: "1em",
						lineHeight: "1em",
					}),
			...(color ? { color } : {}),
		};
	});
</script>

<template>
	<div class="picon inline-block" :style="style">
		<slot />
	</div>
</template>
