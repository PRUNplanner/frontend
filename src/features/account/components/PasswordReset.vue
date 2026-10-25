<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

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
		UserPasswordResetPayloadSchema,
		type UserResponseDetail,
	} from "@/features/api/schemas/user.schemas";

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
	const isThrottled: Ref<boolean> = ref(false);

	const requestResponse: Ref<UserResponseDetail | null> = ref(null);

	// the request's own schema, so the button never sends an invalid email
	const canSend = computed(
		() =>
			!!inputCode.value &&
			(inputPassword.value?.length ?? 0) >= 8 &&
			UserPasswordResetPayloadSchema.safeParse({
				email: inputEmail.value,
				code: inputCode.value,
				new_password: inputPassword.value,
			}).success
	);

	async function requestReset() {
		if (!canSend.value) return;

		isLoading.value = true;
		requestResponse.value = null;
		isThrottled.value = false;

		trackEvent("account:password_reset");

		try {
			requestResponse.value = await useQuery("PostUserPasswordReset", {
				email: inputEmail.value!,
				code: inputCode.value!,
				new_password: inputPassword.value!,
			}).execute();
		} catch {
			// the query only rethrows a 429
			isThrottled.value = true;
		} finally {
			isLoading.value = false;
		}
	}
</script>

<template>
	<form class="flex flex-col gap-5" @submit.prevent="requestReset">
		<h1 :class="landingHeading">
			{{ $t("account.components.password_reset.title") }}
		</h1>
		<p class="m-0 text-white/78">
			{{ $t("account.components.password_reset.info") }}
		</p>
		<p v-if="requestResponse" class="m-0 text-prunplanner" role="status">
			{{ requestResponse.detail }}
		</p>
		<PNotice v-if="isThrottled" type="error">
			{{ $t("account.components.password_reset.throttled") }}
		</PNotice>
		<div :class="landingField">
			<PFormItem
				:label="t('account.components.password_reset.form.email')">
				<PInput
					v-model:value="inputEmail"
					autocomplete="email"
					:placeholder="t('account.components.hints.email')"
					:class="landingInput" />
			</PFormItem>
		</div>
		<div :class="landingField">
			<PFormItem :label="t('account.components.password_reset.form.code')">
				<PInput
					v-model:value="inputCode"
					autocomplete="one-time-code"
					:placeholder="t('account.components.hints.code')"
					:class="landingInput" />
			</PFormItem>
		</div>
		<div :class="landingField">
			<PFormItem
				:label="t('account.components.password_reset.form.password')">
				<PInput
					v-model:value="inputPassword"
					autocomplete="new-password"
					:placeholder="t('account.components.hints.new_password')"
					type="password"
					:class="landingInput" />
				<template #info>
					{{
						$t(
							"account.components.password_reset.form.password_info"
						)
					}}
				</template>
			</PFormItem>
		</div>
		<button
			type="submit"
			:disabled="!canSend || isLoading"
			:aria-busy="isLoading"
			:class="[landingPrimaryButton, 'w-full']">
			<PSpin v-if="isLoading" color="muted" />
			{{ $t("account.components.password_reset.buttons.send") }}
		</button>
	</form>
</template>
