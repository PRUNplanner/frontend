<script setup lang="ts">
	import { useHead } from "@unhead/vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	useHead({
		title: t("planet_search.view_title"),
		meta: [
			{
				name: "description",
				content: t("planet_search.description"),
			},
		],
	});

	// Components
	import PlanetSearchPage from "@/features/planet_search/components/PlanetSearchPage.vue";
</script>

<template>
	<!-- the page waits for the game data in its body only (frame first) -->
	<PlanetSearchPage />
</template>
