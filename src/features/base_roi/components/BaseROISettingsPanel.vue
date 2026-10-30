<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { capitalizeString } from "@/util/text";

	// Static
	import { DAY_OPTIONS, SHIPS } from "@/features/base_roi/baseROI.constants";
	import { defaultBaseROISettings } from "@/features/base_roi/useBaseROISettings";

	// Types & Interfaces
	import {
		BaseROIShipSchema,
		type BaseROISettings,
	} from "@/features/base_roi/baseROI.schemas";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import {
		PButton,
		PCheckbox,
		PInputNumber,
		PSegmented,
		PSelect,
	} from "@/ui";
	import { ExpandMoreSharp } from "@vicons/material";

	const settings = defineModel<BaseROISettings>("settings", {
		required: true,
	});

	const { expertiseOptions, buildingOptions, exchanges } = defineProps<{
		expertiseOptions: string[];
		buildingOptions: string[];
		/** exchanges max jumps counts to */
		exchanges: string[];
	}>();

	const emit = defineEmits<{ (e: "setup"): void }>();

	const days = (n: number) => t("base_roi.settings.days", { n }, n);
	const off = () => t("base_roi.settings.off");

	const expertOptions = computed<PSelectOption[]>(() => [
		{ label: t("base_roi.settings.experts_ramp"), value: "ramp" },
		...[0, 1, 2, 3, 4, 5].map((n) => ({
			label: t("base_roi.settings.experts_fixed", { n }, n),
			value: n,
		})),
	]);
	const bufferOptions = computed<PSelectOption[]>(() => [
		{ label: t("base_roi.settings.buffer_off"), value: 0 },
		...DAY_OPTIONS.map((n) => ({ label: days(n), value: n })),
	]);
	const capacityOptions = computed<PSelectOption[]>(() =>
		Array.from({ length: 11 }, (_, i) => ({
			label: t("base_roi.settings.bases", { n: (i / 10).toFixed(1) }),
			value: i / 10,
		}))
	);
	const shipOptions = computed<PSelectOption[]>(() =>
		BaseROIShipSchema.options.map((ship) => ({
			label: t("base_roi.settings.ship_option", {
				ship,
				weight: SHIPS[ship].weight,
				volume: SHIPS[ship].volume,
			}),
			value: ship,
		}))
	);
	const visitOptions = computed<PSelectOption[]>(() =>
		DAY_OPTIONS.map((n) => ({
			label: t("base_roi.settings.every_days", { n }, n),
			value: n,
		}))
	);
	const permitOptions = computed<PSelectOption[]>(() => [
		{ label: off(), value: 0 },
		...Array.from({ length: 49 }, (_, i) => ({
			label: String(i + 2),
			value: i + 2,
		})),
	]);
	const roundTripOptions = computed<PSelectOption[]>(() => [
		{ label: off(), value: 0 },
		...Array.from({ length: 25 }, (_, i) => ({
			label: t("base_roi.settings.hours", { n: i + 1 }),
			value: i + 1,
		})),
	]);
	const optionsOf = (
		all: string,
		values: string[],
		label: (v: string) => string = (v) => v
	): PSelectOption[] => [
		{ label: all, value: "" },
		...values.map((v) => ({ label: label(v), value: v })),
	];

	/** one line with the settings that shape the table, for the closed panel */
	const summary = computed(() => {
		const s = settings.value;
		return t("base_roi.settings.summary", {
			cogc:
				s.cogc === "matching"
					? t("base_roi.settings.cogc_matching")
					: t("base_roi.settings.cogc_none"),
			experts:
				s.experts === "ramp"
					? t("base_roi.settings.experts_ramp")
					: s.experts,
			buffer: s.bufferDays
				? days(s.bufferDays)
				: t("base_roi.settings.buffer_off"),
			logistics:
				s.logistics === "ship"
					? `${s.ship} / ${days(s.visitDays)}`
					: t(`base_roi.settings.logistics_${s.logistics}`),
			capacity: s.minMarketCapacity.toFixed(1),
			jumps: s.maxJumps,
		});
	});

	/** a select's value into the setting, typed as the setting */
	function set<K extends keyof BaseROISettings>(
		key: K,
		value: unknown
	): void {
		settings.value = { ...settings.value, [key]: value };
	}

	function reset(): void {
		const { hiddenColumns, panelOpen, chartOpen } = settings.value;
		settings.value = {
			...defaultBaseROISettings(),
			hiddenColumns,
			panelOpen,
			chartOpen,
		};
	}
</script>

<template>
	<section class="rounded-lg border border-white/10 bg-white/[0.02]">
		<div class="flex flex-row items-center gap-3 px-3 py-2">
			<button
				type="button"
				class="flex flex-row items-center gap-2 min-w-0 text-left"
				:aria-expanded="settings.panelOpen"
				aria-controls="base-roi-settings"
				@click="set('panelOpen', !settings.panelOpen)">
				<ExpandMoreSharp
					class="size-5 shrink-0 transition-transform"
					:class="settings.panelOpen ? '' : '-rotate-90'" />
				<span class="font-bold">{{
					t("base_roi.settings.title")
				}}</span>
				<span class="text-xs text-muted truncate">{{ summary }}</span>
			</button>
			<PButton
				class="ml-auto shrink-0"
				size="sm"
				type="secondary"
				@click="emit('setup')">
				{{ t("base_roi.settings.run_setup") }}
			</PButton>
		</div>

		<div
			v-show="settings.panelOpen"
			id="base-roi-settings"
			class="border-t border-white/10">
			<div
				class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 p-3">
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.cogc") }}
					</span>
					<PSegmented
						:value="settings.cogc"
						:label="t('base_roi.settings.cogc')"
						:options="[
							{
								value: 'matching',
								label: t('base_roi.settings.cogc_matching'),
							},
							{
								value: 'none',
								label: t('base_roi.settings.cogc_none'),
							},
						]"
						@update:value="(v) => set('cogc', v)" />
				</div>
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.experts") }}
					</span>
					<PSelect
						:aria-label="t('base_roi.settings.experts')"
						:value="settings.experts"
						:options="expertOptions"
						@update:value="(v) => set('experts', v)" />
				</div>
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.buffer") }}
					</span>
					<PSelect
						:aria-label="t('base_roi.settings.buffer')"
						:value="settings.bufferDays"
						:options="bufferOptions"
						@update:value="(v) => set('bufferDays', v)" />
				</div>

				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.min_market_capacity") }}
					</span>
					<PSelect
						:aria-label="t('base_roi.settings.min_market_capacity')"
						:value="settings.minMarketCapacity"
						:options="capacityOptions"
						@update:value="(v) => set('minMarketCapacity', v)" />
				</div>
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.logistics") }}
					</span>
					<div class="flex flex-col gap-2">
						<PSegmented
							:value="settings.logistics"
							:label="t('base_roi.settings.logistics')"
							:options="[
								{
									value: 'ship',
									label: t(
										'base_roi.settings.logistics_ship'
									),
								},
								{
									value: 'manual',
									label: t(
										'base_roi.settings.logistics_manual'
									),
								},
								{
									value: 'none',
									label: t(
										'base_roi.settings.logistics_none'
									),
								},
							]"
							@update:value="(v) => set('logistics', v)" />
						<div
							v-if="settings.logistics === 'ship'"
							class="flex flex-row flex-wrap gap-2">
							<PSelect
								class="min-w-48 flex-1"
								:value="settings.ship"
								:options="shipOptions"
								:aria-label="t('base_roi.settings.ship')"
								@update:value="(v) => set('ship', v)" />
							<PSelect
								class="w-36"
								:value="settings.visitDays"
								:options="visitOptions"
								:aria-label="t('base_roi.settings.visit_days')"
								@update:value="(v) => set('visitDays', v)" />
						</div>
						<div
							v-else-if="settings.logistics === 'manual'"
							class="flex flex-row flex-wrap gap-2 items-center">
							<PInputNumber
								class="w-28"
								:value="settings.manualWeight"
								:min="0"
								:aria-label="
									t('base_roi.settings.manual_weight')
								"
								@update:value="
									(v) => set('manualWeight', v ?? 0)
								" />
							<span class="text-muted">
								{{ t("base_roi.settings.manual_weight") }}
							</span>
							<PInputNumber
								class="w-28"
								:value="settings.manualVolume"
								:min="0"
								:aria-label="
									t('base_roi.settings.manual_volume')
								"
								@update:value="
									(v) => set('manualVolume', v ?? 0)
								" />
							<span class="text-muted">
								{{ t("base_roi.settings.manual_volume") }}
							</span>
						</div>
					</div>
				</div>
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.target_permit") }}
					</span>
					<PSelect
						:aria-label="t('base_roi.settings.target_permit')"
						:value="settings.targetPermit"
						:options="permitOptions"
						searchable
						@update:value="(v) => set('targetPermit', v)" />
				</div>

				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.round_trip") }}
					</span>
					<PSelect
						:aria-label="t('base_roi.settings.round_trip')"
						:value="settings.roundTripHours"
						:options="roundTripOptions"
						@update:value="(v) => set('roundTripHours', v)" />
				</div>
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.max_jumps") }}
					</span>
					<div class="flex flex-row items-center gap-2">
						<PInputNumber
							:aria-label="t('base_roi.settings.max_jumps')"
							class="w-24"
							:value="settings.maxJumps"
							:min="0"
							@update:value="
								(v) =>
									set(
										'maxJumps',
										Math.max(0, Math.round(v ?? 0))
									)
							" />
						<span class="text-muted">
							{{
								t("base_roi.settings.max_jumps_to", {
									exchanges: exchanges.join(", "),
								})
							}}
						</span>
					</div>
				</div>
				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.row_kinds") }}
					</span>
					<div class="flex flex-row flex-wrap gap-x-4 gap-y-1">
						<PCheckbox
							:checked="settings.showResources"
							@update:checked="(v) => set('showResources', !!v)">
							{{ t("base_roi.settings.resources") }}
						</PCheckbox>
						<PCheckbox
							:checked="settings.showRecipes"
							@update:checked="(v) => set('showRecipes', !!v)">
							{{ t("base_roi.settings.recipes") }}
						</PCheckbox>
						<PCheckbox
							:checked="settings.showNegative"
							@update:checked="(v) => set('showNegative', !!v)">
							{{ t("base_roi.settings.show_negative") }}
						</PCheckbox>
					</div>
				</div>

				<div class="flex flex-col gap-1.5 min-w-0">
					<span class="text-xs font-bold uppercase text-muted">
						{{ t("base_roi.settings.filters") }}
					</span>
					<div class="flex flex-row flex-wrap gap-2">
						<PSelect
							class="min-w-40 flex-1"
							:value="settings.expertise"
							:options="
								optionsOf(
									t('base_roi.settings.all_expertise'),
									expertiseOptions,
									capitalizeString
								)
							"
							:aria-label="t('base_roi.settings.all_expertise')"
							@update:value="(v) => set('expertise', v ?? '')" />
						<PSelect
							class="min-w-32 flex-1"
							:value="settings.building"
							:options="
								optionsOf(
									t('base_roi.settings.all_buildings'),
									buildingOptions
								)
							"
							searchable
							:aria-label="t('base_roi.settings.all_buildings')"
							@update:value="(v) => set('building', v ?? '')" />
					</div>
				</div>
			</div>
			<div
				class="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 px-3 py-2 text-sm">
				<p class="text-muted">{{ t("base_roi.cogc_note") }}</p>
				<PButton
					class="ml-auto"
					size="sm"
					type="secondary"
					@click="reset">
					{{ t("base_roi.settings.reset") }}
				</PButton>
			</div>
		</div>
	</section>
</template>
