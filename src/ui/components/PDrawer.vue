<script setup lang="ts">
	import { computed, ref, type Ref, useId, useSlots } from "vue";

	// Composables
	import { useOverlayLayer } from "@/ui/useOverlayLayer";

	// UI
	import PLayerClose from "@/ui/components/PLayerClose.vue";

	// aria attributes go on the panel
	defineOptions({ inheritAttrs: false });

	const show = defineModel<boolean>("show", { required: true });

	const {
		title = undefined,
		width = 600,
		placement = "right",
		closable = true,
		autoFocus = true,
		bodyClass = undefined,
	} = defineProps<{
		title?: string;
		/** px, or any CSS width; on small screens 48 px of the mask stay visible; not for bottom */
		width?: number | string;
		/** bottom: a sheet over the full width, at most 85vh, with a grab handle */
		placement?: "left" | "right" | "bottom";
		closable?: boolean;
		autoFocus?: boolean;
		bodyClass?: string;
	}>();

	const PLACEMENT_CLASS = {
		right: "inset-y-0 right-0 max-w-[calc(100vw-48px)] rounded-l-panel",
		left: "inset-y-0 left-0 max-w-[calc(100vw-48px)] rounded-r-panel",
		bottom: "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl",
	};

	const slots = useSlots();
	const hasHeader = computed(() => !!title || !!slots.header);

	const panel: Ref<HTMLElement | null> = ref(null);
	const titleId = useId();

	function close(): void {
		show.value = false;
	}

	const { zIndex, maskDown, maskClick } = useOverlayLayer(show, panel, {
		autoFocus: () => autoFocus,
		close,
	});
</script>

<template>
	<Teleport to="body">
		<Transition appear name="pdrawer" :duration="300">
			<div v-if="show" class="fixed inset-0" :style="{ zIndex }">
				<div
					class="pdrawer-mask absolute inset-0 bg-black/30"
					@mousedown="maskDown"
					@click="maskClick" />
				<!-- the panel takes focus only when autoFocus is off; no ring around all of it -->
				<div
					ref="panel"
					v-bind="$attrs"
					role="dialog"
					aria-modal="true"
					:aria-labelledby="hasHeader ? titleId : undefined"
					tabindex="-1"
					class="pdrawer-panel absolute flex flex-col bg-surface text-ink text-sm leading-[1.6] outline-none shadow-panel"
					:class="PLACEMENT_CLASS[placement]"
					:data-placement="placement"
					:style="
						placement === 'bottom'
							? undefined
							: {
									width:
										typeof width === 'number'
											? `${width}px`
											: width,
								}
					">
					<div
						v-if="placement === 'bottom'"
						aria-hidden="true"
						class="shrink-0 mx-auto mt-2 h-1 w-9 rounded-full bg-line-strong" />
					<div
						v-if="hasHeader || closable"
						data-layer-header
						class="flex items-center justify-between px-6 py-4 border-b border-line text-lg/4.5 font-medium text-ink-strong">
						<div :id="titleId" class="flex-1 min-w-0">
							<slot name="header">{{ title }}</slot>
						</div>
						<PLayerClose
							v-if="closable"
							class="ml-0.75 -my-0.75"
							@click="close" />
					</div>
					<div
						class="flex-1 min-h-0 overflow-auto px-6 py-4"
						:class="bodyClass">
						<slot />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
	.pdrawer-enter-active .pdrawer-mask,
	.pdrawer-leave-active .pdrawer-mask {
		transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.pdrawer-enter-from .pdrawer-mask,
	.pdrawer-leave-to .pdrawer-mask {
		opacity: 0;
	}

	.pdrawer-enter-active .pdrawer-panel {
		transition: transform 0.3s cubic-bezier(0, 0, 0.2, 1);
	}
	.pdrawer-leave-active .pdrawer-panel {
		transition: transform 0.3s cubic-bezier(0.4, 0, 1, 1);
	}
	.pdrawer-enter-from .pdrawer-panel[data-placement="right"],
	.pdrawer-leave-to .pdrawer-panel[data-placement="right"] {
		transform: translateX(100%);
	}
	.pdrawer-enter-from .pdrawer-panel[data-placement="left"],
	.pdrawer-leave-to .pdrawer-panel[data-placement="left"] {
		transform: translateX(-100%);
	}
	.pdrawer-enter-from .pdrawer-panel[data-placement="bottom"],
	.pdrawer-leave-to .pdrawer-panel[data-placement="bottom"] {
		transform: translateY(100%);
	}
</style>
