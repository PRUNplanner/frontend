<script setup lang="ts">
	import { computed } from "vue";

	// Components
	import TargetEditor from "@/features/market_live/components/TargetEditor.vue";

	// Types & Interfaces
	import type { Detector } from "@/features/market_live/cxDetectors.types";
	import {
		FieldConfigs,
		type SchemaKey,
	} from "@/features/market_live/fieldConfigs";

	// UI
	import PButton from "@/ui/components/PButton.vue";
	import PSelect from "@/ui/components/PSelect.vue";
	import { ClearSharp } from "@vicons/material";

	const props = defineProps<{ modelValue: Detector }>();
	const emit = defineEmits(["remove", "update:modelValue"]);

	const config = computed(
		() => FieldConfigs[props.modelValue.field as SchemaKey]
	);

	const configOptions = computed(() =>
		config.value!.operators.map((o) => ({
			label: o.toUpperCase(),
			value: o,
		}))
	);

	const updateDetector = (patch: Partial<Detector>) => {
		emit("update:modelValue", {
			...props.modelValue,
			...patch,
		});
	};

	// operator and target of a number field never match a string field
	const updateField = (field: SchemaKey) => {
		const next = FieldConfigs[field]!;
		if (next.type === config.value!.type) {
			updateDetector({ field: field as Detector["field"] });
			return;
		}
		updateDetector({
			field: field as Detector["field"],
			operator: next.operators[0],
			target: { type: "static", value: next.type === "number" ? 0 : "" },
		});
	};
</script>

<template>
	<div class="flex flex-row justify-between items-center gap-3 p-1">
		<div class="flex flex-row items-center gap-3">
			<PSelect
				:aria-label="$t('market_live.components.detector.field')"
				:value="modelValue.field"
				:options="
					Object.keys(FieldConfigs).map((k) => ({
						label: FieldConfigs[k as SchemaKey]!.label,
						value: k,
					}))
				"
				class="w-[250px]"
				@update:value="(val) => updateField(val as SchemaKey)" />
			<PSelect
				:aria-label="$t('market_live.components.detector.operator')"
				:value="modelValue.operator"
				:options="configOptions"
				@update:value="
					(val) => updateDetector({ operator: val as any })
				" />

			<TargetEditor
				:model-value="modelValue.target"
				:operator="modelValue.operator"
				:field-type="config!.type"
				@update:model-value="
					(val) => updateDetector({ target: val })
				" />
		</div>

		<PButton
			:aria-label="
				$t('market_live.components.rule_builder.buttons.remove')
			"
			type="error"
			@click="emit('remove')">
			<template #icon><ClearSharp /></template>
		</PButton>
	</div>
</template>
