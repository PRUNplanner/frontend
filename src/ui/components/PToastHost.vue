<script setup lang="ts">
	// Composables
	import { closeToast, pauseToast, resumeToast, toasts } from "@/ui/useToast";

	// UI
	import PToast from "@/ui/components/PToast.vue";
	import { Z_TOAST } from "@/ui/zIndex";
</script>

<template>
	<!-- the message container: bottom-right, above the plan page's
	 floating Insights button, above layers and outside the inert #app;
	 --toast-bottom (style.css) lifts it over bottom bars on a phone.
	 The slot (the update notice) sits below the toasts. -->
	<Teleport to="body">
		<div
			class="ptoast-host fixed left-0 right-4 bottom-[var(--toast-bottom,5rem)] h-0 flex flex-col items-end justify-end"
			:style="{ zIndex: Z_TOAST }">
			<TransitionGroup
				tag="div"
				class="flex flex-col items-end"
				enter-active-class="transition-[opacity,transform] duration-300"
				leave-active-class="transition-[opacity,transform] duration-300"
				enter-from-class="opacity-0 scale-85"
				leave-to-class="opacity-0 scale-85">
				<div
					v-for="t in toasts"
					:key="t.id"
					class="flex mb-2 origin-top"
					@mouseenter="pauseToast(t.id)"
					@mouseleave="resumeToast(t.id)">
					<PToast
						:type="t.type"
						:text="t.text"
						:action-label="t.action?.label"
						:closable="t.closable"
						@action="t.action?.onClick()"
						@close="closeToast(t.id)" />
				</div>
			</TransitionGroup>
			<slot />
		</div>
	</Teleport>
</template>
