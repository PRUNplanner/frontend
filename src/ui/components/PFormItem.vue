<script setup lang="ts">
	import { computed, provide, useId, useSlots } from "vue";

	import { formItemKey } from "@/ui/formItem";
	import { formItemConfig } from "@/ui/styles";

	const { label, error = undefined } = defineProps<{
		label: string;
		/** shown under the field, which gets status="error" and the message as its description */
		error?: string;
	}>();

	const slots = useSlots();
	const inputId = useId();
	const labelId = `${inputId}-label`;
	const errorId = `${inputId}-error`;
	const infoId = `${inputId}-info`;

	const describedBy = computed(
		() =>
			[error ? errorId : "", slots.info ? infoId : ""]
				.filter(Boolean)
				.join(" ") || undefined
	);
	const status = computed(() => (error ? ("error" as const) : undefined));

	provide(formItemKey, { inputId, labelId, describedBy, status });
</script>

<template>
	<label :id="labelId" :for="inputId" :class="formItemConfig.label">
		{{ label }}
	</label>
	<div :class="formItemConfig.content">
		<slot />
	</div>
	<div v-if="error" :id="errorId" class="col-2 pb-1 text-xs text-negative">
		{{ error }}
	</div>
	<div v-if="$slots.info" :id="infoId" class="col-2 pb-1 text-xs text-muted">
		<slot name="info" />
	</div>
</template>
