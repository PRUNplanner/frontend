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
</script>

<template>
	<div class="flex flex-row justify-between items-center gap-3 p-1">
		<div class="flex flex-row items-center gap-3">
			<PSelect
				:value="modelValue.field"
				:options="
					Object.keys(FieldConfigs).map((k) => ({
						label: FieldConfigs[k as SchemaKey]!.label,
						value: k,
					}))
				"
				class="w-[250px]"
				@update:value="
					(val) => updateDetector({ field: val as any })
				" />
			<PSelect
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

		<PButton type="error" @click="emit('remove')">
			<template #icon><ClearSharp /></template>
		</PButton>
	</div>
</template>
