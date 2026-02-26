<script setup lang="ts">
	import { onMounted, ref, Ref } from "vue";

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { usePreferences } from "@/features/preferences/usePreferences";

	// Constants
	import { XITSTATIONWAREHOUSES } from "@/features/xit/xitConstants";

	// Types & Interfaces
	import { PSelectOption } from "@/ui/ui.types";

	// Components
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";

	// UI
	import {
		PForm,
		PFormItem,
		PFormSeperator,
		PSelect,
		PInputNumber,
		PCheckbox,
		PTable,
	} from "@/ui";

	const planningStore = usePlanningStore();

	const {
		burnDaysRed,
		burnDaysYellow,
		burnResupplyDays,
		burnOrigin,
		planSettingsOverview,
		cleanPlanPreferences,
	} = usePreferences();
	let { defaultEmpireUuid, defaultCXUuid, defaultBuyItemsFromCX } =
		usePreferences();

	const empireOptions: Ref<PSelectOption[]> = ref(
		Object.values(planningStore.empires).map((e) => {
			return {
				label: e.empire_name,
				value: e.uuid,
			};
		})
	);

	onMounted(() => {
		// ensure defaultEmpire is still in the empire list
		const validDefaultEmpire: boolean = empireOptions.value.find(
			(e) => e.value === defaultEmpireUuid.value
		)
			? true
			: false;
		if (!validDefaultEmpire) {
			// if there empires, use first
			if (empireOptions.value.length > 0)
				defaultEmpireUuid.value = empireOptions.value[0]
					.value as string;
			// or, reset to undefined
			else defaultEmpireUuid.value = undefined;
		}

		// all plans loaded, clear up non-existing plans preferences
		cleanPlanPreferences();
	});
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg my-auto">Preferences</h2>
	<div class="py-3 text-white/60">
		Your preferences are saved locally in your browser and aren't synced
		with the backend yet. Use this panel to review and customize your
		PRUNplanner settings.
	</div>

	<PForm>
		<PFormSeperator>
			<h3 class="font-bold pb-3">Tool Preferences</h3>
		</PFormSeperator>
		<PFormItem label="Default Empire">
			<PSelect
				v-model:value="defaultEmpireUuid"
				:options="empireOptions"
				class="w-full"
				@update:value="
					(value) => {
						if (value && typeof value === 'string') {
							defaultEmpireUuid = value;
						}
					}
				" />
		</PFormItem>
		<PFormItem label="Default CX">
			<CXPreferenceSelector
				:cx-uuid="defaultCXUuid"
				:add-undefined-c-x="false"
				class="w-full"
				@update:value="
					(value: string | undefined) => {
						if (value && typeof value === 'string') {
							defaultCXUuid = value;
						}
					}
				" />
		</PFormItem>

		<PFormSeperator>
			<h4 class="font-bold py-1">FIO Burn</h4>
		</PFormSeperator>

		<PFormItem label="Red Threshold">
			<PInputNumber
				v-model:value="burnDaysRed"
				show-button
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem label="Yellow Threshold">
			<PInputNumber
				v-model:value="burnDaysYellow"
				show-button
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem label="Resupply Days">
			<PInputNumber
				v-model:value="burnResupplyDays"
				show-button
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem label="XIT Origin">
			<PSelect
				v-model:value="burnOrigin"
				:options="XITSTATIONWAREHOUSES"
				class="w-full" />
		</PFormItem>
		<PFormItem label="XIT Buy from CX">
			<PCheckbox v-model:checked="defaultBuyItemsFromCX" />
		</PFormItem>
	</PForm>

	<h3 class="font-bold py-3">Plan-Specific Settings</h3>
	<div class="pb-3 text-white/60">
		These settings are managed within individual plans. This section
		provides an overview of the preferences you've customized so far — to
		modify them, navigate to the corresponding plan.
	</div>
	<PTable striped>
		<thead>
			<tr>
				<th>Plan</th>
				<th>Preferences</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="plan in planSettingsOverview" :key="plan.planUuid">
				<td>
					<router-link
						:to="`/plan/${plan.planetId}/${plan.planUuid}`"
						class="text-link-primary font-bold hover:underline">
						{{ plan.planName }}
					</router-link>
				</td>
				<td class="w-[50%] max-w-[75%]">
					{{ plan.preferences.join(", ") }}
				</td>
			</tr>
		</tbody>
	</PTable>
</template>
