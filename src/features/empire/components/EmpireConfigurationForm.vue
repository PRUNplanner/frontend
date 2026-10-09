<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Types & Interfaces
	import type { PlanEmpireElement } from "@/features/api/schemas/empireData.schemas";
	import { factionOptions } from "@/features/empire/empire.constants";

	// UI
	import { PForm, PFormItem, PInputNumber, PInput, PSelect } from "@/ui";

	const empire = defineModel<PlanEmpireElement>({ required: true });
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
