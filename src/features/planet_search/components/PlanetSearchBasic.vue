<script setup lang="ts">
	import { computed, type ComputedRef, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Types & Interfaces
	import type { Planet } from "@/features/api/schemas/gameData.schemas";

	// UI
	import { PForm, PFormItem, PInput, PButton } from "@/ui";
	import { SearchSharp } from "@vicons/material";

	const refSearchId: Ref<string | null> = ref(null);

	const emit = defineEmits<{
		(e: "update:results", value: Planet[]): void;
	}>();

	const isLoading: Ref<boolean> = ref(false);
	const canSearch: ComputedRef<boolean> = computed(
		() => refSearchId.value !== null && refSearchId.value.length >= 3
	);

	async function doSearch() {
		if (canSearch.value) {
			isLoading.value = true;

			trackEvent("planet_search_basic", { searchId: refSearchId.value! });

			try {
				await useQuery("GetPlanetSearchSingle", {
					searchId: refSearchId.value!,
				})
					.execute()
					.then((data: Planet[]) => emit("update:results", data))
					.finally(() => (isLoading.value = false));
			} catch {
				emit("update:results", []);
			}
		}
	}
</script>

<template>
	<div class="flex flex-row flex-wrap gap-3 justify-between">
		<h2 class="text-lg font-bold my-auto">
			{{ $t("planet_search.basic.title") }}
		</h2>
		<PButton :loading="isLoading" :disabled="!canSearch" @click="doSearch">
			<template #icon><SearchSharp /></template>
			{{ $t("common.buttons.search") }}
		</PButton>
	</div>

	<div class="py-3 text-white/60">
		{{ $t("planet_search.basic.description") }}
	</div>

	<PForm as-form @submit="doSearch">
		<PFormItem :label="t('planet_search.basic.form_id')">
			<PInput v-model:value="refSearchId" class="w-full" />
		</PFormItem>
	</PForm>
</template>
