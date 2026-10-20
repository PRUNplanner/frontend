<script setup lang="ts">
	import { computed, onMounted, ref } from "vue";

	// Composables
	import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
	import { getPostHogKey } from "@/lib/analytics/usePostHog";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// logged out, reopens the consent banner; logged in, the Profile toggle
	// changes the choice. Not before mount: the prerendered landing page is
	// built without a PostHog key and hydrates as rendered.
	const userStore = useUserStore();
	const { isDNT, reopen } = useAnalyticsConsent();
	const mounted = ref(false);
	onMounted(() => (mounted.value = true));
	const show = computed<boolean>(
		() =>
			mounted.value &&
			!userStore.isLoggedIn &&
			!isDNT &&
			getPostHogKey() !== undefined
	);
</script>

<template>
	<button
		v-if="show"
		type="button"
		class="inline-flex items-center min-h-11 lg:min-h-6 hover:underline cursor-pointer"
		@click="reopen">
		{{ $t("analytics.banner.footer_link") }}
	</button>
</template>
