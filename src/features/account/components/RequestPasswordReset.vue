<script setup lang="ts">
	import { ref, Ref, computed } from "vue";

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PInput, PButton } from "@/ui";
	import { IUserRequestPasswordResetResponse } from "@/features/api/userData.types";

	const inputEmail: Ref<string | null> = ref(null);
	const isLoading: Ref<boolean> = ref(false);

	const requestResponse: Ref<IUserRequestPasswordResetResponse | null> =
		ref(null);

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
		Password Reset Request
	</h2>
	<div class="py-3 text-xs font-mono text-white/60">
		Enter the email address linked to your PRUNplanner account. If we
		recognize it, we'll send you a code to reset your password.
	</div>
	<div v-if="requestResponse" class="pb-3 text-xs font-mono text-prunplanner">
		{{ requestResponse.detail }}.
	</div>
	<div>
		<PInput
			v-model:value="inputEmail"
			placeholder="Email Address"
			class="w-full" />
	</div>
	<div class="pt-3">
		<PButton
			:disabled="!canRequest"
			:loading="isLoading"
			@click="requestReset">
			Send Request
		</PButton>
	</div>
</template>
