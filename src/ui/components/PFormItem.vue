<script setup lang="ts">
	import { provide, useId } from "vue";

	import { formItemKey } from "@/ui/formItem";
	import { formItemConfig } from "@/ui/styles";
	const { label } = defineProps<{ label: string }>();

	const inputId = useId();
	const labelId = `${inputId}-label`;
	provide(formItemKey, { inputId, labelId });
</script>

<template>
	<label :id="labelId" :for="inputId" :class="formItemConfig.label">
		{{ label }}
	</label>
	<div :class="formItemConfig.content">
		<slot />
	</div>
	<div v-if="$slots.info" class="col-2 pb-1 text-xs text-muted">
		<slot name="info" />
	</div>
</template>
