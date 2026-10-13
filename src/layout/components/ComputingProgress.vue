<script setup lang="ts">
	import { PProgressBar } from "@/ui";

	const {
		step,
		total,
		elementWidth = "w-[400px]",
		message = undefined,
	} = defineProps<{
		step: number;
		total: number;
		elementWidth?: string;
		message?: string;
	}>();
</script>

<template>
	<div
		class="relative w-full h-full bg-center bg-repeat bg-[url(/images/bg_striped_prunplanner.png)]">
		<div class="absolute inset-0 flex items-center justify-center">
			<div
				class="bg-black p-8 rounded shadow-lg text-center"
				:class="elementWidth">
				<PProgressBar :step="step" :total="total" />
				<div v-if="message" class="pt-3 text-xs text-muted">
					{{ message }}
				</div>
			</div>
		</div>
	</div>
</template>
