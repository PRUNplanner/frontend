<script setup lang="ts">
	import { useHead } from "@unhead/vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	useHead({
		title: `${t("planet_search.view_title")} | PRUNplanner`,
	});

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import PlanetSearchPage from "@/features/planet_search/components/PlanetSearchPage.vue";
</script>

<template>
	<WrapperGameDataLoader load-materials load-exchanges>
		<PlanetSearchPage />
	</WrapperGameDataLoader>
</template>
