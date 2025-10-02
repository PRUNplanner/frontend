<script setup lang="ts">
	import { PropType, ref, Ref, watch } from "vue";

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
	import { IEmpirePatchPayload } from "@/features/empire/empire.types";
	import { PSelectOption } from "@/ui/ui.types";

	// UI
	import {
		PButton,
		PCheckbox,
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
			faction: localData.value.faction as PLAN_FACTION,
			permits_used: localData.value.permits_used,
			permits_total: localData.value.permits_total,
			name: localData.value.name,
			use_fio_storage: localData.value.use_fio_storage,
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
</script>

<template>
	<div class="p-3 child:my-auto border border-white/10 rounded">
		<div class="pb-3 flex justify-between child:my-auto">
			<h2 class="flex-grow text-white/80 font-bold text-lg">
				Configuration
			</h2>

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
				<PInput v-model:value="localData.name" class="w-full" />
			</PFormItem>
			<PFormItem label="Faction">
				<PSelect
					v-model:value="localData.faction"
					class="w-full"
					:options="factionOptions" />
			</PFormItem>
			<PFormItem label="Permits Total">
				<PInputNumber
					v-model:value="localData.permits_total"
					show-buttons
					:min="2" />
			</PFormItem>
			<PFormItem label="Permits Used">
				<PInputNumber
					v-model:value="localData.permits_used"
					show-buttons
					:min="1" />
			</PFormItem>
			<PFormItem label="Use FIO Storage?">
				<PCheckbox v-model:checked="localData.use_fio_storage" />
			</PFormItem>
		</PForm>
	</div>
</template>
