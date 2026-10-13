<script setup lang="ts">
	import {
		nextTick,
		onBeforeUnmount,
		onMounted,
		onUpdated,
		ref,
		watch,
	} from "vue";
	import type { Placement } from "@popperjs/core";

	// Composables
	import { createFloating } from "@/ui/popper";
	import { useTooltipTrigger } from "@/ui/useTooltipTrigger";

	// UI
	import { tooltipConfig } from "@/ui/styles";
	import { Z_TOOLTIP } from "@/ui/zIndex";

	/**
	 * Hover, focus or tap shows the default slot next to the #trigger slot.
	 * Open rules: useTooltipTrigger.
	 *
	 * @author jplacht
	 */
	const {
		placement = "top",
		offset = 8,
		disabled = false,
	} = defineProps<{
		placement?: Placement;
		offset?: number;
		disabled?: boolean;
	}>();

	const FOCUSABLE =
		'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

	const triggerRef = ref<HTMLElement | null>(null);
	const tooltipRef = ref<HTMLElement | null>(null);

	const { open, id, hide, triggerEvents, panelEvents } = useTooltipTrigger(
		triggerRef,
		tooltipRef,
		() => disabled
	);

	// a trigger with nothing focusable inside takes focus itself
	const ownFocus = ref(false);

	// while open, the trigger's first focusable element is described by the
	// panel; closed tooltips add nothing to the page
	let described: Element | null = null;
	function link(): void {
		const wrap = triggerRef.value;
		if (!wrap) return;
		const inner = [...wrap.querySelectorAll(FOCUSABLE)].find(
			(el) => el !== wrap
		);
		ownFocus.value = !inner && !disabled;
		const target = disabled || !open.value ? null : (inner ?? wrap);
		if (described && described !== target)
			described.removeAttribute("aria-describedby");
		target?.setAttribute("aria-describedby", id);
		described = target;
	}
	onMounted(link);
	onUpdated(link);

	let floating: { destroy: () => void } | null = null;
	watch(open, async (value) => {
		floating?.destroy();
		floating = null;
		if (!value) return;
		await nextTick();
		if (open.value && triggerRef.value && tooltipRef.value)
			floating = createFloating(
				triggerRef.value,
				tooltipRef.value,
				placement,
				offset
			);
	});
	watch(
		() => disabled,
		(value) => value && hide()
	);

	onBeforeUnmount(() => floating?.destroy());
</script>

<template>
	<div
		ref="triggerRef"
		:class="tooltipConfig.trigger"
		:tabindex="ownFocus ? 0 : undefined"
		v-on="triggerEvents">
		<slot name="trigger"></slot>
	</div>

	<Teleport v-if="open" to="body">
		<div
			:id="id"
			ref="tooltipRef"
			role="tooltip"
			:class="tooltipConfig.tooltip"
			:style="{ zIndex: Z_TOOLTIP }"
			v-on="panelEvents">
			<slot />
		</div>
	</Teleport>
</template>
