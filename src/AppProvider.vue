<script setup lang="ts">
	// Theme
	import { NConfigProvider } from "naive-ui";
	import {
		prunplannerDarkTheme,
		prunplannerTheme,
	} from "@/layout/prunplannerNaiveUI";

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
		// naive-ui's body style, see style.css
		bodyAttrs: { class: "naive-global" },
	});
</script>

<template>
	<n-config-provider
		:theme="prunplannerDarkTheme"
		:theme-overrides="prunplannerTheme">
		<App />
		<PConfirmHost />
		<PToastHost />
	</n-config-provider>
</template>
