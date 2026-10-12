<script setup lang="ts">
	// Components

	import App from "@/App.vue";
	import { PConfirmHost, PToastHost } from "@/ui";

	// Unhead
	import { computed } from "vue";
	import { useHead } from "@unhead/vue";
	import { useUserStore } from "@/stores/userStore";
	const userStore = useUserStore();
	useHead({
		title: "PRUNplanner",
		// colour-blind palette swaps the --color-* tokens in style.css
		htmlAttrs: {
			"data-palette": computed(() => userStore.preferences.colorPalette),
		},
	});
</script>

<template>
	<App />
	<PConfirmHost />
	<PToastHost />
</template>
