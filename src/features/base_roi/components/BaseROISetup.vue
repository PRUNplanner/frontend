<script setup lang="ts">
	import { computed, ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";

	// Static
	import {
		BASE_ROI_COLUMNS,
		SETUP_PRESETS,
		SHIPS,
		DAY_OPTIONS,
	} from "@/features/base_roi/baseROI.constants";

	// Types & Interfaces
	import {
		BaseROIPresetSchema,
		BaseROIShipSchema,
		type BaseROIColumn,
		type BaseROIPreset,
		type BaseROISettings,
		type BaseROIShip,
	} from "@/features/base_roi/baseROI.schemas";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PButton, PCheckbox, PModal, PSelect } from "@/ui";

	/**
	 * First-visit setup: CX preference, a preset, ship, days between visits
	 * and the starting columns, written into the normal settings. Closing it
	 * any way keeps the settings as they are and stores them.
	 */
	const show = defineModel<boolean>("show", { required: true });
	const settings = defineModel<BaseROISettings>("settings", {
		required: true,
	});
	const cxUuid = defineModel<string | undefined>("cxUuid");

	const preset = ref<BaseROIPreset>("standard");
	// Veteran's choice; "none" = no logistics limit
	const veteranShip = ref<BaseROIShip | "none">("none");
	const visitDays = ref(3);
	const columns = ref<BaseROIColumn[]>([]);

	// each opening starts from the current settings
	watch(
		show,
		(open) => {
			if (!open) return;
			preset.value = "standard";
			veteranShip.value = "none";
			visitDays.value = settings.value.visitDays;
			columns.value = BASE_ROI_COLUMNS.filter(
				(c) => !settings.value.hiddenColumns.includes(c)
			);
		},
		{ immediate: true }
	);

	const ship = computed<BaseROIShip | "none">(() =>
		preset.value === "veteran"
			? veteranShip.value
			: (SETUP_PRESETS[preset.value].ship as BaseROIShip)
	);

	const shipOptions = computed<PSelectOption[]>(() => [
		...(preset.value === "veteran"
			? [{ label: t("base_roi.setup.no_limit"), value: "none" }]
			: []),
		...BaseROIShipSchema.options.map((s) => ({
			label: t("base_roi.settings.ship_option", {
				ship: s,
				weight: SHIPS[s].weight,
				volume: SHIPS[s].volume,
			}),
			value: s,
		})),
	]);
	const visitOptions = computed<PSelectOption[]>(() =>
		DAY_OPTIONS.map((n) => ({
			label: t("base_roi.settings.every_days", { n }, n),
			value: n,
		}))
	);

	function toggleColumn(c: BaseROIColumn, on: boolean): void {
		columns.value = on
			? [...columns.value, c]
			: columns.value.filter((x) => x !== c);
	}

	function start(): void {
		const next: BaseROISettings = {
			...settings.value,
			...SETUP_PRESETS[preset.value],
			visitDays: visitDays.value as BaseROISettings["visitDays"],
			hiddenColumns: BASE_ROI_COLUMNS.filter(
				(c) => !columns.value.includes(c)
			),
		};
		if (ship.value === "none") next.logistics = "none";
		else {
			next.logistics = "ship";
			next.ship = ship.value;
		}
		settings.value = next;
		show.value = false;
	}

	// Skip, Esc or the close button: keep the settings, stored from now on
	function skip(): void {
		settings.value = { ...settings.value };
		show.value = false;
	}
	const open = computed({
		get: () => show.value,
		set: (value: boolean) => {
			if (!value) skip();
		},
	});
</script>

<template>
	<PModal
		v-model:show="open"
		:title="t('base_roi.setup.title')"
		:width="600"
		closable
		auto-focus>
		<div class="flex flex-col gap-4">
			<p class="text-muted">{{ t("base_roi.setup.intro") }}</p>

			<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t('base_roi.cx_select') }}
					</span>
				<CXPreferenceSelector
					v-model:cx-uuid="cxUuid"
					:aria-label="t('base_roi.cx_select')" />
			</div>

			<fieldset>
				<legend class="mb-1 text-xs font-bold uppercase text-muted">
					{{ t("base_roi.setup.preset") }}
				</legend>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
					<label
						v-for="p in BaseROIPresetSchema.options"
						:key="p"
						class="flex cursor-pointer flex-col gap-1 rounded-md border p-2 focus-within:ring-2 focus-within:ring-white/40"
						:class="
							preset === p
								? 'border-link-primary bg-white/5'
								: 'border-white/10'
						">
						<span class="flex items-center gap-2 font-bold">
							<input
								v-model="preset"
								class="accent-current"
								type="radio"
								name="base-roi-preset"
								:value="p" />
							{{ t(`base_roi.setup.${p}`) }}
						</span>
						<span class="text-xs text-muted">
							{{ t(`base_roi.setup.${p}_text`) }}
						</span>
					</label>
				</div>
			</fieldset>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t('base_roi.settings.ship') }}
					</span>
					<PSelect
						v-if="preset === 'veteran'"
						:aria-label="t('base_roi.settings.ship')"
						:value="veteranShip"
						:options="shipOptions"
						@update:value="
							(v) => (veteranShip = v as BaseROIShip | 'none')
						" />
					<div v-else class="flex flex-col">
						<span>
							{{
								shipOptions.find((o) => o.value === ship)?.label
							}}
						</span>
						<span class="text-xs text-muted">
							{{ t("base_roi.setup.ship_fixed") }}
						</span>
					</div>
				</div>
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t('base_roi.settings.visit_days') }}
					</span>
					<PSelect
						v-model:value="visitDays"
						:aria-label="t('base_roi.settings.visit_days')"
						:options="visitOptions" />
				</div>
			</div>

			<details>
				<summary class="cursor-pointer text-link-primary">
					{{ t("base_roi.setup.columns") }}
				</summary>
				<div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
					<PCheckbox
						v-for="c in BASE_ROI_COLUMNS"
						:key="c"
						:checked="columns.includes(c)"
						@update:checked="(v) => toggleColumn(c, !!v)">
						{{ t(`base_roi.columns.${c}`) }}
					</PCheckbox>
				</div>
			</details>
		</div>
		<template #action>
			<div class="flex justify-end gap-2">
				<PButton type="secondary" @click="skip">
					{{ t("base_roi.setup.skip") }}
				</PButton>
				<PButton @click="start">{{ t("base_roi.setup.start") }}</PButton>
			</div>
		</template>
	</PModal>
</template>
