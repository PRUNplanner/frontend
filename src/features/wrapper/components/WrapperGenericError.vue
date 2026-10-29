<script setup lang="ts">
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	defineProps<{
		messageTitle?: string;
		messageText?: string;
	}>();
</script>

<template>
	<div
		class="relative w-full h-full bg-center bg-repeat bg-[url(/images/bg_striped_error.png)]">
		<div class="absolute inset-0 flex items-center justify-center">
			<div
				class="bg-black p-8 rounded shadow-lg text-center flex flex-col gap-y-3">
				<h1 class="text-2xl font-bold font-mono mb-3">
					{{ messageTitle ?? t("wrapper.error") }}
				</h1>
				<div v-if="messageText" class="max-w-75">
					{{ messageText }}
				</div>
			</div>
		</div>
	</div>
</template>
