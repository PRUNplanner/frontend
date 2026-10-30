<script setup lang="ts">
	import { type Component, computed } from "vue";

	// Types & Interfaces
	import type { NoticeType } from "@/ui/ui.types";

	// UI
	import PIcon from "@/ui/components/PIcon.vue";
	import { noticeConfig } from "@/ui/styles";
	import {
		ErrorOutlineSharp,
		InfoOutlined,
		WarningSharp,
	} from "@vicons/material";

	/**
	 * A message in the page: an error, a warning or information, with an
	 * optional #action (e.g. a "Reload" button) and icon (the type's by
	 * default). Errors are announced at once (role="alert"), the others
	 * politely (role="status").
	 *
	 * @author jplacht
	 */
	const { type = "info", icon: customIcon = undefined } = defineProps<{
		type?: NoticeType;
		icon?: Component;
	}>();

	const icon = computed(
		() =>
			customIcon ??
			{
				info: InfoOutlined,
				warning: WarningSharp,
				error: ErrorOutlineSharp,
			}[type]
	);
</script>

<template>
	<div
		:role="type === 'error' ? 'alert' : 'status'"
		:class="[noticeConfig.container, noticeConfig.types[type].box]">
		<PIcon
			:size="18"
			class="shrink-0"
			:class="noticeConfig.types[type].icon">
			<component :is="icon" />
		</PIcon>
		<div class="grow min-w-0">
			<slot />
		</div>
		<div v-if="$slots.action" class="shrink-0 self-center">
			<slot name="action" />
		</div>
	</div>
</template>
