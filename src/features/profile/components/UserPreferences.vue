<script setup lang="ts">
	import { computed, onMounted, ref, type ComputedRef, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Stores
	import { usePlanningStore } from "@/stores/planningStore";

	// Composables
	import { usePreferences } from "@/features/preferences/usePreferences";
	import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
	import { getPostHogKey } from "@/lib/analytics/usePostHog";

	// Constants
	import { XITSTATIONWAREHOUSES } from "@/features/xit/xitConstants";

	// Types & Interfaces
	import type { PSelectOption } from "@/ui/ui.types";

	// Components
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";

	// UI
	import {
		PForm,
		PFormItem,
		PFormSeparator,
		PSelect,
		PInputNumber,
		PCheckbox,
		PTable,
	} from "@/ui";

	const planningStore = usePlanningStore();

	// analytics consent lives in this browser, not in the saved preferences
	const { consent, isDNT, grant, deny } = useAnalyticsConsent();
	const analyticsAvailable: boolean = getPostHogKey() !== undefined;

	const {
		burnDaysRed,
		burnDaysYellow,
		burnResupplyDays,
		burnOrigin,
		fioRepairIntervalDays,
		fioRepairDueSoonDays,
		fioRepairArrivalDays,
		locale,
		colorPalette,
		planSuggestions,
		planSettingsOverview,
	} = usePreferences();
	let { defaultEmpireUuid, defaultCXUuid, defaultBuyItemsFromCX } =
		usePreferences();

	import { SupportedLanguages } from "@/lib/i18n";

	const paletteOptions: ComputedRef<PSelectOption[]> = computed(() => [
		{
			label: t("profile.preferences.form.palette_default"),
			value: "default",
		},
		{
			label: t("profile.preferences.form.palette_colorblind"),
			value: "colorblind",
		},
	]);

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
	});

	const groupHeading = "font-bold text-ink-strong pt-6 pb-2";
	const note = "text-xs text-muted pt-1 pb-2";
</script>

<template>
	<PForm class="!grid-cols-[10rem_minmax(0,1fr)]">
		<PFormSeparator>
			<h3 :class="groupHeading" class="!pt-0">
				{{ $t("profile.preferences.form.tool_preferences") }}
			</h3>
		</PFormSeparator>
		<PFormItem :label="t('profile.preferences.form.language')">
			<PSelect
				v-model:value="locale"
				:options="SupportedLanguages"
				class="w-full" />
		</PFormItem>
		<PFormSeparator>
			<i18n-t
				keypath="profile.preferences.form.language_note"
				tag="p"
				:class="note">
				<template #link>
					<a
						href="https://crowdin.com/project/prunplanner"
						target="_blank"
						class="hover:underline text-link">
						Crowdin</a
					>
				</template>
			</i18n-t>
		</PFormSeparator>
		<PFormItem :label="t('profile.preferences.form.color_palette')">
			<PSelect
				v-model:value="colorPalette"
				:options="paletteOptions"
				class="w-full" />
		</PFormItem>
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
				class="w-full" />
		</PFormItem>

		<PFormSeparator>
			<h3 :class="groupHeading">
				{{ $t("profile.preferences.form.fio_burn") }}
			</h3>
		</PFormSeparator>
		<PFormItem :label="t('profile.preferences.form.red_threshold')">
			<PInputNumber
				v-model:value="burnDaysRed"
				show-buttons
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.yellow_threshold')">
			<PInputNumber
				v-model:value="burnDaysYellow"
				show-buttons
				:min="1"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.resupply_days')">
			<PInputNumber
				v-model:value="burnResupplyDays"
				show-buttons
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

		<PFormSeparator>
			<h3 :class="groupHeading">
				{{ $t("profile.preferences.form.fio_repair") }}
			</h3>
		</PFormSeparator>
		<PFormItem :label="t('profile.preferences.form.fio_repair_interval')">
			<PInputNumber
				v-model:value="fioRepairIntervalDays"
				show-buttons
				:min="1"
				:max="180"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.fio_repair_due_soon')">
			<PInputNumber
				v-model:value="fioRepairDueSoonDays"
				show-buttons
				:min="0"
				:max="60"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('profile.preferences.form.fio_repair_arrival')">
			<PInputNumber
				v-model:value="fioRepairArrivalDays"
				show-buttons
				:min="0"
				:max="30"
				class="w-full" />
		</PFormItem>
		<PFormSeparator>
			<p :class="note">
				{{ $t("profile.preferences.form.fio_repair_note") }}
			</p>
		</PFormSeparator>

		<PFormSeparator>
			<h3 :class="groupHeading">
				{{ $t("profile.preferences.form.planning") }}
			</h3>
		</PFormSeparator>
		<PFormItem :label="t('profile.preferences.form.plan_suggestions')">
			<PCheckbox v-model:checked="planSuggestions" />
		</PFormItem>
		<PFormSeparator>
			<p :class="note">
				{{ $t("profile.preferences.form.plan_suggestions_help") }}
			</p>
		</PFormSeparator>
		<PFormSeparator>
			<h4 class="font-bold pt-3">
				{{ $t("profile.preferences.form.plan_specific") }}
			</h4>
			<p :class="note">
				{{ $t("profile.preferences.form.plan_specific_description") }}
			</p>
			<PTable v-if="planSettingsOverview.length" striped>
				<thead>
					<tr>
						<th>{{ $t("profile.preferences.form.plan") }}</th>
						<th>{{ $t("profile.preferences.form.preferences") }}</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="plan in planSettingsOverview"
						:key="plan.planUuid">
						<td>
							<router-link
								:to="`/plan/${plan.planetId}/${plan.planUuid}`"
								class="text-link font-bold hover:underline">
								{{ plan.planName }}
							</router-link>
						</td>
						<td class="w-[50%] max-w-[75%]">
							{{ plan.preferences.join(", ") }}
						</td>
					</tr>
				</tbody>
			</PTable>
			<p v-else class="text-sm text-muted">
				{{ $t("profile.preferences.form.plan_specific_empty") }}
			</p>
		</PFormSeparator>

		<template v-if="analyticsAvailable">
			<PFormSeparator>
				<h3 :class="groupHeading">
					{{ $t("profile.preferences.form.privacy") }}
				</h3>
			</PFormSeparator>
			<PFormItem :label="t('profile.preferences.form.analytics')">
				<PCheckbox
					:checked="consent === 'granted'"
					:disabled="isDNT"
					@update:checked="(value) => (value ? grant() : deny())" />
			</PFormItem>
			<PFormSeparator>
				<p :class="note">
					{{
						isDNT
							? $t("profile.preferences.form.analytics_dnt")
							: $t("profile.preferences.form.analytics_note")
					}}
				</p>
			</PFormSeparator>
		</template>
	</PForm>
</template>
