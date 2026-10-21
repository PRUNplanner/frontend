<script setup lang="ts">
	// UI
	import PButton from "@/ui/components/PButton.vue";

	// one module's data area: a skeleton at its final size while loading
	// (also while its async component loads), the error with retry, or the
	// content
	const {
		ready,
		failed = false,
		size,
	} = defineProps<{
		/** the data is there */
		ready: boolean;
		failed?: boolean;
		/** height classes of the skeleton and the error, e.g. "h-80" */
		size: string;
	}>();

	defineEmits<{ (e: "retry"): void }>();
</script>

<template>
	<div
		v-if="failed"
		role="alert"
		class="flex flex-wrap items-center justify-center gap-3 rounded-panel border border-line text-muted"
		:class="size">
		{{ $t("market_report.error") }}
		<PButton type="secondary" size="sm" @click="$emit('retry')">
			{{ $t("wrapper.retry") }}
		</PButton>
	</div>
	<Suspense v-else-if="ready">
		<slot />
		<template #fallback>
			<div
				aria-busy="true"
				data-skeleton
				class="rounded-panel bg-white/5 motion-safe:animate-pulse"
				:class="size">
				<span class="sr-only">{{ $t("wrapper.loading") }}</span>
			</div>
		</template>
	</Suspense>
	<div
		v-else
		aria-busy="true"
		data-skeleton
		class="rounded-panel bg-white/5 motion-safe:animate-pulse"
		:class="size">
		<span class="sr-only">{{ $t("wrapper.loading") }}</span>
	</div>
</template>
