<script setup lang="ts">
	import { ref, Ref, computed } from "vue";

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PForm, PFormItem, PInput, PButton } from "@/ui";
	import { IUserPasswordResetResponse } from "@/features/api/userData.types";

	const props = defineProps({
		resetCode: {
			type: String,
			required: false,
			default: null,
		},
	});

	const inputEmail: Ref<string | null> = ref(null);
	const inputCode: Ref<string | null> = ref(props.resetCode);
	const inputPassword: Ref<string | null> = ref(null);
	const isLoading: Ref<boolean> = ref(false);

	const requestResponse: Ref<IUserPasswordResetResponse | null> = ref(null);

	const canSend = computed(
		() =>
			!!(
				inputEmail.value &&
				inputEmail.value != "" &&
				inputCode.value &&
				inputCode.value !== "" &&
				inputPassword.value &&
				inputPassword.value.length >= 8
			)
	);

	async function requestReset() {
		if (!canSend.value) return;

		isLoading.value = true;
		requestResponse.value = null;

		trackEvent("user_password_reset");

		await useQuery("PostUserPasswordReset", {
			email: inputEmail.value!,
			code: inputCode.value!,
			new_password: inputPassword.value!,
		})
			.execute()
			.then((result) => (requestResponse.value = result))
			.finally(() => (isLoading.value = false));
	}
</script>

<template>
	<h2 class="text-white/80 font-bold text-lg font-mono">
		Reset your Password
	</h2>
	<div class="py-3 text-xs font-mono text-white/60">
		Please enter the code sent to your email, along with your new password.
	</div>
	<div v-if="requestResponse" class="pb-3 text-xs font-mono text-prunplanner">
		{{ requestResponse.detail }}
	</div>
	<div>
		<PForm>
			<PFormItem label="Email">
				<PInput v-model:value="inputEmail" class="w-full" />
			</PFormItem>
			<PFormItem label="Code">
				<PInput v-model:value="inputCode" class="w-full" />
			</PFormItem>
			<PFormItem label="Password">
				<PInput
					v-model:value="inputPassword"
					type="password"
					class="w-full" />
				<template #info> Must be at least 8 characters long. </template>
			</PFormItem>
			<PFormItem label="">
				<PButton
					:disabled="!canSend"
					:loading="isLoading"
					@click="requestReset">
					Send Request
				</PButton>
			</PFormItem>
		</PForm>
	</div>
</template>
