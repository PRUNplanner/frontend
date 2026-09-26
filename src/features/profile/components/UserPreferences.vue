<script setup lang="ts">
	import { onMounted, ref, Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

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
		cxVolumeYellowPercent,
		cxVolumeRedPercent,
		locale,
		planSettingsOverview,
		cleanPlanPreferences,
	} = usePreferences();
	let { defaultEmpireUuid, defaultCXUuid, defaultBuyItemsFromCX } =
		usePreferences();

	import { SupportedLanguages } from "@/lib/i18n";

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
	<h2 class="text-white/80 font-bold text-lg my-auto">
		{{ $t("profile.preferences.title") }}
	</h2>
	<div class="py-3 text-white/60">
		{{ $t("profile.preferences.description") }}
	</div>

	<PForm>
		<PFormSeperator>
			<h3 class="font-bold pb-3">
				{{ $t("profile.preferences.form.tool_preferences") }}
			</h3>
		</PFormSeperator>
		<PFormItem :label="t('profile.preferences.form.language')">
			<PSelect
				v-model:value="locale"
				:options="SupportedLanguages"
				class="w-full" />
		</PFormItem>
		<PFormSeperator>
			<i18n-t
				keypath="profile.preferences.form.language_note"
				tag="div"
				class="text-xs text-white/60 pt-1 pb-2">
				<template #link>
					<a
						href="https://crowdin.com/project/prunplanner"
						target="_blank"
						class="hover:underline text-prunplanner">
						Crowdin</a
					>
				</template>
			</i18n-t>
		</PFormSeperator>
		<PFormItem :label="t('profile.preferences.form.default_empire')">
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
		<PFormItem :label="t('profile.preferences.form.default_cx')">
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
			<h4 class="font-bold py-1">
				{{ $t("profile.preferences.form.fio_burn") }}
			</h4>
		</PFormSeperator>

		<PFormItem :label="t('profile.preferences.form.red_threshold')">
			<PInputNumber
				v-model:value="burnDaysRed"
				show-button
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.yellow_threshold')">
			<PInputNumber
				v-model:value="burnDaysYellow"
				show-button
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.resupply_days')">
			<PInputNumber
				v-model:value="burnResupplyDays"
				show-button
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.xit_origin')">
			<PSelect
				v-model:value="burnOrigin"
				:options="XITSTATIONWAREHOUSES"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.buy_from_cx')">
			<PCheckbox v-model:checked="defaultBuyItemsFromCX" />
		</PFormItem>
		<PFormItem :label="t('cx_volume.preferences_yellow')">
			<PInputNumber
				v-model:value="cxVolumeYellowPercent"
				show-button
				:min="0"
				:max="100"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('cx_volume.preferences_red')">
			<PInputNumber
				v-model:value="cxVolumeRedPercent"
				show-button
				:min="0"
				:max="100"
				class="w-full" />
		</PFormItem>
	</PForm>

	<h3 class="font-bold py-3">
		{{ $t("profile.preferences.form.plan_specific") }}
	</h3>
	<div class="pb-3 text-white/60">
		{{ $t("profile.preferences.form.plan_specific_description") }}
	</div>
	<PTable striped>
		<thead>
			<tr>
				<th>{{ $t("profile.preferences.form.plan") }}</th>
				<th>{{ $t("profile.preferences.form.preferences") }}</th>
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
