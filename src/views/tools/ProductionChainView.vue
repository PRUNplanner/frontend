<script setup lang="ts">
	import { computed, defineAsyncComponent } from "vue";
	import { useRoute } from "vue-router";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: t("production_chains.view_title"),
	});

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import ChainPage from "@/features/production_chain/components/ChainPage.vue";
	// the check loads the empire's plans and the planet index on its own
	const CheckPage = defineAsyncComponent(
		() =>
			import("@/features/production_chain/components/check/CheckPage.vue")
	);

	// Plan a chain or Check an empire
	const route = useRoute();
	const checking = computed(() => route.query.mode === "check");
</script>

<template>
	<!-- the chain reads recipes, buildings and prices synchronously, so only after they are loaded -->
	<WrapperGameDataLoader
		load-materials
		load-recipes
		load-buildings
		load-exchanges>
		<WrapperPlanningDataLoader load-c-x>
			<CheckPage v-if="checking" />
			<ChainPage v-else />
		</WrapperPlanningDataLoader>
	</WrapperGameDataLoader>
</template>
