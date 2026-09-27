<script setup lang="ts">
	import { reactive } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// Components
	import RuleGroup from "@/features/market_live/components/RuleGroup.vue";

	// Types & Interfaces
	import type { DetectorConfig } from "@/features/market_live/cxDetectors.types";

	// UI
	import PInput from "@/ui/components/PInput.vue";
	import PSelect from "@/ui/components/PSelect.vue";
	import PButton from "@/ui/components/PButton.vue";
	import type { PSelectOption } from "@/ui/ui.types";

	const severityOptions: PSelectOption[] = [
		{ label: "Low", value: "LOW" },
		{ label: "Medium", value: "MEDIUM" },
		{ label: "High", value: "HIGH" },
	];

	const state = reactive<DetectorConfig>({
		id: crypto.randomUUID(),
		name: t("market_live.components.rule_builder.new_rule_name"),
		severity: "MEDIUM",
		enabled: true,
		logic: { operator: "AND", conditions: [] },
	});

	const save = () =>
		console.log("Payload:", JSON.parse(JSON.stringify(state)));
</script>

<template>
	<div class="p-3 bg-white/10 border border-dark-gray rounded">
		<div class="flex justify-between items-center mb-8">
			<PInput v-model:value="state.name" />

			<div class="flex gap-2">
				<PSelect
					v-model:value="state.severity"
					:options="severityOptions" />
				<PButton @click="save">Save</PButton>
			</div>
		</div>

		<RuleGroup
			:group="state.logic"
			@update:group="(val) => (state.logic = val)" />
	</div>
</template>
