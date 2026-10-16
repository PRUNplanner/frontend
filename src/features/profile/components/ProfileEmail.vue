<script setup lang="ts">
	import { ref, watch, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// UI
	import { PForm, PFormItem, PInput, PButton, PTag } from "@/ui";

	const userStore = useUserStore();

	const email: Ref<string | null> = ref(userStore.profile?.email ?? null);
	const isUpdating: Ref<boolean> = ref(false);
	const isThrottled: Ref<boolean> = ref(false);
	const hasFailed: Ref<boolean> = ref(false);
	const codeResendRequested: Ref<boolean> = ref(false);

	watch(
		() => userStore.profile?.email,
		(stored) => (email.value = stored ?? null)
	);

	async function patchEmail(): Promise<void> {
		if (isUpdating.value) return;

		trackEvent("account:profile_update");

		isUpdating.value = true;
		isThrottled.value = false;
		hasFailed.value = false;

		try {
			// the endpoint takes the whole profile, so FIO goes as stored
			await useQuery("PatchUserProfile", {
				fio_apikey: userStore.profile?.fio_apikey ?? null,
				prun_username: userStore.profile?.prun_username ?? null,
				email: email.value,
			}).execute();
		} catch (err) {
			console.error("Error patching user profile", err);
			isThrottled.value = (err as { status?: number }).status === 429;
			hasFailed.value = !isThrottled.value;
		} finally {
			isUpdating.value = false;
		}
	}

	async function requestVerification(): Promise<void> {
		trackEvent("account:email_verify_request");

		try {
			await useQuery("PostUserResendEmailVerification").execute();
			codeResendRequested.value = true;
		} catch (err) {
			console.error("Error resending verification code", err);
		}
	}
</script>

<template>
	<PForm class="!grid-cols-[10rem_minmax(0,1fr)]">
		<PFormItem :label="t('profile.change_profile.form.email_address')">
			<div class="w-full flex flex-row flex-wrap items-center gap-3">
				<PInput
					v-model:value="email"
					autocomplete="email"
					class="w-full max-w-sm" />
				<PTag
					v-if="userStore.profile?.email"
					:type="
						userStore.profile.is_email_verified ? 'success' : 'warning'
					"
					:value="
						userStore.profile.is_email_verified
							? t('profile.account.verified')
							: t('profile.account.not_verified')
					"
					data-testid="email-verified" />
			</div>
		</PFormItem>
	</PForm>
	<div
		v-if="userStore.profile?.email && !userStore.profile.is_email_verified"
		class="flex flex-row flex-wrap gap-3 text-sm">
		<router-link to="/verify-email" class="text-link hover:underline">
			{{ $t("profile.change_profile.buttons.verify_email") }}
		</router-link>
		<button
			v-if="!codeResendRequested"
			type="button"
			class="text-link hover:underline"
			@click="requestVerification">
			{{ $t("profile.change_profile.buttons.resend_code") }}
		</button>
		<span v-else class="text-positive">
			{{ $t("profile.change_profile.buttons.code_requested") }}
		</span>
	</div>
	<div
		v-if="isThrottled || hasFailed"
		class="text-sm text-negative"
		role="alert">
		{{
			isThrottled
				? $t("profile.change_profile.throttled")
				: $t("profile.change_profile.fio_errors.unknown")
		}}
	</div>
	<PButton
		class="self-start"
		:loading="isUpdating"
		:disabled="isUpdating"
		:type="
			(email ?? '') !== (userStore.profile?.email ?? '')
				? 'primary'
				: 'secondary'
		"
		@click="patchEmail">
		{{ $t("profile.buttons.save") }}
	</PButton>
</template>
