<script setup lang="ts">
	import { ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({ title: t("base_roi.view_title") });

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import BaseROIPage from "@/features/base_roi/components/BaseROIPage.vue";

	const refReady: Ref<boolean> = ref(false);
	const refCXUuid: Ref<string | undefined> = ref(undefined);
</script>

<template>
	<BaseROIPage v-model:cx-uuid="refCXUuid" :ready="refReady">
		<template #loader>
			<WrapperGameDataLoader
				load-exchanges
				load-materials
				load-buildings
				load-recipes>
				<WrapperPlanningDataLoader
					load-c-x
					@update:cx-uuid="(d) => (refCXUuid = d)">
					<span class="hidden" @vue:mounted="refReady = true" />
				</WrapperPlanningDataLoader>
			</WrapperGameDataLoader>
		</template>
	</BaseROIPage>
</template>
