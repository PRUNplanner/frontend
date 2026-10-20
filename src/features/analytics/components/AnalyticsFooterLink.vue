<script setup lang="ts">
	import { computed } from "vue";

	// Composables
	import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
	import { getPostHogKey } from "@/lib/analytics/usePostHog";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// logged out, reopens the consent banner; logged in, the Profile toggle
	// changes the choice
	const userStore = useUserStore();
	const { isDNT, reopen } = useAnalyticsConsent();
	const show = computed<boolean>(
		() => !userStore.isLoggedIn && !isDNT && getPostHogKey() !== undefined
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
