<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PInput, PButton } from "@/ui";
	import type { UserResponseDetail } from "@/features/api/schemas/user.schemas";

	const inputEmail: Ref<string | null> = ref(null);
	const isLoading: Ref<boolean> = ref(false);

	const requestResponse: Ref<UserResponseDetail | null> = ref(null);

	const canRequest = computed(
		() =>
			!!(
				inputEmail.value &&
				inputEmail.value !== "" &&
				inputEmail.value.includes("@")
			)
	);

	async function requestReset() {
		if (!canRequest.value) return;

		isLoading.value = true;
		requestResponse.value = null;

		trackEvent("user_request_password_reset");

		await useQuery("PostUserRequestPasswordReset", {
			email: inputEmail.value!,
		})
			.execute()
			.then((result) => (requestResponse.value = result))
			.finally(() => (isLoading.value = false));
	}
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg font-mono">
		{{ $t("account.components.request_password_reset.title") }}
	</h2>
	<div class="py-3 text-xs font-mono text-white/60">
		{{ $t("account.components.request_password_reset.info") }}
	</div>
	<div v-if="requestResponse" class="pb-3 text-xs font-mono text-prunplanner">
		{{ requestResponse.detail }}.
	</div>
	<div>
		<PInput
			v-model:value="inputEmail"
			:aria-label="
				$t(
					'account.components.request_password_reset.form.email_placeholder'
				)
			"
			autocomplete="email"
			:placeholder="
				t(
					'account.components.request_password_reset.form.email_placeholder'
				)
			"
			class="w-full" />
	</div>
	<div class="pt-3">
		<PButton
			:disabled="!canRequest"
			:loading="isLoading"
			@click="requestReset">
			{{ $t("account.components.request_password_reset.buttons.send") }}
		</PButton>
	</div>
</template>
