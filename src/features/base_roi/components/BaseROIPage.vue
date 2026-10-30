<script setup lang="ts">
	import { computed, defineAsyncComponent, ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Composables
	import { useBaseROI } from "@/features/base_roi/useBaseROI";
	import { useBaseROISettings } from "@/features/base_roi/useBaseROISettings";

	// Components
	import HelpDrawer from "@/features/help/components/HelpDrawer.vue";
	import CXPreferenceSelector from "@/features/exchanges/components/CXPreferenceSelector.vue";
	import BaseROISettingsPanel from "@/features/base_roi/components/BaseROISettingsPanel.vue";
	import BaseROITable from "@/features/base_roi/components/BaseROITable.vue";
	const BaseROISetup = defineAsyncComponent(
		() => import("@/features/base_roi/components/BaseROISetup.vue")
	);
	const BaseROIChartDrawer = defineAsyncComponent(
		() => import("@/features/base_roi/components/BaseROIChartDrawer.vue")
	);

	// UI
	import { PButton } from "@/ui";
	import { InsightsSharp } from "@vicons/material";

	/**
	 * The Base ROI page. Renders at once from the stored settings; the
	 * loaders in the `loader` slot set `ready` when game data and CX
	 * preferences are in, then the table calculates.
	 */
	const { ready } = defineProps<{ ready: boolean }>();
	const cxUuid = defineModel<string | undefined>("cxUuid", {
		required: true,
	});

	const { settings, hasStored } = useBaseROISettings();
	const {
		calculate,
		tryOnPlanet,
		preferenceExchanges,
		rows,
		filtered,
		step,
		progress,
		planetRowsPending,
		firstLoad,
		series,
		historyFailed,
	} = useBaseROI(settings, cxUuid);

	// first visit: the setup asks before anything is stored
	const setupOpen = ref(!hasStored.value);

	// a setting the engine reads, or the CX preference: calculate again
	// a key of their values: a new settings object alone changes nothing
	watch(
		() => {
			const s = settings.value;
			return [
				ready,
				s.cogc,
				s.experts,
				s.bufferDays,
				s.maxJumps,
				cxUuid.value,
			].join("|");
		},
		() => {
			if (ready) void calculate();
		},
		{ immediate: true }
	);

	const expertiseOptions = computed(() =>
		[...new Set(rows.value.map((r) => r.expertise ?? ""))]
			.filter(Boolean)
			.sort()
	);
	const buildingOptions = computed(() =>
		[
			...new Set(
				rows.value
					.filter(
						(r) =>
							!settings.value.expertise ||
							r.expertise === settings.value.expertise
					)
					.map((r) => r.building)
			),
		].sort()
	);
	const exchanges = computed(() => {
		void cxUuid.value;
		return ready ? preferenceExchanges() : [];
	});

	const chartOpen = computed({
		get: () => settings.value.chartOpen,
		set: (v) => (settings.value = { ...settings.value, chartOpen: v }),
	});
	const hasRows = computed(() => filtered.value.rows.length > 0);
	const active = ref<string | null>(null);

	// a dot hovered in the chart brings its row into view in the table box
	const tableBox = ref<HTMLElement | null>(null);
	watch(active, (key) => {
		if (!key) return;
		tableBox.value
			?.querySelector(`tr[data-row-key="${CSS.escape(key)}"]`)
			?.scrollIntoView({ block: "nearest" });
	});
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<div
			class="px-6 py-3 border-b border-white/10 flex flex-row flex-wrap gap-x-6 gap-y-2 justify-between">
			<h1 class="text-2xl font-bold my-auto">
				{{ t("base_roi.title") }}
			</h1>
			<div class="flex flex-row flex-wrap items-center gap-3">
				<span class="text-muted">{{ t("base_roi.cx_select") }}</span>
				<!-- its options are read once: mounted after the CX list loaded -->
				<CXPreferenceSelector
					v-if="ready"
					v-model:cx-uuid="cxUuid"
					class="w-56 max-w-full"
					:aria-label="t('base_roi.cx_select')" />
				<span
					v-else
					aria-hidden="true"
					class="block h-8 w-56 max-w-full rounded bg-white/5 motion-safe:animate-pulse" />
				<HelpDrawer file-name="tools_base_roi" />
				<PButton
					:pressed="chartOpen && hasRows"
					:disabled="!hasRows"
					@click="chartOpen = !chartOpen">
					<template #icon><InsightsSharp /></template>
					{{ t("base_roi.chart_button") }}
				</PButton>
			</div>
		</div>

		<div class="grow px-6 py-3 flex flex-col gap-3">
			<BaseROISettingsPanel
				v-model:settings="settings"
				:expertise-options="expertiseOptions"
				:building-options="buildingOptions"
				:exchanges="exchanges"
				@setup="setupOpen = true" />
			<div ref="tableBox" class="relative">
				<BaseROITable
					v-model:settings="settings"
					:rows="filtered.rows"
					:hidden="filtered.hidden"
					:step="ready ? step : 'game'"
					:progress="progress"
					:first-load="firstLoad"
					:planet-rows-pending="planetRowsPending"
					:series="series"
					:history-failed="historyFailed"
					:active="active"
					:try-on-planet="tryOnPlanet"
					:cx-uuid="cxUuid" />
				<!-- the data loaders: steps or an error over the table box only when slow -->
				<div
					:class="
						ready ? 'hidden' : 'absolute inset-x-0 top-12 bottom-0'
					">
					<slot name="loader" />
				</div>
			</div>
		</div>

		<BaseROIChartDrawer
			v-if="chartOpen && hasRows"
			v-model:show="chartOpen"
			v-model:active="active"
			:rows="filtered.rows" />
		<BaseROISetup
			v-if="setupOpen && ready"
			v-model:show="setupOpen"
			v-model:settings="settings"
			v-model:cx-uuid="cxUuid" />
	</div>
</template>
