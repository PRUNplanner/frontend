<script setup lang="ts">
	import { ref, onBeforeUnmount, nextTick } from "vue";
	import { tooltipConfig } from "@/ui/styles";
	import { createPopper, Instance } from "@popperjs/core";

	const {
		placement = "top",
		offset = 8,
		disabled = false,
	} = defineProps<{
		placement?: "top" | "bottom" | "left" | "right";
		offset?: number;
		disabled?: boolean;
	}>();

	const triggerRef = ref<HTMLElement | null>(null);
	const tooltipRef = ref<HTMLElement | null>(null);
	let popperInstance: Instance | null = null;
	let ro: ResizeObserver | null = null;
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;
	const isVisible = ref(false);

	async function show() {
		if (disabled) return;

		if (hideTimeout) clearTimeout(hideTimeout);

		if (isVisible.value) return;

		isVisible.value = true;
		await nextTick();

		if (triggerRef.value && tooltipRef.value) {
			popperInstance = createPopper(triggerRef.value, tooltipRef.value, {
				placement: placement,
				strategy: "fixed",
				modifiers: [
					{ name: "offset", options: { offset: [0, offset] } },
					{
						name: "flip",
						options: {
							fallbackPlacements: [
								"top",
								"bottom",
								"left",
								"right",
							],
							boundary: "viewport",
						},
					},
					{
						name: "preventOverflow",
						options: {
							boundary: "viewport",
							padding: 8,
							altAxis: true,
							tether: false,
						},
					},
				],
			});

			requestAnimationFrame(() => popperInstance?.update());
			ro = new ResizeObserver(() => popperInstance?.update());
			ro.observe(tooltipRef.value);
		}
	}

	function scheduleHide() {
		if (hideTimeout) clearTimeout(hideTimeout);

		hideTimeout = setTimeout(() => {
			hide();
		}, 150);
	}

	function hide() {
		isVisible.value = false;
		ro?.disconnect();
		ro = null;
		popperInstance?.destroy();
		popperInstance = null;
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
