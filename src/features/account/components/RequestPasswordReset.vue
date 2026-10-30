<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { isApiError } from "@/lib/apiError";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI (by path: a public page, see AGENTS.md)
	import PFormItem from "@/ui/components/PFormItem.vue";
	import PInput from "@/ui/components/PInput.vue";
	import PNotice from "@/ui/components/PNotice.vue";
	import PSpin from "@/ui/components/PSpin.vue";
	import {
		landingField,
		landingHeading,
		landingInput,
		landingPrimaryButton,
	} from "@/features/homepage/homepage.constants";
	import {
		UserRequestPasswordResetPayloadSchema,
		type UserResponseDetail,
	} from "@/features/api/schemas/user.schemas";

	const inputEmail: Ref<string | null> = ref(null);
	const isLoading: Ref<boolean> = ref(false);
	const failure: Ref<"throttled" | "error" | null> = ref(null);

	const requestResponse: Ref<UserResponseDetail | null> = ref(null);

	// the request's own schema, so the button never sends an invalid email
	const canRequest = computed(
		() =>
			UserRequestPasswordResetPayloadSchema.safeParse({
				email: inputEmail.value,
			}).success
	);

	async function requestReset() {
		if (!canRequest.value || isLoading.value) return;

		isLoading.value = true;
		requestResponse.value = null;
		failure.value = null;

		trackEvent("account:password_reset_request");

		try {
			requestResponse.value = await useQuery(
				"PostUserRequestPasswordReset",
				{ email: inputEmail.value! }
			).execute();
		} catch (err) {
			failure.value =
				isApiError(err) && err.status === 429 ? "throttled" : "error";
		} finally {
			isLoading.value = false;
		}
	}
</script>

<template>
	<form class="flex flex-col gap-5" @submit.prevent="requestReset">
		<h1 :class="landingHeading">
			{{ $t("account.components.request_password_reset.title") }}
		</h1>
		<p class="m-0 text-white/78">
			{{ $t("account.components.request_password_reset.info") }}
		</p>
		<p v-if="requestResponse" class="m-0 text-prunplanner" role="status">
			{{ requestResponse.detail }}.
		</p>
		<PNotice v-if="failure" type="error">
			{{
				failure === "throttled"
					? $t("account.components.request_password_reset.throttled")
					: $t("account.components.request_password_reset.error")
			}}
		</PNotice>
		<div :class="landingField">
			<PFormItem
				:label="
					t(
						'account.components.request_password_reset.form.email_placeholder'
					)
				">
				<PInput
					v-model:value="inputEmail"
					autocomplete="email"
					:placeholder="t('account.components.hints.email')"
					:class="landingInput" />
			</PFormItem>
		</div>
		<button
			type="submit"
			:disabled="!canRequest || isLoading"
			:aria-busy="isLoading"
			:class="[landingPrimaryButton, 'w-full']">
			<PSpin v-if="isLoading" color="muted" />
			{{ $t("account.components.request_password_reset.buttons.send") }}
		</button>
	</form>
</template>
