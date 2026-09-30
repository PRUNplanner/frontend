<script setup lang="ts">
	import { onMounted, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { useHead } from "@unhead/vue";

	useHead({
		title: `${t("fio.repair.view_title")} | PRUNplanner`,
	});

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { useFIORepair } from "@/features/fio/useFIORepair";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Components
	import WrapperGameDataLoader from "@/features/wrapper/components/WrapperGameDataLoader.vue";
	import FIORepairPlanet from "@/features/fio/components/FIORepairPlanet.vue";

	// Util
	import { relativeFromDate } from "@/util/date";

	const planningStore = usePlanningStore();

	const { planetRepairTable } = useFIORepair(
		ref(planningStore.fio_sites_planets)
	);

	// a use of the tool is a repair table shown, not the empty page
	onMounted(() => {
		if (planetRepairTable.value.length > 0)
			trackEvent("tool:use", { tool_name: "fio_repair" });
	});
</script>

<template>
	<WrapperGameDataLoader load-materials>
		<div class="min-h-screen flex flex-col">
			<div
				class="px-6 py-3 border-b border-white/10 flex flex-row justify-between">
				<h1 class="text-2xl font-bold my-auto">
					{{ $t("fio.repair.title") }}
				</h1>
				<div class="my-auto">
					{{
						$t("fio.repair.fio_last_update", {
							last_updated: relativeFromDate(
								planningStore.fio_storage_timestamp ?? 0,
								true
							),
						})
					}}
				</div>
			</div>

			<div
				class="grow grid grid-cols-1 gap-3 divide-x divide-white/10 child:px-6 child:py-3">
				<div>
					<FIORepairPlanet :repair-data="planetRepairTable" />
				</div>
			</div>
		</div>
	</WrapperGameDataLoader>
</template>
