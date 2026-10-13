<script setup lang="ts">
	import { computed } from "vue";

	const { size = "md", color = "brand" } = defineProps<{
		size?: "xs" | "md" | "lg" | "xl";
		color?: "brand" | "white" | "muted";
	}>();

	// whole class names, so Tailwind sees them
	const colorClass = {
		brand: "text-prunplanner",
		white: "text-white",
		muted: "text-muted",
	};

	const sizeInPx = computed(() => {
		switch (size) {
			case "xs":
				return 12;
			case "md":
				return 16;
			case "lg":
				return 24;
			case "xl":
				return 36;
			default:
				return 12; // fallback
		}
	});
</script>

<template>
	<div class="pspin inline-flex items-center">
		<svg
			class="animate-spin"
			:class="colorClass[color]"
			:style="{ width: `${sizeInPx}px`, height: `${sizeInPx}px` }"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			:viewBox="`0 0 24 24`">
			<circle
				class="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				stroke-width="4"></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	</div>
</template>
