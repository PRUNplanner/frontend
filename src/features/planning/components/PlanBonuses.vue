<script setup lang="ts">
	import { computed, type PropType, type WritableComputedRef } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { trackEvent } from "@/lib/analytics/useAnalytics";
	// Types & Interfaces
	import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";

	// UI
	import { PForm, PFormItem, PCheckbox, PSelect, PTooltip } from "@/ui";
	import type { PSelectOption } from "@/ui/ui.types";

	const props = defineProps({
		disabled: {
			type: Boolean,
			required: true,
		},
		corphq: {
			type: Boolean,
			required: true,
		},
		cogc: {
			type: String as PropType<PlanCOGCProgram>,
			required: true,
		},
		planetNaturalId: {
			type: String,
			required: true,
		},
	});

	const emit = defineEmits<{
		(e: "update:corphq", value: boolean): void;
		(e: "update:cogc", value: PlanCOGCProgram): void;
	}>();

	// Local State
	const localCorpHQ: WritableComputedRef<boolean> = computed({
		get: () => props.corphq,
		set: (value: boolean) => {
			emit("update:corphq", value);
			trackEvent("plan_update_corphq", {
				planetNaturalId: props.planetNaturalId,
				corphq: value,
			});
		},
	});

	const localCOGC: WritableComputedRef<PlanCOGCProgram> = computed({
		get: () => props.cogc,
		set: (value: PlanCOGCProgram) => {
			emit("update:cogc", value);
			trackEvent("plan_update_cogc", {
				planetNaturalId: props.planetNaturalId,
				cogc: value,
			});
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
	<PForm>
		<PFormItem :label="t('plan.components.bonuses.corp_hq')">
			<PTooltip>
				<template #trigger>
					<PCheckbox
						v-model:checked="localCorpHQ"
						:disabled="disabled" />
				</template>
				{{ $t("plan.components.bonuses.corp_hq_tooltip") }}
			</PTooltip>
		</PFormItem>

		<PFormItem :label="t('plan.components.bonuses.cogc')">
			<PSelect
				v-model:value="localCOGC"
				class="w-full"
				:disabled="disabled"
				:options="cogcOptions" />
		</PFormItem>
	</PForm>
</template>
