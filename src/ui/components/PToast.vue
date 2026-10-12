<script setup lang="ts">
	// UI
	import PButton from "./PButton.vue";
	import PIcon from "./PIcon.vue";
	import PLayerClose from "./PLayerClose.vue";
	import { ErrorOutlineSharp } from "@vicons/material";

	import { toastConfig } from "@/ui/styles";

	const {
		type = "info",
		text,
		actionLabel = undefined,
		closable = false,
	} = defineProps<{
		type?: "info" | "error";
		text: string;
		actionLabel?: string;
		closable?: boolean;
	}>();

	defineEmits<{
		(e: "action" | "close"): void;
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
		<PLayerClose v-if="closable" @click="$emit('close')" />
	</div>
</template>
