<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Util
	import { cellMath } from "@/features/base_roi/baseROITooltip.util";

	// Types & Interfaces
	import type {
		BaseROIColumn,
		BaseROISettings,
	} from "@/features/base_roi/baseROI.schemas";
	import type { IBaseROIRow } from "@/features/base_roi/baseROI.types";

	// UI
	import { PTooltip } from "@/ui";

	/**
	 * A table cell with its napkin math in a tooltip, on hover and tap. No
	 * tab stop per cell: the row detail has the same math for the keyboard.
	 * The lines are built only while it is open.
	 */
	const { row, column, settings } = defineProps<{
		row: IBaseROIRow;
		column: BaseROIColumn;
		settings: BaseROISettings;
	}>();
</script>

<template>
	<PTooltip no-focus placement="top">
		<template #trigger><slot /></template>
		<div class="flex flex-col font-mono text-xs whitespace-nowrap">
			<span
				v-for="(line, i) in cellMath(row, column, settings, t)"
				:key="i">
				{{ line }}
			</span>
		</div>
	</PTooltip>
</template>
