<script setup lang="ts">
	import { computed, nextTick, ref, type Ref, useTemplateRef, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { useEmailNudge } from "@/features/account/useEmailNudge";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Util
	import { isEmailAddress, maskEmail } from "@/features/account/account.util";

	// Types & Interfaces
	import type { EmailDialogStep } from "@/features/account/useEmailNudge.types";

	// UI
	import { PButton, PForm, PFormItem, PInput, PModal, useToast } from "@/ui";

	/**
	 * Adds and confirms an email in one dialog: address, then the code from
	 * the email, then done. Opens at the address or straight at the code.
	 *
	 * @author jplacht
	 */
	const show = defineModel<boolean>("show", { required: true });

	const { initialStep = "email", source } = defineProps<{
		initialStep?: "email" | "code";
		source: "banner" | "profile";
	}>();

	const userStore = useUserStore();
	const toast = useToast();
	const { resend } = useEmailNudge(0);

	const step: Ref<EmailDialogStep> = ref(initialStep);
	const email: Ref<string | null> = ref(null);
	const code: Ref<string | null> = ref(null);
	const emailError: Ref<string | null> = ref(null);
	const codeError: Ref<string | null> = ref(null);
	const isBusy: Ref<boolean> = ref(false);
	const codeInput = useTemplateRef<{ focus: () => void }>("codeInput");

	const masked = computed(() => maskEmail(userStore.profile?.email ?? ""));
	const emailValid = computed(() => isEmailAddress(email.value?.trim() ?? ""));
	const codeValid = computed(() => (code.value ?? "").length === 8);

	watch(
		show,
		(open) => {
			if (!open) return;
			step.value = initialStep;
			email.value = userStore.profile?.email ?? null;
			code.value = null;
			emailError.value = null;
			codeError.value = null;
		},
		{ immediate: true }
	);

	// codes are upper case, 8 characters
	watch(code, (value) => {
		const clean = (value ?? "").replace(/\s/g, "").toUpperCase().slice(0, 8);
		if (clean !== value && value !== null) code.value = clean;
		codeError.value = null;
	});
	watch(email, () => (emailError.value = null));
	// after the email step, the next keystrokes are the code
	watch(step, (current, previous) => {
		if (current === "code" && previous === "email")
			nextTick(() => codeInput.value?.focus());
	});

	async function saveEmail(): Promise<void> {
		if (isBusy.value || !emailValid.value) return;
		const value = email.value!.trim();

		// the address is already on the account, its code is on the way
		if (value === userStore.profile?.email) {
			step.value = "code";
			return;
		}

		isBusy.value = true;
		try {
			await useQuery("PatchUserProfile", { email: value }).execute();
			trackEvent("account:email_add", { is_success: true });
			step.value = "code";
		} catch (err) {
			const { status, responseData } = err as {
				status?: number;
				responseData?: { email?: unknown };
			};
			const field = Array.isArray(responseData?.email)
				? responseData.email[0]
				: undefined;
			const reason =
				status === 429
					? "throttled"
					: field === "email_taken"
						? "email_taken"
						: field
							? "invalid_email"
							: "unknown";
			emailError.value = t(`account.email_dialog.errors.${reason}`);
			trackEvent("account:email_add", { is_success: false, reason });
		} finally {
			isBusy.value = false;
		}
	}

	async function confirmCode(): Promise<void> {
		if (isBusy.value || !codeValid.value) return;

		isBusy.value = true;
		const result = await useQuery("PostUserVerifyEmail", {
			code: code.value!,
		}).execute();
		isBusy.value = false;

		const ok = result === "verified" || result === "already_verified";
		trackEvent("account:email_verify", {
			is_success: ok,
			source,
			...(ok ? {} : { reason: result }),
		});

		if (!ok) {
			codeError.value = t(
				`account.email_dialog.errors.${
					["invalid", "expired", "no_code", "throttled"].includes(result)
						? result
						: "unknown"
				}`
			);
			return;
		}

		step.value = "done";
		if (source === "banner")
			toast(t("account.email_dialog.confirmed_toast", { email: masked.value }));
	}

	async function sendNewCode(): Promise<void> {
		if (await resend()) {
			code.value = null;
			codeError.value = null;
		}
	}

	const title = computed(() => t(`account.email_dialog.title.${step.value}`));
</script>

<template>
	<PModal v-model:show="show" :width="440" :title="title">
		<div v-if="step === 'email'" class="flex flex-col gap-3">
			<PForm>
				<PFormItem
					:label="t('account.email_dialog.email_label')"
					:error="emailError ?? undefined">
					<PInput
						v-model:value="email"
						type="email"
						autocomplete="email"
						class="w-full"
						:placeholder="t('account.email_dialog.email_placeholder')"
						@keydown.enter.prevent="saveEmail" />
				</PFormItem>
			</PForm>
			<div class="text-sm text-muted">
				{{ t("account.email_dialog.email_info") }}
			</div>
			<div class="text-sm text-muted">
				{{ t("account.email_dialog.email_code_info") }}
			</div>
		</div>

		<div v-else-if="step === 'code'" class="flex flex-col gap-3">
			<div class="text-sm text-muted">
				{{ t("account.email_dialog.code_info", { email: masked }) }}
			</div>
			<PForm>
				<PFormItem
					:label="t('account.email_dialog.code_label')"
					:error="codeError ?? undefined">
					<PInput
						ref="codeInput"
						v-model:value="code"
						autocomplete="one-time-code"
						class="w-full font-mono tracking-widest"
						:placeholder="t('account.email_dialog.code_placeholder')"
						@keydown.enter.prevent="confirmCode" />
				</PFormItem>
			</PForm>
			<div class="text-sm text-muted">
				{{ t("account.email_dialog.no_code") }}
				<button
					type="button"
					class="touch-target text-link hover:underline"
					data-testid="email-dialog-resend"
					@click="sendNewCode">
					{{ t("account.email_dialog.buttons.resend") }}
				</button>
			</div>
		</div>

		<div v-else class="flex flex-col gap-1">
			<div class="font-bold text-ink-strong">
				{{ t("account.email_dialog.done_title") }}
			</div>
			<div class="text-sm text-muted">
				{{ t("account.email_dialog.done_info", { email: masked }) }}
			</div>
		</div>

		<template #action>
			<div
				v-if="step === 'email'"
				class="flex flex-row flex-wrap justify-end gap-2">
				<PButton type="secondary" @click="show = false">
					{{ t("account.email_dialog.buttons.cancel") }}
				</PButton>
				<PButton
					:loading="isBusy"
					:disabled="!emailValid || isBusy"
					data-testid="email-dialog-save"
					@click="saveEmail">
					{{ t("account.email_dialog.buttons.save") }}
				</PButton>
			</div>
			<div
				v-else-if="step === 'code'"
				class="flex flex-row flex-wrap justify-between gap-2">
				<PButton type="ghost" @click="step = 'email'">
					{{ t("account.email_dialog.buttons.change_email") }}
				</PButton>
				<div class="flex flex-row gap-2">
					<PButton type="secondary" @click="show = false">
						{{ t("account.email_dialog.buttons.later") }}
					</PButton>
					<PButton
						:loading="isBusy"
						:disabled="!codeValid || isBusy"
						data-testid="email-dialog-confirm"
						@click="confirmCode">
						{{ t("account.email_dialog.buttons.confirm") }}
					</PButton>
				</div>
			</div>
			<div v-else class="flex flex-row justify-end">
				<PButton @click="show = false">
					{{ t("account.email_dialog.buttons.done") }}
				</PButton>
			</div>
		</template>
	</PModal>
</template>
