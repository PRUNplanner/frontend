<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import type { PSelectOption } from "@/ui/ui.types";

	// UI
	import { PForm, PFormItem, PInputNumber, PInput, PSelect } from "@/ui";

	const empire = defineModel<PlanEmpireElement>({ required: true });

	const factionOptions: PSelectOption[] = [
		{ label: "No Faction", value: "NONE" },
		{ label: "Antares", value: "ANTARES" },
		{ label: "Benten", value: "BENTEN" },
		{ label: "Hortus", value: "HORTUS" },
		{ label: "Moria", value: "MORIA" },
		{ label: "Outside Region", value: "OUTSIDEREGION" },
	];
</script>

<template>
	<PForm>
		<PFormItem :label="t('empire.configuration.form.name')">
			<PInput
				v-model:value="empire.empire_name"
				:aria-label="t('empire.configuration.form.name')"
				class="w-full" />
		</PFormItem>
		<PFormItem :label="t('empire.configuration.form.faction')">
			<PSelect
				v-model:value="empire.empire_faction"
				class="w-full"
				:options="factionOptions" />
		</PFormItem>
		<PFormItem :label="t('empire.configuration.form.permits_total')">
			<PInputNumber
				v-model:value="empire.empire_permits_total"
				:aria-label="t('empire.configuration.form.permits_total')"
				show-buttons
				:min="2" />
		</PFormItem>
		<PFormItem :label="t('empire.configuration.form.permits_used')">
			<PInputNumber
				v-model:value="empire.empire_permits_used"
				:aria-label="t('empire.configuration.form.permits_used')"
				show-buttons
				:min="1" />
		</PFormItem>
	</PForm>
</template>
