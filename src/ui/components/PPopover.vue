<script setup lang="ts">
	import { onBeforeUnmount, onMounted, ref, type Ref, watch } from "vue";
	import type { Placement } from "@popperjs/core";

	// Composables
	import { createFloating } from "@/ui/popper";
	import { useOverlayLayer } from "@/ui/useOverlayLayer";

	// UI
	import { panelConfig } from "@/ui/styles";

	// class and aria attributes go on the panel
	defineOptions({ inheritAttrs: false });

	const show = defineModel<boolean>("show", { default: false });

	const {
		trigger = "click",
		placement = "bottom",
		panelClass = "p-3",
		anchor = undefined,
		arrow = false,
	} = defineProps<{
		/** click toggles on the trigger; manual leaves it to v-model:show */
		trigger?: "click" | "manual";
		placement?: Placement;
		/** added to the kit's panel look; replaces the default padding */
		panelClass?: string;
		/** positions at this element instead of the trigger slot */
		anchor?: HTMLElement;
		/** an arrow pointing at the trigger */
		arrow?: boolean;
	}>();

	const emit = defineEmits<{
		(e: "clickoutside", event: MouseEvent): void;
	}>();

	const wrap: Ref<HTMLElement | null> = ref(null);
	const panel: Ref<HTMLElement | null> = ref(null);

	const { zIndex, inLayerAbove } = useOverlayLayer(show, panel, {
		autoFocus: () => false,
		close: () => (show.value = false),
		modal: false,
	});

	// the trigger's own element; wrappers with the class "contents" don't
	// render a box of their own
	function triggerEl(): Element | null {
		let el = wrap.value?.firstElementChild ?? null;
		while (el?.classList.contains("contents")) el = el.firstElementChild;
		return el;
	}

	function onTriggerClick(): void {
		if (trigger === "click") show.value = !show.value;
	}

	// mousedown, before a picked PSelect option is removed from the page
	function onDocumentDown(e: MouseEvent): void {
		const target = e.target as Node;
		if (
			wrap.value?.contains(target) ||
			anchor?.contains(target) ||
			panel.value?.contains(target) ||
			(target instanceof Element &&
				target.closest("[data-pselect-dropdown]")) ||
			inLayerAbove(target)
		)
			return;
		emit("clickoutside", e);
		if (trigger === "click") show.value = false;
	}

	let floating: { destroy: () => void } | null = null;
	function sync(): void {
		const open = show.value;
		floating?.destroy();
		floating = null;
		document.removeEventListener("mousedown", onDocumentDown, true);

		const el = triggerEl();
		if (!anchor && el?.matches("button, [role]"))
			el.setAttribute("aria-expanded", String(open));

		const reference = anchor ?? el;
		if (!open || !panel.value || !reference) return;
		floating = createFloating(
			reference,
			panel.value,
			placement,
			arrow ? 10 : 6
		);
		document.addEventListener("mousedown", onDocumentDown, true);
	}

	// after the render, when the trigger and the panel exist
	watch([show, () => anchor], sync, { flush: "post" });
	onMounted(sync);

	onBeforeUnmount(() => {
		floating?.destroy();
		document.removeEventListener("mousedown", onDocumentDown, true);
	});
</script>

<template>
	<span ref="wrap" class="contents" @click="onTriggerClick">
		<slot name="trigger" />
	</span>
	<Teleport v-if="show" to="body">
		<div
			ref="panel"
			v-bind="$attrs"
			:class="[panelConfig.panel, panelClass]"
			:style="{ zIndex }">
			<div v-if="arrow" class="parrow-wrap">
				<div class="parrow" />
			</div>
			<slot />
		</div>
	</Teleport>
</template>

<style scoped>
	/* the arrow: a rotated square half outside the panel's edge */
	.parrow-wrap {
		position: absolute;
		left: 0;
		right: 0;
		height: 10px;
		overflow: hidden;
		pointer-events: none;
	}
	[data-popper-placement^="top"] > .parrow-wrap {
		top: 100%;
	}
	[data-popper-placement^="bottom"] > .parrow-wrap {
		bottom: 100%;
	}
	.parrow {
		position: absolute;
		left: calc(50% - 4.2383px);
		width: 8.4766px;
		height: 8.4766px;
		transform: rotate(45deg);
		background-color: var(--color-surface);
		border: 1px solid var(--color-line-strong);
	}
	/* only the two outer edges carry the panel's border */
	[data-popper-placement^="top"] .parrow {
		top: -4.2383px;
		border-top-color: transparent;
		border-left-color: transparent;
	}
	[data-popper-placement^="bottom"] .parrow {
		bottom: -4.2383px;
		border-bottom-color: transparent;
		border-right-color: transparent;
	}
	[data-popper-placement$="-start"] .parrow {
		left: 10px;
	}
	[data-popper-placement$="-end"] .parrow {
		left: auto;
		right: 10px;
	}
</style>
