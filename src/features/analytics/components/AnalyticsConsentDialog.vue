<script setup lang="ts">
	import { computed, ref, type Ref } from "vue";

	// Composables
	import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
	import { getPostHogKey } from "@/lib/analytics/usePostHog";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// UI
	import { NModal } from "naive-ui";
	import { PButton } from "@/ui";

	const userStore = useUserStore();
	const { consent, grant, deny } = useAnalyticsConsent();

	// closed without a choice: asks again on the next app start
	const dismissed: Ref<boolean> = ref(false);

	const show = computed<boolean>({
		get: () =>
			userStore.isLoggedIn &&
			consent.value === null &&
			!dismissed.value &&
			getPostHogKey() !== undefined,
		set: (value) => {
			if (!value) dismissed.value = true;
		},
	});
</script>

<template>
	<n-modal
		v-model:show="show"
		class="w-fit! max-w-175! [&_.n-base-close]:size-6!"
		:auto-focus="false"
		preset="card"
		:title="$t('analytics.consent.title')">
		<div class="flex flex-col gap-3">
			<p>{{ $t("analytics.consent.intro") }}</p>
			<ul class="list-disc pl-5">
				<li>{{ $t("analytics.consent.collected_events") }}</li>
				<li>{{ $t("analytics.consent.collected_errors") }}</li>
				<li>{{ $t("analytics.consent.collected_recordings") }}</li>
			</ul>
			<p>{{ $t("analytics.consent.linked") }}</p>
			<i18n-t
				keypath="analytics.consent.optional"
				tag="p"
				class="text-white/60">
				<template #link>
					<router-link
						to="/imprint-tos#analytics"
						target="_blank"
						class="hover:underline text-prunplanner">
						{{ $t("analytics.consent.tos_link") }}
					</router-link>
				</template>
			</i18n-t>
		</div>
		<template #action>
			<div class="flex justify-end gap-3">
				<PButton @click="deny">
					{{ $t("analytics.consent.deny") }}
				</PButton>
				<PButton @click="grant">
					{{ $t("analytics.consent.allow") }}
				</PButton>
			</div>
		</template>
	</n-modal>
</template>
