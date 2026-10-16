<script setup lang="ts">
	import { computed, type ComputedRef, ref, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PInput, PButton, PNotice } from "@/ui";

	const props = defineProps({
		verifyCode: {
			type: String,
			required: false,
			default: null,
		},
	});

	const refVerificationCode: Ref<string> = ref(props.verifyCode);
	const isVerifying: Ref<boolean> = ref(false);
	// "verified", "already_verified", or the reason it failed
	const verifyResult: Ref<string | null> = ref(null);

	const canVerify: ComputedRef<boolean> = computed(
		() =>
			!!(
				refVerificationCode.value &&
				refVerificationCode.value.length > 0 &&
				refVerificationCode.value !== ""
			)
	);

	const isSuccess: ComputedRef<boolean> = computed(
		() =>
			verifyResult.value === "verified" ||
			verifyResult.value === "already_verified"
	);

	const errorKey: ComputedRef<string> = computed(() =>
		["invalid", "expired", "no_code", "throttled"].includes(
			verifyResult.value ?? ""
		)
			? verifyResult.value!
			: "unknown"
	);

	async function verifyEmail(): Promise<void> {
		isVerifying.value = true;

		// the query refreshes the profile once the account is confirmed
		await useQuery("PostUserVerifyEmail", {
			code: refVerificationCode.value.trim().toUpperCase(),
		})
			.execute()
			.then((result: string) => {
				verifyResult.value = result;
				trackEvent("account:email_verify", {
					is_success: isSuccess.value,
					source: "link",
					...(isSuccess.value ? {} : { reason: result }),
				});
			})
			.finally(() => {
				isVerifying.value = false;
				refVerificationCode.value = "";
			});
	}
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg font-mono">
		{{ $t("account.components.verify_email.title") }}
	</h2>
	<div class="py-3 text-xs font-mono text-muted">
		{{ $t("account.components.verify_email.info") }}
	</div>
	<div class="flex flex-col">
		<template v-if="verifyResult !== null">
			<div
				v-if="isSuccess"
				class="mb-3 py-1 px-2 bg-prunplanner text-black"
				data-testid="verify-ok">
				{{
					verifyResult === "already_verified"
						? $t("account.components.verify_email.result.already_verified")
						: $t("account.components.verify_email.result.ok")
				}}
				<router-link to="/empire" class="underline">
					{{ $t("account.components.verify_email.result.back") }}
				</router-link>
			</div>
			<PNotice v-else type="error" class="mb-3">
				{{ $t(`account.email_dialog.errors.${errorKey}`) }}
			</PNotice>
		</template>
		<div>
			<PInput
				v-model:value="refVerificationCode"
				:aria-label="
					$t('account.components.verify_email.form.code_placeholder')
				"
				:placeholder="
					t('account.components.verify_email.form.code_placeholder')
				"
				autocomplete="one-time-code"
				class="w-full" />
		</div>
		<div class="pt-3">
			<PButton
				:disabled="!canVerify"
				:loading="isVerifying"
				@click="verifyEmail">
				{{ $t("account.components.verify_email.buttons.send") }}
			</PButton>
		</div>
	</div>
</template>
