<script setup lang="ts">
	import { computed } from "vue";

	// Composables
	import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
	import { getPostHogKey } from "@/lib/analytics/usePostHog";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// UI
	import PButton from "@/ui/components/PButton.vue";

	const userStore = useUserStore();
	const { consent, isDNT, reopened, grant, deny } = useAnalyticsConsent();

	// visitors only: logged-in users get the dialog. Ignored, it asks again
	// on the next app start; the footer link reopens it after a choice.
	const show = computed<boolean>(
		() =>
			!userStore.isLoggedIn &&
			!isDNT &&
			getPostHogKey() !== undefined &&
			(consent.value === null || reopened.value)
	);
</script>

<template>
	<section
		v-if="show"
		role="region"
		:aria-label="$t('analytics.banner.label')"
		class="fixed z-40 left-4 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-auto sm:max-w-[360px] flex flex-col gap-3 p-4 rounded-panel border border-line-strong bg-surface text-ink text-sm shadow-panel">
		<i18n-t keypath="analytics.banner.text" tag="p">
			<template #link>
				<router-link
					to="/imprint-tos#analytics"
					class="text-link underline">
					{{ $t("analytics.banner.details") }}
				</router-link>
			</template>
		</i18n-t>
		<div class="grid grid-cols-2 gap-3">
			<PButton type="secondary" class="min-h-11 sm:min-h-0" @click="deny">
				{{ $t("analytics.consent.deny") }}
			</PButton>
			<PButton
				type="secondary"
				class="min-h-11 sm:min-h-0"
				@click="grant">
				{{ $t("analytics.consent.allow") }}
			</PButton>
		</div>
	</section>
</template>
