<script setup lang="ts">
	// Composables
	import { usePreferences } from "@/features/preferences/usePreferences";

	// Components
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";

	// UI
	import { PCheckbox, PInputNumber } from "@/ui";

	/**
	 * FIO Repair's settings: plans or interval as target, the interval,
	 * due soon days and the default Exchange Preference. All but the plans
	 * toggle are preferences.
	 *
	 * @author jplacht
	 */
	const { counts } = defineProps<{
		counts: { matched: number; likely: number; none: number };
	}>();

	const usePlans = defineModel<boolean>("usePlans", { required: true });

	const emit = defineEmits<{
		(
			e: "change",
			setting: "interval" | "due_soon" | "exchange" | "use_plans"
		): void;
	}>();

	const { fioRepairIntervalDays, fioRepairDueSoonDays, defaultCXUuid } =
		usePreferences();

	const label = "text-xs font-medium uppercase tracking-wide text-muted";
	const note = "text-xs text-muted";
</script>

<template>
	<section
		:aria-label="$t('fio.repair.settings.title')"
		class="bg-surface border border-line rounded-panel px-4 py-3"
		data-testid="fio-repair-settings">
		<div
			class="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-7 gap-y-3 items-start text-sm">
			<div class="grid gap-1.5 content-start">
				<span :class="label">{{
					$t("fio.repair.settings.target")
				}}</span>
				<PCheckbox
					v-model:checked="usePlans"
					@update:checked="emit('change', 'use_plans')">
					{{ $t("fio.repair.settings.use_plans") }}
				</PCheckbox>
				<span :class="note" data-testid="fio-repair-match-summary">
					{{
						$t("fio.repair.settings.match_summary", {
							matched: counts.matched,
							likely: counts.likely,
							none: counts.none,
						})
					}}
				</span>
			</div>
			<div class="grid gap-1.5 content-start">
				<span :class="label">
					{{
						usePlans
							? $t("fio.repair.settings.interval_plans")
							: $t("fio.repair.settings.interval")
					}}
				</span>
				<div class="flex items-center gap-2">
					<PInputNumber
						v-model:value="fioRepairIntervalDays"
						show-buttons
						size="sm"
						:min="1"
						:max="180"
						:aria-label="$t('fio.repair.settings.interval')"
						class="w-36"
						@update:value="emit('change', 'interval')" />
					<span class="text-muted">
						{{ $t("fio.repair.settings.days") }}
					</span>
				</div>
				<span :class="note">
					{{
						usePlans
							? $t("fio.repair.settings.interval_note_plans")
							: $t("fio.repair.settings.interval_note")
					}}
				</span>
			</div>
			<div class="grid gap-1.5 content-start">
				<span :class="label">{{
					$t("fio.repair.settings.due_soon")
				}}</span>
				<div class="flex items-center gap-2">
					<PInputNumber
						v-model:value="fioRepairDueSoonDays"
						show-buttons
						size="sm"
						:min="0"
						:max="60"
						:aria-label="$t('fio.repair.settings.due_soon')"
						class="w-36"
						@update:value="emit('change', 'due_soon')" />
					<span class="text-muted">
						{{ $t("fio.repair.settings.days") }}
					</span>
				</div>
				<span :class="note">
					{{ $t("fio.repair.settings.due_soon_note") }}
				</span>
			</div>
			<div class="grid gap-1.5 content-start">
				<span :class="label">{{
					$t("fio.repair.settings.exchange")
				}}</span>
				<CXPreferenceSelector
					:cx-uuid="defaultCXUuid"
					:add-undefined-c-x="false"
					size="sm"
					:aria-label="$t('fio.repair.settings.exchange')"
					@update:cx-uuid="emit('change', 'exchange')" />
				<span :class="note">
					{{ $t("fio.repair.settings.exchange_note") }}
				</span>
			</div>
		</div>
		<i18n-t
			keypath="fio.repair.settings.footer"
			tag="p"
			class="mt-2.5 pt-2 border-t border-line text-xs text-muted">
			<template #link>
				<router-link to="/profile" class="text-link hover:underline">
					{{ $t("fio.repair.states.profile") }}
				</router-link>
			</template>
		</i18n-t>
	</section>
</template>
