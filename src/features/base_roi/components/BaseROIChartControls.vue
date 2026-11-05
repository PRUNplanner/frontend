<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Static
	import {
		CHART_BUCKETS,
		CHART_RANGES,
	} from "@/features/base_roi/baseROI.constants";

	// Types & Interfaces
	import type { BaseROISettings } from "@/features/base_roi/baseROI.schemas";

	// UI
	import { PSegmented } from "@/ui";

	/**
	 * Time range on the left, aggregation on the right, like the game's
	 * charts; one setting for every history chart of the page
	 */
	const settings = defineModel<BaseROISettings>("settings", {
		required: true,
	});
</script>

<template>
	<div
		class="flex flex-row flex-wrap items-center justify-between gap-2"
		data-chart-controls>
		<PSegmented
			size="sm"
			:value="settings.chartRange"
			:label="t('base_roi.history.range')"
			:options="
				CHART_RANGES.map((n) => ({
					value: n,
					label: t('base_roi.history.days', { n }),
				}))
			"
			@update:value="
				(v) => (settings = { ...settings, chartRange: v })
			" />
		<PSegmented
			size="sm"
			:value="settings.chartBucket"
			:label="t('base_roi.history.bucket')"
			:options="
				CHART_BUCKETS.map((n) => ({
					value: n,
					label: t('base_roi.history.days', { n }),
				}))
			"
			@update:value="
				(v) => (settings = { ...settings, chartBucket: v })
			" />
	</div>
</template>
