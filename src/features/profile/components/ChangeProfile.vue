<script setup lang="ts">
	import { reactive, watch, Ref, ref, onMounted } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// Stores
	import { useUserStore } from "@/stores/userStore";

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
		trackEvent("user_profile_change");

		const fioApiKey = localProfile.fio_apikey?.replace(/ /g, "") ?? null;

		// detect if user has fio enabled
		const userHasFIO: boolean = !!(fioApiKey && localProfile.prun_username);

		trackEvent("user_profile_change_fio", { active: userHasFIO });

		isUpdating.value = true;

		try {
			await useQuery("PatchUserProfile", {
				fio_apikey: fioApiKey,
				prun_username: localProfile.prun_username ?? null,
				email: localProfile.email ?? null,
			}).execute();

			wasSaved.value = true;
		} catch (err) {
			console.error("Error patching user profile", err);
		} finally {
			isUpdating.value = false;
		}
	}

	async function requestVerification(): Promise<void> {
		trackEvent("user_request_email_verification");

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
			</PFormItem>
			<PFormItem :label="t('profile.change_profile.form.prun_username')">
				<PInput
					v-model:value="localProfile.prun_username"
					class="w-full min-w-50 max-w-[50%]" />
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
							<span v-else class="text-lime-600">
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
