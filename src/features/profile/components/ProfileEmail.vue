<script setup lang="ts">
	import { computed, ref, watch, type Ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { isApiError } from "@/lib/apiError";

	// Composables
	import { useEmailNudge } from "@/features/account/useEmailNudge";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Components
	import EmailAddDialog from "@/features/account/components/EmailAddDialog.vue";

	// UI
	import { PForm, PFormItem, PInput, PButton, PNotice, PTag } from "@/ui";
	import { reportError } from "@/lib/analytics/useAnalytics";

	const userStore = useUserStore();
	const { state, resend } = useEmailNudge(0);

	const email: Ref<string | null> = ref(userStore.profile?.email ?? null);
	const isUpdating: Ref<boolean> = ref(false);
	const isThrottled: Ref<boolean> = ref(false);
	const hasFailed: Ref<boolean> = ref(false);
	const emailError: Ref<string | null> = ref(null);
	const password: Ref<string | null> = ref(null);
	const passwordError: Ref<string | null> = ref(null);
	const codeSent: Ref<boolean> = ref(false);
	const showDialog: Ref<boolean> = ref(false);

	watch(
		() => userStore.profile?.email,
		(stored) => (email.value = stored ?? null)
	);
	watch(email, () => (emailError.value = null));
	watch(password, () => (passwordError.value = null));

	// adding, changing and clearing the email all need the current password
	const needsPassword = computed(
		() => (email.value ?? "") !== (userStore.profile?.email ?? "")
	);

	const recovery = computed(
		() =>
			(
				({
					none: { type: "secondary", key: "not_set_up" },
					unconfirmed: { type: "warning", key: "waiting" },
					ready: { type: "success", key: "ready" },
				}) as const
			)[state.value]
	);

	async function patchEmail(): Promise<void> {
		// unchanged: nothing to save
		if (isUpdating.value || !needsPassword.value || !password.value) return;

		// cleared before the request, so it is gone after a save or a failure
		const currentPassword = password.value;
		password.value = null;
		isUpdating.value = true;
		isThrottled.value = false;
		hasFailed.value = false;
		codeSent.value = false;

		try {
			await useQuery("PatchUserProfile", {
				email: email.value,
				current_password: currentPassword,
			}).execute();
			codeSent.value = !!email.value;
		} catch (err) {
			reportError(err);
			const data = isApiError(err) ? err.responseData : undefined;
			isThrottled.value = isApiError(err) && err.status === 429;
			// DRF field errors: { email | current_password: [code or message] }
			const first = (key: string): unknown => {
				const messages =
					data && typeof data === "object" && key in data
						? (data as Record<string, unknown>)[key]
						: undefined;
				return Array.isArray(messages) ? messages[0] : undefined;
			};
			const field = first("email");
			const passwordCode = first("current_password");
			// the password field is hidden again (e.g. the profile arrived
			// meanwhile): a password error there would show nowhere
			if (passwordCode !== undefined && needsPassword.value)
				passwordError.value = t(
					passwordCode === "password_required"
						? "account.email_dialog.errors.password_required"
						: "account.email_dialog.errors.password_invalid"
				);
			else if (typeof field === "string")
				emailError.value = t(
					"account.email_dialog.errors.invalid_email"
				);
			else hasFailed.value = !isThrottled.value;
		} finally {
			isUpdating.value = false;
		}
	}

	async function sendNewCode(): Promise<void> {
		if (await resend()) showDialog.value = true;
	}
</script>

<template>
	<PForm class="!grid-cols-[10rem_minmax(0,1fr)]">
		<PFormItem
			:label="t('profile.change_profile.form.email_address')"
			:error="emailError ?? undefined">
			<PInput
				v-model:value="email"
				type="email"
				autocomplete="email"
				class="w-full max-w-sm" />
		</PFormItem>
		<PFormItem
			v-if="needsPassword"
			:label="t('account.email_dialog.password_label')"
			:error="passwordError ?? undefined">
			<PInput
				v-model:value="password"
				type="password"
				autocomplete="current-password"
				class="w-full max-w-sm"
				@keydown.enter.prevent="patchEmail" />
		</PFormItem>
		<PFormItem :label="t('profile.change_profile.recovery.label')">
			<div
				class="w-full flex flex-row flex-wrap items-center gap-x-3 gap-y-4 py-1 whitespace-normal">
				<PTag
					:type="recovery.type"
					:value="
						t(`profile.change_profile.recovery.${recovery.key}`)
					"
					data-testid="email-recovery" />
				<template v-if="state === 'unconfirmed'">
					<PButton
						data-testid="email-enter-code"
						@click="showDialog = true">
						{{ t("profile.change_profile.buttons.enter_code") }}
					</PButton>
					<PButton
						type="secondary"
						data-testid="email-resend"
						@click="sendNewCode">
						{{ t("profile.change_profile.buttons.resend_code") }}
					</PButton>
				</template>
				<span v-else class="text-sm text-muted">
					{{
						t(
							`profile.change_profile.recovery.${recovery.key}_info`
						)
					}}
				</span>
			</div>
		</PFormItem>
	</PForm>
	<div
		v-if="isThrottled || hasFailed"
		class="text-sm text-negative"
		role="alert">
		{{
			isThrottled
				? t("profile.change_profile.throttled")
				: t("profile.change_profile.fio_errors.unknown")
		}}
	</div>
	<PNotice v-if="codeSent" data-testid="email-code-sent">
		{{ t("profile.change_profile.code_sent_notice") }}
	</PNotice>
	<PButton
		class="self-start"
		:loading="isUpdating"
		:disabled="isUpdating || !needsPassword || !password"
		:type="needsPassword ? 'primary' : 'secondary'"
		@click="patchEmail">
		{{ t("profile.buttons.save") }}
	</PButton>
	<EmailAddDialog
		v-model:show="showDialog"
		initial-step="code"
		source="profile" />
</template>
