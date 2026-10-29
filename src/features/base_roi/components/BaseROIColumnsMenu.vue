<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Static
	import { BASE_ROI_COLUMNS } from "@/features/base_roi/baseROI.constants";

	// Types & Interfaces
	import type { BaseROIColumn } from "@/features/base_roi/baseROI.schemas";

	// UI
	import { PButton, PCheckbox, PPopover } from "@/ui";
	import { ViewColumnSharp } from "@vicons/material";

	// every column but the product can be hidden
	const hiddenColumns = defineModel<BaseROIColumn[]>("hiddenColumns", {
		required: true,
	});

	const shown = computed(
		() =>
			BASE_ROI_COLUMNS.filter((c) => !hiddenColumns.value.includes(c))
				.length + 1
	);

	function toggle(column: BaseROIColumn, on: boolean): void {
		hiddenColumns.value = on
			? hiddenColumns.value.filter((c) => c !== column)
			: [...hiddenColumns.value, column];
	}
</script>

<template>
	<PPopover placement="bottom-end">
		<template #trigger>
			<PButton type="secondary" size="sm">
				<template #icon><ViewColumnSharp /></template>
				{{
					t("base_roi.columns.button", {
						shown,
						total: BASE_ROI_COLUMNS.length + 1,
					})
				}}
			</PButton>
		</template>
		<div class="flex flex-col gap-1 w-[240px]">
			<PCheckbox :checked="true" disabled>
				{{ t("base_roi.columns.product") }}
			</PCheckbox>
			<PCheckbox
				v-for="c in BASE_ROI_COLUMNS"
				:key="c"
				:checked="!hiddenColumns.includes(c)"
				@update:checked="(v) => toggle(c, !!v)">
				{{ t(`base_roi.columns.${c}`) }}
			</PCheckbox>
			<PButton
				size="sm"
				type="secondary"
				class="mt-2"
				@click="hiddenColumns = []">
				{{ t("base_roi.columns.reset") }}
			</PButton>
		</div>
	</PPopover>
</template>
