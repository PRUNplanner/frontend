<script setup lang="ts">
	import { computed, type PropType, ref, type Ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { inertClone } from "@/util/data";

	// Types & Interfaces
	import type {
		EmpirePayload,
		PlanEmpireElement,
	} from "@/features/api/schemas/empireData.schemas";
	import type { IEmpirePlanListData } from "@/features/empire/empire.types";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import {
		PButton,
		PForm,
		PFormItem,
		PInputNumber,
		PInput,
		PSelect,
	} from "@/ui";
	import { SaveSharp, ChangeCircleOutlined } from "@vicons/material";

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

	const isLoading: Ref<boolean> = ref(false);

	// Local Data & Watcher
	const localData: Ref<PlanEmpireElement> = ref(inertClone(props.data));

	watch(
		() => props.data,
		(newData: PlanEmpireElement) => (localData.value = inertClone(newData)),
		{ deep: true }
	);

	const factionOptions: PSelectOption[] = [
		{ label: "No Faction", value: "NONE" },
		{ label: "Antares", value: "ANTARES" },
		{ label: "Benten", value: "BENTEN" },
		{ label: "Hortus", value: "HORTUS" },
		{ label: "Moria", value: "MORIA" },
		{ label: "Outside Region", value: "OUTSIDEREGION" },
	];

	/**
	 * Reloads data from props again
	 * @author jplacht
	 *
	 * @returns {void}
	 */
	function reload(): void {
		trackEvent("empire_reload");
		localData.value = inertClone(props.data);
	}

	/**
	 * Persists data against backend api, triggers reload emit
	 * @author jplacht
	 *
	 * @async
	 * @returns {Promise<void>}
	 */
	async function save(): Promise<void> {
		isLoading.value = true;
		trackEvent("empire_patch");

		const patchData: EmpirePayload = {
			empire_name: localData.value.empire_name,
			empire_faction: localData.value.empire_faction,
			empire_permits_used: localData.value.empire_permits_used,
			empire_permits_total: localData.value.empire_permits_total,
		};

		try {
			await useQuery("PatchEmpire", {
				empireUuid: localData.value.uuid,
				data: patchData,
			}).execute();
			emit("reload:empires");
		} catch (err) {
			console.error("Error patching empire", err);
		} finally {
			isLoading.value = false;
		}
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
				<PButton size="md" :loading="isLoading" @click="save">
					<template #icon><SaveSharp /></template>
					{{ $t("common.buttons.save") }}
				</PButton>
				<PButton size="md" @click="reload">
					<template #icon><ChangeCircleOutlined /></template>
					{{ $t("common.buttons.reload") }}
				</PButton>
			</div>
		</div>

		<PForm>
			<PFormItem :label="t('empire.configuration.form.name')">
				<PInput v-model:value="localData.empire_name" class="w-full" />
			</PFormItem>
			<PFormItem :label="t('empire.configuration.form.faction')">
				<PSelect
					v-model:value="localData.empire_faction"
					class="w-full"
					:options="factionOptions" />
			</PFormItem>
			<PFormItem :label="t('empire.configuration.form.permits_total')">
				<PInputNumber
					v-model:value="localData.empire_permits_total"
					show-buttons
					:min="2" />
			</PFormItem>
			<PFormItem :label="t('empire.configuration.form.permits_used')">
				<PInputNumber
					v-model:value="localData.empire_permits_used"
					show-buttons
					:min="1" />
			</PFormItem>
		</PForm>

		<i18n-t
			v-if="localData.empire_permits_used !== plannedPermits"
			keypath="empire.configuration.sync_warning.body"
			tag="div"
			class="text-xs bg-red-500/50 p-2">
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
	</div>
</template>
