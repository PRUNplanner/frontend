<script setup lang="ts">
	import { defineAsyncComponent, ref, Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Unhead
	import { useHead } from "@unhead/vue";
	useHead({
		title: `${t("management.view_title")} | PRUNplanner`,
	});

	// Composables
	import { trackUser } from "@/lib/analytics/useAnalytics";

	// Components
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	const AsyncManagePlanEmpireAssignments = defineAsyncComponent(
		() =>
			import("@/features/manage/components/ManagePlanEmpireAssignments.vue")
	);
	const AsyncManageCX = defineAsyncComponent(
		() => import("@/features/manage/components/ManageCX.vue")
	);
	const AsyncManageEmpire = defineAsyncComponent(
		() => import("@/features/manage/components/ManageEmpire.vue")
	);

	// Types & Interfaces
	import { IPlan } from "@/stores/planningStore.types";
	import type { CX } from "@/features/api/schemas/cxData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";

	const empireList: Ref<PlanEmpireElement[]> = ref([]);
	const planList: Ref<IPlan[]> = ref([]);
	const cxList: Ref<CX[]> = ref([]);

	async function planOnComplete() {
		trackUser({
			user_plans: planList.value.length,
			user_empires: empireList.value.length,
			user_exchanges: cxList.value.length,
		});
	}
</script>

<template>
	<WrapperPlanningDataLoader
		empire-list
		plan-list
		load-c-x
		load-shared
		@data:cx="(value: CX[]) => (cxList = value)"
		@data:empire:list="(value: PlanEmpireElement[]) => (empireList = value)"
		@data:plan:list="(value: IPlan[]) => (planList = value)"
		@complete="planOnComplete">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row justify-between gap-x-3">
			<h1 class="text-2xl font-bold my-auto">
				{{ $t("management.title") }}
			</h1>
			<HelpDrawer file-name="management" />
		</div>
		<div
			class="border-b border-white/10 grid grid-cols-1 lg:grid-cols-[60%_auto] divide-x divide-white/10 child:px-6 child:py-3">
			<div>
				<AsyncManageEmpire
					:empires="empireList"
					:cx="cxList"
					@update:cx-list="(cxData) => (cxList = cxData)"
					@update:empire-list="
						(empireData) => (empireList = empireData)
					" />
			</div>
			<div>
				<AsyncManageCX
					:cx="cxList"
					@update:cx-list="(cxData) => (cxList = cxData)" />
			</div>
		</div>
		<div class="px-6 pb-3 pt-4">
			<AsyncManagePlanEmpireAssignments
				:empires="empireList"
				:plans="planList"
				@update:empire-list="(empireData) => (empireList = empireData)"
				@update:plan-list="(planData) => (planList = planData)" />
		</div>
	</WrapperPlanningDataLoader>
</template>
