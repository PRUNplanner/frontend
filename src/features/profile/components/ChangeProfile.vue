<script setup lang="ts">
	import { computed, reactive, watch, type Ref, ref, onMounted } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Util
	import { relativeFromDate } from "@/util/date";

	// UI
	import {
		PForm,
		PFormItem,
		PFormSeperator,
		PInput,
		PButton,
		PCheckbox,
	} from "@/ui";

	const userStore = useUserStore();

	// local profile copy
	const localProfile = reactive({ ...userStore.profile });
	const isUpdating: Ref<boolean> = ref(false);
	const wasSaved: Ref<boolean> = ref(true);
	const codeResendRequested: Ref<boolean> = ref(false);

	// backend error codes per FIO field, shown under the field
	type FIOField = "fio_apikey" | "prun_username";
	const KNOWN_ERRORS = [
		"fio_required",
		"fio_invalid_key",
		"fio_username_mismatch",
	];
	const fioErrors: Ref<Partial<Record<FIOField, string>>> = ref({});
	const fioConnected: Ref<boolean> = ref(false);
	// until the first refresh replaces it with the real status
	const showConnected = computed(
		() => fioConnected.value && userStore.fioStatus === "syncing"
	);

	const fioStatusText = computed(() =>
		t(`profile.change_profile.fio_status.${userStore.fioStatus}`, {
			time: relativeFromDate(
				userStore.profile?.fio_last_refreshed_at
					? new Date(userStore.profile.fio_last_refreshed_at)
					: undefined
			),
		})
	);

	function errorText(code: string): string {
		return t(
			`profile.change_profile.fio_errors.${KNOWN_ERRORS.includes(code) ? code : "unknown"}`
		);
	}

	watch(
		() => userStore.profile,
		(newProfile) => Object.assign(localProfile, newProfile)
	);

	watch(
		() => localProfile,
		() => (wasSaved.value = false),
		{ deep: true }
	);

	onMounted(() =>
		userStore.performGetProfile().then(() => (wasSaved.value = true))
	);

	async function patchProfile(): Promise<void> {
		trackEvent("account:profile_update");

		const fioApiKey = localProfile.fio_apikey?.replace(/ /g, "") ?? null;

		// detect if user has fio enabled
		const userHasFIO: boolean = !!(fioApiKey && localProfile.prun_username);
		const userHadFIO: boolean = !!(
			userStore.profile?.fio_apikey && userStore.profile?.prun_username
		);

		trackEvent("account:fio_update", { is_active: userHasFIO });
		const fioChanged: boolean =
			fioApiKey !== (userStore.profile?.fio_apikey ?? null) ||
			(localProfile.prun_username ?? null) !==
				(userStore.profile?.prun_username ?? null);

		isUpdating.value = true;
		fioErrors.value = {};
		fioConnected.value = false;

		try {
			await useQuery("PatchUserProfile", {
				fio_apikey: fioApiKey,
				prun_username: localProfile.prun_username ?? null,
				email: localProfile.email ?? null,
			}).execute();

			if (userHasFIO && !userHadFIO) trackEvent("account:fio_link");
			fioConnected.value = userHasFIO && fioChanged;

			wasSaved.value = true;
		} catch (err) {
			console.error("Error patching user profile", err);
			// DRF field errors: { field: [code] }
			const data = (err as { responseData?: Record<string, unknown> })
				.responseData;
			for (const field of ["fio_apikey", "prun_username"] as const) {
				const messages = data?.[field];
				if (Array.isArray(messages) && typeof messages[0] === "string")
					fioErrors.value[field] = messages[0];
			}
			const reason = fioErrors.value.fio_apikey ?? fioErrors.value.prun_username;
			if (reason) trackEvent("account:fio_link_failed", { reason });
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
	<div>
		<div class="flex flex-row flex-wrap gap-3">
			<h2 class="grow my-auto text-white/80 font-bold text-lg">
				{{ $t("profile.change_profile.title") }}
			</h2>
			<PButton
				:loading="isUpdating"
				:type="wasSaved ? 'primary' : 'error'"
				@click="patchProfile">
				{{ $t("profile.change_profile.buttons.update_profile") }}
			</PButton>
		</div>
		<PForm v-if="localProfile">
			<PFormSeperator>
				<div class="py-3 text-white/60">
					{{ $t("profile.change_profile.fio_info") }}
				</div>
			</PFormSeperator>
			<PFormItem :label="t('profile.change_profile.form.fio_apikey')">
				<PInput
					v-model:value="localProfile.fio_apikey"
					class="w-full min-w-50 max-w-[50%]" />
				<template v-if="fioErrors.fio_apikey" #info>
					<span class="text-negative" role="alert">
						{{ errorText(fioErrors.fio_apikey) }}
					</span>
				</template>
			</PFormItem>
			<PFormItem :label="t('profile.change_profile.form.prun_username')">
				<PInput
					v-model:value="localProfile.prun_username"
					class="w-full min-w-50 max-w-[50%]" />
				<template v-if="fioErrors.prun_username" #info>
					<span class="text-negative" role="alert">
						{{ errorText(fioErrors.prun_username) }}
					</span>
				</template>
			</PFormItem>
			<PFormItem :label="t('profile.change_profile.form.fio_status')">
				<div
					class="text-sm"
					:class="{
						'text-positive': showConnected,
						'text-negative':
							!showConnected &&
							userStore.fioStatus === 'invalid_credentials',
					}"
					role="status"
					data-testid="fio-status">
					{{
						showConnected
							? t("profile.change_profile.fio_connected")
							: fioStatusText
					}}
				</div>
			</PFormItem>
			<PFormSeperator>
				<div class="py-3 text-white/60">
					{{ $t("profile.change_profile.form.email_info") }}
				</div>
			</PFormSeperator>
			<PFormItem :label="t('profile.change_profile.form.email_address')">
				<PInput
					v-model:value="localProfile.email"
					class="w-full min-w-50 max-w-[50%]" />
			</PFormItem>
			<PFormItem :label="t('profile.change_profile.form.email_verified')">
				<div class="w-full flex flex-row flex-wrap gap-3">
					<PCheckbox
						v-model:checked="localProfile.is_email_verified"
						disabled
						class="w-full min-w-50 max-w-[50%] child:my-auto" />

					<div
						v-if="!localProfile.is_email_verified"
						class="flex flex-row flex-wrap gap-3">
						<div>
							<router-link
								to="/verify-email"
								class="text-link-primary hover:cursor-pointer hover:underline">
								{{
									$t(
										"profile.change_profile.buttons.verify_email"
									)
								}}
							</router-link>
						</div>
						<div>
							<span
								v-if="!codeResendRequested"
								class="text-link-primary hover:cursor-pointer hover:underline"
								@click="requestVerification">
								{{
									$t(
										"profile.change_profile.buttons.resend_code"
									)
								}}
							</span>
							<span v-else class="text-positive">
								{{
									$t(
										"profile.change_profile.buttons.code_requested"
									)
								}}
							</span>
						</div>
					</div>
				</div>
			</PFormItem>
		</PForm>
	</div>
</template>
