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
		/** px, or any CSS width; on small screens 48 px of the mask stay visible */
		width?: number | string;
		placement?: "left" | "right";
		closable?: boolean;
		autoFocus?: boolean;
		bodyClass?: string;
	}>();

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
					class="pdrawer-panel absolute inset-y-0 flex flex-col max-w-[calc(100vw-48px)] bg-gray-dark text-white/82 text-sm leading-[1.6] outline-none shadow-[0_6px_16px_-9px_rgba(0,0,0,.08),0_9px_28px_0_rgba(0,0,0,.05),0_12px_48px_16px_rgba(0,0,0,.03)]"
					:class="
						placement === 'right'
							? 'right-0 rounded-l-[3px]'
							: 'left-0 rounded-r-[3px]'
					"
					:data-placement="placement"
					:style="{
						width: typeof width === 'number' ? `${width}px` : width,
					}">
					<div
						v-if="hasHeader || closable"
						data-layer-header
						class="flex items-center justify-between px-6 py-4 border-b border-white/9 text-[18px]/4.5 font-medium text-white/90">
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
</style>
