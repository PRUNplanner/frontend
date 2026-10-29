<script setup lang="ts">
	import {
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
		title: t("management.view_title"),
	});

	// Composables
	import { provideManageData } from "@/features/manage/useManageData";

	// Components
	import WrapperPlanningDataLoader from "@/features/wrapper/components/WrapperPlanningDataLoader.vue";
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import SaveBar from "@/features/save_bar/components/SaveBar.vue";
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

	// UI
	import { useToast } from "@/ui";
	const toast = useToast();

	// Lists and the save bar's sections (CX selects, plan assignments)
	const {
		empireList,
		planList,
		cxList,
		totalChanged,
		saveDetail,
		saveSections,
		discardSections,
	} = provideManageData();

	const saveState: Ref<"idle" | "saving" | "error"> = ref("idle");
	const justSaved: Ref<boolean> = ref(false);
	let savedTimer: ReturnType<typeof setTimeout> | undefined;

	async function saveAll(): Promise<void> {
		// PButton stays clickable while loading, a double click saves once
		if (saveState.value === "saving") return;
		saveState.value = "saving";
		try {
			await saveSections();
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
		discardSections();
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
		@data:plan:list="(value: Plan[]) => (planList = value)">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap justify-between gap-3">
			<h1 class="text-2xl font-bold my-auto">
				{{ $t("management.title") }}
			</h1>
			<HelpDrawer file-name="management" />
		</div>
		<div
			class="border-b border-white/10 grid grid-cols-1 xl:grid-cols-[60%_auto] divide-x divide-white/10 child:px-6 child:py-3">
			<div>
				<AsyncManageEmpire :empires="empireList" :cx="cxList" />
			</div>
			<div id="cx" class="scroll-mt-4">
				<AsyncManageCX :cx="cxList" />
			</div>
		</div>
		<div class="px-6 pb-3 pt-4">
			<AsyncManagePlanEmpireAssignments
				:empires="empireList"
				:plans="planList"
				:saved="justSaved" />
		</div>
		<SaveBar
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
