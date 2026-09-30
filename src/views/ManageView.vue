<script setup lang="ts">
	import {
		computed,
		type ComputedRef,
		defineAsyncComponent,
		nextTick,
		onUnmounted,
		ref,
		type Ref,
	} from "vue";
	import { useUnsavedGuard } from "@/lib/useUnsavedGuard";

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
	import ManageSaveBar from "@/features/manage/components/ManageSaveBar.vue";
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
	import type { Plan } from "@/features/api/schemas/planningData.schemas";
	import type { CX } from "@/features/api/schemas/cxData.schemas";
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type ManageEmpire from "@/features/manage/components/ManageEmpire.vue";
	import type ManagePlanEmpireAssignments from "@/features/manage/components/ManagePlanEmpireAssignments.vue";

	// UI
	import { useToast } from "@/ui";
	const toast = useToast();

	const empireList: Ref<PlanEmpireElement[]> = ref([]);
	const planList: Ref<Plan[]> = ref([]);
	const cxList: Ref<CX[]> = ref([]);

	async function planOnComplete() {
		trackUser({
			user_plans: planList.value.length,
			user_empires: empireList.value.length,
			user_exchanges: cxList.value.length,
		});
	}

	// Save bar: CX selects and plan assignments, saved together
	const empireRef: Ref<InstanceType<typeof ManageEmpire> | null> = ref(null);
	const matrixRef: Ref<InstanceType<
		typeof ManagePlanEmpireAssignments
	> | null> = ref(null);

	const cxChanged: ComputedRef<number> = computed(
		() => empireRef.value?.changedCount ?? 0
	);
	const matrixChanged: ComputedRef<number> = computed(
		() => matrixRef.value?.changes.changedCount ?? 0
	);
	const totalChanged: ComputedRef<number> = computed(
		() => cxChanged.value + matrixChanged.value
	);
	const saveDetail: ComputedRef<string | undefined> = computed(() => {
		const changes = matrixRef.value?.changes;
		if (!changes || changes.changedCount === 0) return undefined;
		return t("management.assignments.plan_count", {
			plans: t("management.assignments.plans", changes.planCount),
			empires: t("management.assignments.empires", changes.empireCount),
		});
	});

	const saveState: Ref<"idle" | "saving" | "error"> = ref("idle");
	const justSaved: Ref<boolean> = ref(false);
	let savedTimer: ReturnType<typeof setTimeout> | undefined;

	async function saveAll(): Promise<void> {
		// PButton stays clickable while loading, a double click saves once
		if (saveState.value === "saving") return;
		saveState.value = "saving";
		try {
			// a part saved before a failure has no changes left on retry
			if (cxChanged.value > 0) await empireRef.value?.save();
			if (matrixChanged.value > 0) await matrixRef.value?.save();
			await nextTick();

			saveState.value = "idle";
			justSaved.value = true;
			clearTimeout(savedTimer);
			savedTimer = setTimeout(() => (justSaved.value = false), 4000);
		} catch (err) {
			console.error(err);
			saveState.value = "error";
			toast(t("management.save_bar.error"), { type: "error" });
		}
	}

	function discardAll(): void {
		empireRef.value?.discard();
		matrixRef.value?.discard();
		saveState.value = "idle";
	}

	// Route and Browser Guard: leaving with unsaved changes
	useUnsavedGuard(
		() => totalChanged.value > 0,
		() => t("management.save_bar.leave_unsaved")
	);

	onUnmounted(() => clearTimeout(savedTimer));
</script>

<template>
	<WrapperPlanningDataLoader
		empire-list
		plan-list
		load-c-x
		load-shared
		@data:cx="(value: CX[]) => (cxList = value)"
		@data:empire:list="(value: PlanEmpireElement[]) => (empireList = value)"
		@data:plan:list="(value: Plan[]) => (planList = value)"
		@complete="planOnComplete">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap justify-between gap-3">
			<h1 class="text-2xl font-bold my-auto">
				{{ $t("management.title") }}
			</h1>
			<HelpDrawer file-name="management" />
		</div>
		<div
			class="border-b border-white/10 grid grid-cols-1 lg:grid-cols-[60%_auto] divide-x divide-white/10 child:px-6 child:py-3">
			<div>
				<AsyncManageEmpire
					ref="empireRef"
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
				ref="matrixRef"
				:empires="empireList"
				:plans="planList"
				:saved="justSaved"
				@update:empire-list="(empireData) => (empireList = empireData)"
				@update:plan-list="(planData) => (planList = planData)" />
		</div>
		<ManageSaveBar
			v-if="totalChanged > 0"
			:count="totalChanged"
			:detail="saveDetail"
			:state="saveState"
			@save="saveAll"
			@discard="discardAll" />
		<!-- the bar never covers the last rows -->
		<div v-if="totalChanged > 0" class="h-6" />
	</WrapperPlanningDataLoader>
</template>
