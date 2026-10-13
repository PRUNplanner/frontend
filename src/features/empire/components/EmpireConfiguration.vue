<script setup lang="ts">
	import { computed, defineAsyncComponent, type PropType } from "vue";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useEmpireForm } from "@/features/empire/useEmpireForm";

	// Components
	import EmpireConfigurationForm from "@/features/empire/components/EmpireConfigurationForm.vue";
	import SaveConflictNotice from "@/features/save_conflict/components/SaveConflictNotice.vue";
	const SaveConflictDialog = defineAsyncComponent(
		() =>
			import("@/features/save_conflict/components/SaveConflictDialog.vue")
	);

	// Types & Interfaces
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { IEmpirePlanListData } from "@/features/empire/empire.types";

	// UI
	import { PButton, PNotice } from "@/ui";
	import {
		SaveSharp,
		ChangeCircleOutlined,
	} from "@vicons/material";

	const props = defineProps({
		data: {
			type: Object as PropType<PlanEmpireElement>,
			required: true,
		},
		planListData: {
			type: Array as PropType<IEmpirePlanListData[]>,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "reload:empires"): void;
	}>();

	const {
		localData,
		isLoading,
		conflict,
		remoteNotice,
		reload,
		reloadSaved,
		save,
	} = useEmpireForm(() => props.data);

	/**
	 * Loads the configuration another tab saved
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function reloadSavedForm(): Promise<void> {
		if (await reloadSaved()) emit("reload:empires");
	}

	/**
	 * Reloads data from props again
	 * @author jplacht
	 *
	 * @returns {void}
	 */
	function reloadForm(): void {
		trackEvent("empire:reload");
		reload();
	}

	/**
	 * Persists data against backend api, triggers reload emit
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function saveForm(): Promise<void> {
		if (await save()) emit("reload:empires");
	}

	const plannedPermits = computed(() =>
		props.planListData.reduce((sum, element) => sum + element.permits, 0)
	);
</script>

<template>
	<div class="p-3 flex flex-col gap-3 border border-white/10 rounded">
		<div class="flex flex-row justify-between items-center">
			<h2 class="grow text-white/80 font-bold text-lg">
				{{ $t("empire.configuration.title") }}
			</h2>

			<div class="flex gap-x-3">
				<PButton size="md" :loading="isLoading" @click="saveForm">
					<template #icon><SaveSharp /></template>
					{{ $t("common.buttons.save") }}
				</PButton>
				<PButton size="md" @click="reloadForm">
					<template #icon><ChangeCircleOutlined /></template>
					{{ $t("common.buttons.reload") }}
				</PButton>
			</div>
		</div>

		<SaveConflictNotice :notice="remoteNotice" @reload="reloadSavedForm" />

		<EmpireConfigurationForm v-model="localData" />

		<PNotice
			v-if="localData.empire_permits_used !== plannedPermits"
			type="warning"
			class="text-xs">
			<i18n-t keypath="empire.configuration.sync_warning.body" tag="div">
				<template #title>
					<strong>
						{{ $t("empire.configuration.sync_warning.title") }}
					</strong>
				</template>

				<template #configured>
					{{ localData.empire_permits_used }}
				</template>

				<template #planned>
					{{ plannedPermits }}
				</template>

				<template #hq_buffer>
					<span class="font-mono bg-white/10 px-1.5"> HQ </span>
					{{ $t("terms.buffer") }}
				</template>
			</i18n-t>
		</PNotice>
		<SaveConflictDialog v-if="conflict.show.value" :conflict="conflict" />
	</div>
</template>
