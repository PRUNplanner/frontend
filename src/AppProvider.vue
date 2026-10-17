<script setup lang="ts">
	// Components

	import App from "@/App.vue";
	import { PConfirmHost, PToastHost } from "@/ui";
	// not lazy: after a deploy the old build's chunks are gone, the notice
	// has to be in the bundle already
	import VersionUpdateNotice from "@/layout/components/VersionUpdateNotice.vue";
	import { useVersionCheck } from "@/lib/useVersionCheck";
	const { showNotice } = useVersionCheck();

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
	<PToastHost>
		<VersionUpdateNotice v-if="userStore.isLoggedIn && showNotice" />
	</PToastHost>
</template>
