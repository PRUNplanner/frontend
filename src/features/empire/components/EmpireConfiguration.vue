<script setup lang="ts">
	import { computed, PropType, ref, Ref, watch } from "vue";

	// Composables
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Util
	import { inertClone } from "@/util/data";

	// Types & Interfaces
	import {
		IPlanEmpireElement,
		PLAN_FACTION,
	} from "@/stores/planningStore.types";
	import {
		IEmpirePatchPayload,
		IEmpirePlanListData,
	} from "@/features/empire/empire.types";
	import { PSelectOption } from "@/ui/ui.types";

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
			type: Object as PropType<IPlanEmpireElement>,
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
	const localData: Ref<IPlanEmpireElement> = ref(inertClone(props.data));

	watch(
		() => props.data,
		(newData: IPlanEmpireElement) =>
			(localData.value = inertClone(newData)),
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

		const patchData: IEmpirePatchPayload = {
			empire_name: localData.value.empire_name,
			empire_faction: localData.value.empire_faction as PLAN_FACTION,
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
			<h2 class="grow text-white/80 font-bold text-lg">Configuration</h2>

			<div class="flex gap-x-3">
				<PButton size="md" :loading="isLoading" @click="save">
					<template #icon><SaveSharp /></template>
					Save
				</PButton>
				<PButton size="md" @click="reload">
					<template #icon><ChangeCircleOutlined /></template>
					Reload
				</PButton>
			</div>
		</div>

		<PForm>
			<PFormItem label="Name">
				<PInput v-model:value="localData.empire_name" class="w-full" />
			</PFormItem>
			<PFormItem label="Faction">
				<PSelect
					v-model:value="localData.empire_faction"
					class="w-full"
					:options="factionOptions" />
			</PFormItem>
			<PFormItem label="Permits Total">
				<PInputNumber
					v-model:value="localData.empire_permits_total"
					show-buttons
					:min="2" />
			</PFormItem>
			<PFormItem label="Permits Used">
				<PInputNumber
					v-model:value="localData.empire_permits_used"
					show-buttons
					:min="1" />
			</PFormItem>
		</PForm>

		<div
			v-if="localData.empire_permits_used != plannedPermits"
			class="text-xs bg-red-500/50 p-2">
			Mismatch Detected:
			{{ localData.empire_permits_used }} configured vs.
			{{ plannedPermits }}
			planned permits. Please synchronize these values using your in-game
			<span class="font-mono bg-white/10 px-1.5">HQ</span> Buffer to
			ensure accurate faction bonus calculations.
		</div>
	</div>
</template>
