<script setup lang="ts">
	import { ColorKey, SizeKey } from "@/ui/ui.types";
	import { tagConfig } from "@/ui/styles";

	const {
		value = undefined,
		type = "primary",
		size = "md",
	} = defineProps<{
		value?: string;
		type?: ColorKey;
		size?: SizeKey;
	}>();

	defineEmits<{
		(e: "click", value: MouseEvent): void;
	}>();
</script>

<template>
	<div
		:class="`${tagConfig.sizes[size].container} ${tagConfig.colors[type]}`">
		<div v-if="value" class="text-nowrap">
			{{ value }}
		</div>
		<slot v-else />
		<div
			v-if="$slots.icon"
			:class="tagConfig.sizes[size].icon"
			@click.stop="$emit('click', $event)">
			<slot name="icon" />
		</div>
	</div>
</template>
