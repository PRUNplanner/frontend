<script setup lang="ts">
	import { nextTick, onBeforeUnmount, ref, watch } from "vue";
	import type { Placement } from "@popperjs/core";

	// Composables
	import { createFloating } from "@/ui/popper";
	import { useHoverCard, type IHoverCardOptions } from "@/ui/useHoverCard";

	// UI
	import PDrawer from "@/ui/components/PDrawer.vue";
	import { panelConfig } from "@/ui/styles";
	import { aboveLayers } from "@/ui/useOverlayLayer";

	/**
	 * A card of content next to its #trigger, opened with hover intent
	 * (useHoverCard), or as a bottom sheet on touch. Not a tooltip: the card
	 * is a labelled region the pointer and focus can move into.
	 *
	 * The default slot gets { pinned, sheet, close }. The caller decides
	 * what a click (or Enter, Space) on the trigger does through the exposed
	 * pin/togglePin/openSheet.
	 *
	 * @author jplacht
	 */
	const {
		label,
		placement = "left",
		offset = 8,
		width = 0,
		options = {},
	} = defineProps<{
		/** the card's accessible name, also the sheet's title */
		label: string;
		placement?: Placement;
		offset?: number;
		/** the card's full width in px: with less room beside the trigger it
		 * goes to the roomier side and the slot gets narrow */
		width?: number;
		options?: IHoverCardOptions;
	}>();

	const emit = defineEmits<{
		(e: "open"): void;
		(e: "pin", pinned: boolean): void;
	}>();

	const triggerRef = ref<HTMLElement | null>(null);
	const panelRef = ref<HTMLElement | null>(null);

	const card = useHoverCard(triggerRef, panelRef, () => options, () =>
		emit("open")
	);
	const { open, pinned, sheet, id, triggerEvents, panelEvents } = card;

	// beside the trigger on the wanted side if the card fits there, else on
	// the roomier one; never wider than that side, never taller than the window
	const size = ref({ maxWidth: "none", maxHeight: "none" });
	const side = ref<Placement>(placement);
	const narrow = ref(false);
	// above the drawer or modal the trigger may sit in
	const zIndex = ref(0);
	// the viewport padding of ui/popper
	const EDGE = 8;
	function measure(): void {
		const rect = triggerRef.value!.getBoundingClientRect();
		const room = {
			left: rect.left - offset - EDGE,
			right: window.innerWidth - rect.right - offset - EDGE,
		};
		const [wanted, align] = placement.split("-");
		side.value = placement;
		// above or below: the whole width
		let free = window.innerWidth - 2 * EDGE;
		if (wanted === "left" || wanted === "right") {
			const other = wanted === "left" ? "right" : "left";
			const pick = room[wanted] >= width || room[wanted] >= room[other]
				? wanted
				: other;
			side.value = (align ? `${pick}-${align}` : pick) as Placement;
			free = room[pick];
		}
		narrow.value = free < width;
		size.value = {
			maxWidth: `${Math.max(free, 280)}px`,
			maxHeight: `${window.innerHeight - 2 * EDGE}px`,
		};
	}

	let floating: { destroy: () => void } | null = null;
	watch(open, async (value) => {
		floating?.destroy();
		floating = null;
		if (!value) return;
		measure();
		zIndex.value = aboveLayers();
		await nextTick();
		if (open.value && triggerRef.value && panelRef.value)
			floating = createFloating(
				triggerRef.value,
				panelRef.value,
				side.value,
				offset
			);
	});
	watch(pinned, (value) => emit("pin", value));
	onBeforeUnmount(() => floating?.destroy());

	defineExpose({
		pin: card.pin,
		togglePin: card.togglePin,
		hide: card.hide,
		wantsSheet: card.wantsSheet,
		openSheet: card.openSheet,
		ignoreFocus: card.ignoreFocus,
	});
</script>

<template>
	<div
		ref="triggerRef"
		role="button"
		tabindex="0"
		class="touch-target"
		:aria-expanded="open || sheet"
		:aria-controls="open ? id : undefined"
		v-on="triggerEvents">
		<slot name="trigger" />
	</div>

	<Teleport v-if="open" to="body">
		<!-- the outer box carries the safe area over the gap to the trigger -->
		<div
			:id="id"
			ref="panelRef"
			role="region"
			:aria-label="label"
			class="phovercard"
			:style="{ zIndex, '--gap': `${offset}px` }"
			data-hover-card
			v-on="panelEvents">
			<div
				:class="panelConfig.panel"
				class="overflow-auto text-sm text-ink"
				:style="size">
				<slot
					:pinned="pinned"
					:sheet="false"
					:narrow="narrow"
					:close="card.hide" />
			</div>
		</div>
	</Teleport>

	<PDrawer
		v-if="sheet"
		v-model:show="sheet"
		placement="bottom"
		body-class="px-4!"
		:title="label">
		<slot
			:pinned="false"
			:sheet="true"
			:narrow="true"
			:close="() => (sheet = false)" />
	</PDrawer>
</template>

<style scoped>
	.phovercard::before {
		content: "";
		position: absolute;
	}
	.phovercard[data-popper-placement^="left"]::before {
		left: 100%;
		inset-block: 0;
		width: var(--gap);
	}
	.phovercard[data-popper-placement^="right"]::before {
		right: 100%;
		inset-block: 0;
		width: var(--gap);
	}
	.phovercard[data-popper-placement^="top"]::before {
		top: 100%;
		inset-inline: 0;
		height: var(--gap);
	}
	.phovercard[data-popper-placement^="bottom"]::before {
		bottom: 100%;
		inset-inline: 0;
		height: var(--gap);
	}
</style>
