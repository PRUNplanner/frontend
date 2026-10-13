<script setup lang="ts">
	import { ref, type Ref, useId } from "vue";

	// Composables
	import { useOverlayLayer } from "@/ui/useOverlayLayer";

	// UI
	import PLayerClose from "@/ui/components/PLayerClose.vue";

	// aria attributes go on the panel
	defineOptions({ inheritAttrs: false });

	const show = defineModel<boolean>("show", { required: true });

	const {
		title = undefined,
		closable = true,
		maskClosable = true,
		autoFocus = true,
		width = "100%",
	} = defineProps<{
		title?: string;
		closable?: boolean;
		maskClosable?: boolean;
		autoFocus?: boolean;
		/** px, or any CSS width; 16 px of the mask stay visible on each side */
		width?: number | string;
	}>();

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
		<Transition
			appear
			enter-active-class="transition-opacity duration-200 ease-out"
			leave-active-class="transition-opacity duration-200 ease-in"
			enter-from-class="opacity-0"
			leave-to-class="opacity-0">
			<div
				v-if="show"
				class="fixed inset-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-line-strong)_transparent]"
				:style="{ zIndex }">
				<div class="fixed inset-0 bg-black/40" />
				<div
					class="relative flex min-h-full"
					@mousedown="maskDown"
					@click="maskClosable && maskClick($event)">
					<!-- the panel takes focus only when autoFocus is off; no ring around all of it -->
					<div
						ref="panel"
						v-bind="$attrs"
						role="dialog"
						aria-modal="true"
						:aria-labelledby="title ? titleId : undefined"
						tabindex="-1"
						:style="{
							width: typeof width === 'number' ? `${width}px` : width,
						}"
						class="relative m-auto max-w-[calc(100vw-32px)] flex flex-col bg-surface rounded-panel text-ink text-sm leading-[1.6] [word-break:break-word] outline-none shadow-panel">
						<div
							v-if="title || closable"
							data-layer-header
							class="flex items-center px-2.5 py-1.25 text-base/[1.6]">
							<h2
								:id="titleId"
								class="flex-1 min-w-0 font-bold text-ink-strong">
								{{ title }}
							</h2>
							<PLayerClose
								v-if="closable"
								class="ml-1.25"
								@click="close" />
						</div>
						<div class="flex-1 min-w-0 px-2.5 pb-1.25">
							<slot />
						</div>
						<div
							v-if="$slots.action"
							class="px-2.5 py-1.25 bg-surface rounded-b-panel">
							<slot name="action" />
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
