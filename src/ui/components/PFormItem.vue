<script setup lang="ts">
	import { formItemConfig } from "@/ui/styles";
	const { label } = defineProps<{ label: string }>();
</script>

<template>
	<div :class="formItemConfig.label">
		{{ label }}
	</div>
	<div :class="formItemConfig.content">
		<slot />
	</div>
	<div v-if="$slots.info" class="col-2 pb-1 text-xs text-muted">
		<slot name="info" />
	</div>
</template>
