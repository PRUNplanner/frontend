<script setup lang="ts">
	import { ref, onBeforeUnmount, nextTick } from "vue";
	import { tooltipConfig } from "@/ui/styles";
	import { createFloating } from "@/ui/popper";
	import type { Placement } from "@popperjs/core";

	const {
		placement = "top",
		offset = 8,
		disabled = false,
	} = defineProps<{
		placement?: Placement;
		offset?: number;
		disabled?: boolean;
	}>();

	const triggerRef = ref<HTMLElement | null>(null);
	const tooltipRef = ref<HTMLElement | null>(null);
	let floating: { destroy: () => void } | null = null;
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;
	const isVisible = ref(false);

	async function show() {
		if (disabled) return;

		if (hideTimeout) clearTimeout(hideTimeout);

		if (isVisible.value) return;

		isVisible.value = true;
		await nextTick();

		if (triggerRef.value && tooltipRef.value)
			floating = createFloating(
				triggerRef.value,
				tooltipRef.value,
				placement,
				offset
			);
	}

	function scheduleHide() {
		if (hideTimeout) clearTimeout(hideTimeout);

		hideTimeout = setTimeout(() => {
			hide();
		}, 150);
	}

	function hide() {
		isVisible.value = false;
		floating?.destroy();
		floating = null;
	}

	onBeforeUnmount(() => {
		if (hideTimeout) clearTimeout(hideTimeout);
		hide();
	});
</script>

<template>
	<div
		ref="triggerRef"
		:class="tooltipConfig.trigger"
		@mouseenter="show"
		@mouseleave="scheduleHide">
		<slot name="trigger"></slot>
	</div>

	<Teleport to="body">
		<div
			v-if="isVisible"
			ref="tooltipRef"
			class="z-9999"
			:class="tooltipConfig.tooltip"
			@mouseenter="show"
			@mouseleave="scheduleHide">
			<slot />
		</div>
	</Teleport>
</template>
