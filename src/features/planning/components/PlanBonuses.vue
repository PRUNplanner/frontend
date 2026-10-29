<script setup lang="ts">
	import { computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackPlanEdit } from "@/lib/analytics/useAnalytics";
	// Types & Interfaces
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";

	// UI
	import { PCheckbox, PSelect, PTooltip } from "@/ui";
	import type { PSelectOption } from "@/ui/ui.types";

	const { planetNaturalId } = defineProps<{
		disabled: boolean;
		planetNaturalId: string;
	}>();

	const corphq = defineModel<boolean>("corphq", {
		required: true,
		set: (value) => {
			trackPlanEdit({
				field: "corphq",
				planet_natural_id: planetNaturalId,
				value,
			});
			return value;
		},
	});

	const cogc = defineModel<PlanCOGCProgram>("cogc", {
		required: true,
		set: (value) => {
			trackPlanEdit({
				field: "cogc",
				planet_natural_id: planetNaturalId,
				value,
			});
			return value;
		},
	});

	const cogcOptions = computed<PSelectOption[]>(() => [
		{ value: "---", label: t("game.cogc_program.NONE") },
		{
			value: "AGRICULTURE",
			label: t("game.cogc_program.ADVERTISING_AGRICULTURE"),
		},
		{
			value: "CHEMISTRY",
			label: t("game.cogc_program.ADVERTISING_CHEMISTRY"),
		},
		{
			value: "CONSTRUCTION",
			label: t("game.cogc_program.ADVERTISING_CONSTRUCTION"),
		},
		{
			value: "ELECTRONICS",
			label: t("game.cogc_program.ADVERTISING_ELECTRONICS"),
		},
		{
			value: "FOOD_INDUSTRIES",
			label: t("game.cogc_program.ADVERTISING_FOOD_INDUSTRIES"),
		},
		{
			value: "FUEL_REFINING",
			label: t("game.cogc_program.ADVERTISING_FUEL_REFINING"),
		},
		{
			value: "MANUFACTURING",
			label: t("game.cogc_program.ADVERTISING_MANUFACTURING"),
		},
		{
			value: "METALLURGY",
			label: t("game.cogc_program.ADVERTISING_METALLURGY"),
		},
		{
			value: "RESOURCE_EXTRACTION",
			label: t("game.cogc_program.ADVERTISING_RESOURCE_EXTRACTION"),
		},
		{ value: "PIONEERS", label: t("game.cogc_program.WORKFORCE_PIONEERS") },
		{ value: "SETTLERS", label: t("game.cogc_program.WORKFORCE_SETTLERS") },
		{
			value: "TECHNICIANS",
			label: t("game.cogc_program.WORKFORCE_TECHNICIANS"),
		},
		{
			value: "ENGINEERS",
			label: t("game.cogc_program.WORKFORCE_ENGINEERS"),
		},
		{
			value: "SCIENTISTS",
			label: t("game.cogc_program.WORKFORCE_SCIENTISTS"),
		},
	]);
</script>

<template>
	<div class="flex flex-col gap-3 text-sm">
		<!-- label left, control right, like Corp. HQ and Permits below -->
		<label class="flex items-center justify-between gap-3">
			{{ t("plan.components.bonuses.cogc") }}
			<PSelect
				v-model:value="cogc"
				:aria-label="t('plan.components.bonuses.cogc')"
				size="sm"
				class="flex-1 min-w-0 max-w-44"
				:disabled="disabled"
				:options="cogcOptions" />
		</label>
		<div class="flex items-center justify-between gap-3">
			<PTooltip>
				<template #trigger>
					<span>{{ t("plan.components.bonuses.corp_hq") }}</span>
				</template>
				{{ t("plan.components.bonuses.corp_hq_tooltip") }}
			</PTooltip>
			<PCheckbox
				v-model:checked="corphq"
				:aria-label="t('plan.components.bonuses.corp_hq')"
				:disabled="disabled" />
		</div>
	</div>
</template>
