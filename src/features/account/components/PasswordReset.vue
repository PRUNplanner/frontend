<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PForm, PFormItem, PInput, PButton } from "@/ui";
	import type { UserResponseDetail } from "@/features/api/schemas/user.schemas";

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

	const requestResponse: Ref<UserResponseDetail | null> = ref(null);

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

		trackEvent("account:password_reset");

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
		{{ $t("account.components.password_reset.title") }}
	</h2>
	<div class="py-3 text-xs font-mono text-white/60">
		{{ $t("account.components.password_reset.info") }}
	</div>
	<div v-if="requestResponse" class="pb-3 text-xs font-mono text-prunplanner">
		{{ requestResponse.detail }}
	</div>
	<div>
		<PForm>
			<PFormItem
				:label="t('account.components.password_reset.form.email')">
				<PInput
					v-model:value="inputEmail"
					autocomplete="email"
					:placeholder="t('account.components.hints.email')"
					class="w-full" />
			</PFormItem>
			<PFormItem
				:label="t('account.components.password_reset.form.code')">
				<PInput
					v-model:value="inputCode"
					autocomplete="one-time-code"
					:placeholder="t('account.components.hints.code')"
					class="w-full" />
			</PFormItem>
			<PFormItem
				:label="t('account.components.password_reset.form.password')">
				<PInput
					v-model:value="inputPassword"
					autocomplete="new-password"
					:placeholder="t('account.components.hints.new_password')"
					type="password"
					class="w-full" />
				<template #info>
					{{
						$t(
							"account.components.password_reset.form.password_info"
						)
					}}
				</template>
			</PFormItem>
			<PFormItem label="">
				<PButton
					:disabled="!canSend"
					:loading="isLoading"
					@click="requestReset">
					{{ $t("account.components.password_reset.buttons.send") }}
				</PButton>
			</PFormItem>
		</PForm>
	</div>
</template>
