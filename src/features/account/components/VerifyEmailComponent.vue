<script setup lang="ts">
	import { computed, ComputedRef, ref, Ref } from "vue";

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PInput, PButton } from "@/ui";

	const props = defineProps({
		verifyCode: {
			type: String,
			required: false,
			default: null,
		},
	});

	const refVerificationCode: Ref<string> = ref(props.verifyCode);
	const isVerifying: Ref<boolean> = ref(false);
	const verifyStatus: Ref<boolean | null> = ref(null);

	const canVerify: ComputedRef<boolean> = computed(
		() =>
			!!(
				refVerificationCode.value &&
				refVerificationCode.value.length > 0 &&
				refVerificationCode.value !== ""
			)
	);

	async function verifyEmail(): Promise<void> {
		isVerifying.value = true;

		await useQuery("PostUserVerifyEmail", {
			code: refVerificationCode.value,
		})
			.execute()
			.then((result: boolean) => {
				verifyStatus.value = result;
				trackEvent("user_verify_email", { status: result });
			})
			.finally(() => {
				isVerifying.value = false;
				refVerificationCode.value = "";
			});
	}
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg font-mono">
		Email Verification
	</h2>
	<div class="py-3 text-xs font-mono text-white/60">
		Please enter the verification code you received via email. Maybe check
		your spam folder.
	</div>
	<div class="flex flex-col">
		<template v-if="verifyStatus !== null">
			<div
				v-if="verifyStatus"
				class="mb-3 py-1 px-2 bg-prunplanner text-black">
				Email address verified.
			</div>
			<div v-else class="mb-3 py-1 px-2 bg-red-600 text-white">
				Invalid code or already verified.
			</div>
		</template>
		<div>
			<PInput
				v-model:value="refVerificationCode"
				placeholder="Verification Code"
				class="w-full" />
		</div>
		<div class="pt-3">
			<PButton
				:disabled="!canVerify"
				:loading="isVerifying"
				@click="verifyEmail">
				Verify Email
			</PButton>
		</div>
	</div>
</template>
