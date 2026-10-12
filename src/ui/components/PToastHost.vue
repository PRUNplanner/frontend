<script setup lang="ts">
	// Composables
	import {
		closeToast,
		pauseToast,
		resumeToast,
		toasts,
	} from "@/ui/useToast";

	// UI
	import PToast from "@/ui/components/PToast.vue";
</script>

<template>
	<!-- naive-ui's message container: bottom-right, above the plan page's
	 floating Insights button, above layers and outside the inert #app -->
	<Teleport to="body">
		<TransitionGroup
			tag="div"
			class="fixed left-0 right-4 bottom-20 h-0 z-6000 flex flex-col items-end justify-end"
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
	</Teleport>
</template>
