<script setup lang="ts">
	// UI
	import PButton from "./PButton.vue";
	import PIcon from "./PIcon.vue";
	import { ErrorOutlineSharp } from "@vicons/material";

	import { toastConfig } from "@/ui/styles";

	const {
		type = "info",
		text,
		actionLabel = undefined,
	} = defineProps<{
		type?: "info" | "error";
		text: string;
		actionLabel?: string;
	}>();

	defineEmits<{
		(e: "action"): void;
	}>();
</script>

<template>
	<div
		:role="type === 'error' ? 'alert' : 'status'"
		:class="`${toastConfig.container} ${toastConfig.types[type]}`">
		<PIcon v-if="type === 'error'" :size="18" class="text-negative">
			<ErrorOutlineSharp />
		</PIcon>
		<span class="grow">{{ text }}</span>
		<PButton
			v-if="actionLabel"
			size="sm"
			type="secondary"
			@click="$emit('action')">
			{{ actionLabel }}
		</PButton>
	</div>
</template>
