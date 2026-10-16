<script setup lang="ts">
	import { ref, type Ref, watch } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { useEmailNudge } from "@/features/account/useEmailNudge";

	// Stores
	import { useUserStore } from "@/stores/userStore";

	// Util
	import { maskEmail } from "@/features/account/account.util";

	// Components
	import EmailAddDialog from "@/features/account/components/EmailAddDialog.vue";

	// UI
	import { PButton, PNotice, useToast } from "@/ui";
	import { MailOutlineSharp } from "@vicons/material";

	/**
	 * Asks for an email (or its confirmation) above the Empire, so a
	 * forgotten password never locks anyone out of their plans
	 *
	 * @author jplacht
	 */
	const { knownPlans } = defineProps<{
		/** plans already known to exist (the empire's), until all are counted */
		knownPlans: number;
	}>();

	const userStore = useUserStore();
	const toast = useToast();

	// the number in the copy: all the user's plans, not only this empire's
	const planCount: Ref<number | null> = ref(null);
	const {
		state,
		show,
		later,
		never,
		undo,
		resend,
		trackAction,
		trackShown,
	} =
		useEmailNudge(() => planCount.value ?? knownPlans);

	const showDialog: Ref<boolean> = ref(false);
	const dialogStep: Ref<"email" | "code"> = ref("email");

	watch(
		[show, state],
		([visible]) => {
			if (!visible) return;
			trackShown();

			if (planCount.value === null)
				useQuery("GetAllPlans")
					.execute()
					.then(
						(plans) =>
							(planCount.value = Math.max(plans.length, knownPlans))
					)
					.catch(console.error);
		},
		{ immediate: true }
	);

	function openDialog(step: "email" | "code"): void {
		trackAction(step === "email" ? "add" : "enter_code");
		dialogStep.value = step;
		showDialog.value = true;
	}

	function onNever(): void {
		never();
		toast(t("account.email_nudge.never_toast"), {
			action: { label: t("account.email_nudge.buttons.undo"), onClick: undo },
			duration: 10000,
		});
	}

	function onResend(): void {
		trackAction("resend");
		resend();
	}

	// below sm: text on top, then full-width buttons at touch height
	const buttonClass = "max-sm:w-full max-sm:h-11";
</script>

<template>
	<PNotice
		v-if="show"
		:type="state === 'unconfirmed' ? 'warning' : 'info'"
		:icon="state === 'unconfirmed' ? MailOutlineSharp : undefined"
		class="mx-3 sm:mx-6 mt-3 sm:mt-6 max-sm:flex-wrap max-sm:[&>:nth-child(2)]:basis-0 max-sm:[&>:last-child]:basis-full"
		data-testid="email-nudge">
		<div class="font-bold text-ink-strong">
			{{ t(`account.email_nudge.${state}.title`) }}
		</div>
		<div class="text-sm text-muted">
			<template v-if="state === 'unconfirmed'">
				{{
					t("account.email_nudge.unconfirmed.body", {
						email: maskEmail(userStore.profile?.email ?? ""),
					})
				}}
			</template>
			<template v-else-if="planCount !== null">
				{{ t("account.email_nudge.none.body", { count: planCount }, planCount) }}
			</template>
			<template v-else>
				{{ t("account.email_nudge.none.body_plain") }}
			</template>
		</div>
		<template #action>
			<div class="flex flex-row flex-wrap gap-2 max-sm:flex-col">
				<template v-if="state === 'unconfirmed'">
					<PButton :class="buttonClass" @click="openDialog('code')">
						{{ t("account.email_nudge.buttons.enter_code") }}
					</PButton>
					<PButton type="secondary" :class="buttonClass" @click="onResend">
						{{ t("account.email_nudge.buttons.resend") }}
					</PButton>
					<PButton type="ghost" :class="buttonClass" @click="later">
						{{ t("account.email_nudge.buttons.later") }}
					</PButton>
				</template>
				<template v-else>
					<PButton :class="buttonClass" @click="openDialog('email')">
						{{ t("account.email_nudge.buttons.add") }}
					</PButton>
					<PButton type="ghost" :class="buttonClass" @click="later">
						{{ t("account.email_nudge.buttons.later") }}
					</PButton>
					<PButton
						type="ghost"
						:class="[buttonClass, 'text-muted!']"
						@click="onNever">
						{{ t("account.email_nudge.buttons.never") }}
					</PButton>
				</template>
			</div>
		</template>
	</PNotice>
	<EmailAddDialog
		v-model:show="showDialog"
		:initial-step="dialogStep"
		source="banner" />
</template>
