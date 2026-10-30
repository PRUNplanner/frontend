<script setup lang="ts">
	// Components

	import App from "@/App.vue";
	import PConfirmHost from "@/ui/components/PConfirmHost.vue";
	import PToastHost from "@/ui/components/PToastHost.vue";
	// not lazy: after a deploy the old build's chunks are gone, the notice
	// has to be in the bundle already
	import VersionUpdateNotice from "@/layout/components/VersionUpdateNotice.vue";
	import { useVersionCheck } from "@/lib/useVersionCheck";
	const { showNotice } = useVersionCheck();

	// Unhead
	import { computed } from "vue";
	import { useRoute } from "vue-router";
	import { useI18n } from "vue-i18n";
	import { useHead } from "@unhead/vue";
	import { useUserStore } from "@/stores/userStore";
	import { htmlLang, SITE_URL } from "@/lib/seo/site";
	const userStore = useUserStore();
	const route = useRoute();
	const { t, locale } = useI18n();

	// views set their title (and may override the description), the
	// landing page its own full title
	useHead({
		titleTemplate: (title) =>
			title ? `${title} · PRUNplanner` : "PRUNplanner",
		htmlAttrs: {
			lang: computed(() => htmlLang(locale.value)),
			// colour-blind palette swaps the --color-* tokens in style.css
			"data-palette": computed(() => userStore.preferences.colorPalette),
		},
		meta: [
			{
				name: "description",
				content: () => t("homepage.seo.description"),
			},
			{
				name: "robots",
				content: () => (route.meta.indexable ? undefined : "noindex"),
			},
		],
		link: computed(() =>
			route.meta.indexable
				? [{ rel: "canonical", href: `${SITE_URL}${route.path}` }]
				: []
		),
	});
</script>

<template>
	<App />
	<PConfirmHost />
	<PToastHost>
		<VersionUpdateNotice v-if="userStore.isLoggedIn && showNotice" />
	</PToastHost>
</template>
