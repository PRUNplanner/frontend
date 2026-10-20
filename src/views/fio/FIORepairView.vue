<script setup lang="ts">
	import { computed, defineAsyncComponent, type Ref, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { useHead } from "@unhead/vue";

	useHead({
		title: t("fio.repair.view_title"),
	});

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";
	import { useUserStore } from "@/stores/userStore";

	// Components
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";

	const AsyncWrapperGameDataLoader = defineAsyncComponent(
		() => import("@/features/wrapper/components/WrapperGameDataLoader.vue")
	);
	const AsyncFIORepairOverview = defineAsyncComponent(
		() => import("@/features/fio_repair/components/FIORepairOverview.vue")
	);

	// Util
	import { relativeFromDate } from "@/util/date";

	// Types & Interfaces
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

	// UI
	import { PNotice } from "@/ui";

	const planningStore = usePlanningStore();
	const userStore = useUserStore();

	const DAY_MS = 86_400_000;

	const sitePlanets = computed(() =>
		Object.values(planningStore.fio_sites_planets).map(
			(s) => s.PlanetIdentifier
		)
	);
	const stale = computed(
		() =>
			!!planningStore.fio_storage_timestamp &&
			Date.now() -
				new Date(planningStore.fio_storage_timestamp).getTime() >
				DAY_MS
	);
	const lastUpdate = computed(() =>
		relativeFromDate(planningStore.fio_storage_timestamp ?? undefined, true)
	);

	const plans: Ref<Plan[]> = ref([]);
	const empires: Ref<PlanEmpireElement[]> = ref([]);
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap gap-x-6 gap-y-2 justify-between">
			<h1 class="text-2xl font-bold my-auto">
				{{ $t("fio.repair.title") }}
			</h1>
			<div class="flex flex-row items-center gap-x-3 text-sm">
				<span
					v-if="userStore.hasFIO"
					:class="stale ? 'text-warning' : ''"
					data-testid="fio-repair-last-update">
					{{
						$t("fio.repair.fio_last_update", {
							last_updated: lastUpdate,
						})
					}}
				</span>
				<HelpDrawer file-name="fio_repair" />
			</div>
		</div>

		<div class="px-6 py-4 flex flex-col gap-3">
			<PNotice
				v-if="!userStore.hasFIO"
				class="max-w-190"
				data-testid="fio-repair-no-fio">
				<b class="block font-medium text-ink-strong">
					{{ $t("fio.repair.states.no_fio_title") }}
				</b>
				<i18n-t keypath="fio.repair.states.no_fio" tag="span">
					<template #link>
						<router-link
							to="/profile"
							class="text-link hover:underline">
							{{ $t("fio.repair.states.profile") }}
						</router-link>
					</template>
				</i18n-t>
			</PNotice>
			<PNotice
				v-else-if="!sitePlanets.length"
				class="max-w-190"
				data-testid="fio-repair-no-sites">
				{{ $t("fio.repair.states.no_sites") }}
			</PNotice>
			<template v-else>
				<PNotice
					v-if="stale"
					type="warning"
					data-testid="fio-repair-stale">
					{{ $t("fio.repair.states.stale", { when: lastUpdate }) }}
				</PNotice>
				<WrapperPlanningDataLoader
					plan-list
					empire-list
					load-c-x
					@data:plan:list="(value: Plan[]) => (plans = value)"
					@data:empire:list="
						(value: PlanEmpireElement[]) => (empires = value)
					">
					<AsyncWrapperGameDataLoader
						load-materials
						load-exchanges
						load-recipes
						load-buildings
						:load-planet-multiple="sitePlanets">
						<AsyncFIORepairOverview
							:plans="plans"
							:empires="empires" />
					</AsyncWrapperGameDataLoader>
				</WrapperPlanningDataLoader>
			</template>
		</div>
	</div>
</template>
