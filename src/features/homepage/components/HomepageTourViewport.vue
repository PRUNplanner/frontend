<script setup lang="ts">
	import {
		tourHighlight,
		tourTransform,
	} from "@/features/homepage/homepageTour.util";

	// Types & Interfaces
	import type { IHomepageTourStep } from "@/features/homepage/homepageTour.types";

	defineProps<{
		step: IHomepageTourStep;
		/** none until the tour comes near (HomepageTour) */
		src?: string;
		alt: string;
		imageAttrs: Record<string, string>;
	}>();
</script>

<template>
	<!-- zooms and pans to the step's region, the rest dimmed -->
	<div class="relative w-full aspect-[16/10] overflow-hidden bg-[#030707]">
		<div
			class="absolute inset-0 origin-top-left transition-transform duration-1100 ease-[cubic-bezier(.65,0,.25,1)]"
			:style="{ transform: tourTransform(step) }">
			<img
				v-if="src"
				:src="src"
				v-bind="imageAttrs"
				width="2880"
				height="1800"
				:alt="alt"
				class="block w-full h-full" />
			<div
				aria-hidden="true"
				class="absolute outline-solid outline-prunplanner shadow-[0_0_0_9999px_rgba(3,7,7,0.5)] transition-all duration-1100 ease-[cubic-bezier(.65,0,.25,1)]"
				:style="tourHighlight(step)" />
		</div>
	</div>
</template>
