<script setup lang="ts">
	// Theme
	import {
		NConfigProvider,
		NModalProvider,
		NDialogProvider,
		darkTheme,
	} from "naive-ui";
	import { prunplannerTheme } from "@/layout/prunplannerNaiveUI";

	// Components

	import App from "@/App.vue";

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
	<n-config-provider :theme="darkTheme" :theme-overrides="prunplannerTheme">
		<n-modal-provider>
			<n-dialog-provider>
				<App />
			</n-dialog-provider>
		</n-modal-provider>
	</n-config-provider>
</template>
