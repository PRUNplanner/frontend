<script setup lang="ts">
	import { formConfig } from "@/ui/styles";

	const { asForm = false } = defineProps<{
		asForm?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "submit"): void;
	}>();
</script>

<template>
	<form
		v-if="asForm"
		:class="formConfig.container"
		@submit.prevent="emit('submit')">
		<slot />
	</form>
	<div v-else :class="formConfig.container">
		<slot />
	</div>
</template>
