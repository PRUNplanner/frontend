<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import type { ColorKey, SizeKey } from "@/ui/ui.types";
	import { tagConfig } from "@/ui/styles";
	import { ClearSharp } from "@vicons/material";

	const {
		value = undefined,
		type = "primary",
		size = "md",
		closable = false,
	} = defineProps<{
		value?: string;
		type?: ColorKey;
		size?: SizeKey;
		/** a remove button ("Remove {value}") that emits close */
		closable?: boolean;
	}>();

	defineEmits<{
		(e: "close"): void;
	}>();
</script>

<template>
	<div
		:class="`${tagConfig.sizes[size].container} ${tagConfig.colors[type]}`">
		<div v-if="value" class="text-nowrap">
			{{ value }}
		</div>
		<slot v-else />
		<button
			v-if="closable"
			type="button"
			:class="tagConfig.sizes[size].icon"
			:aria-label="t('common.ui.tag.remove', { label: value ?? '' })"
			@click.stop="$emit('close')">
			<ClearSharp />
		</button>
	</div>
</template>
