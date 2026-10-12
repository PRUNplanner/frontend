<script setup lang="ts">
	// Theme
	import { NConfigProvider, NMessageProvider } from "naive-ui";
	import {
		prunplannerDarkTheme,
		prunplannerTheme,
	} from "@/layout/prunplannerNaiveUI";

	// Components

	import App from "@/App.vue";
	import { PConfirmHost } from "@/ui";

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
		bodyAttrs: {
			class: computed(() => (userStore.isLoggedIn ? "naive-global" : "")),
		},
	});
</script>

<template>
	<n-config-provider
		:theme="prunplannerDarkTheme"
		:theme-overrides="prunplannerTheme">
		<!-- bottom-right, above the plan page's floating Insights button -->
		<n-message-provider
			placement="bottom-right"
			container-style="bottom: 5rem; right: 1rem">
			<App />
			<PConfirmHost />
		</n-message-provider>
	</n-config-provider>
</template>
