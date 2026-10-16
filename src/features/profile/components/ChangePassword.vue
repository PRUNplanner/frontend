<script setup lang="ts">
	import { type ComputedRef, computed, type Ref, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PForm, PFormItem, PInput, PButton, PNotice } from "@/ui";

	const refCurrentPassword: Ref<string> = ref("");
	const refNewPassword: Ref<string> = ref("");

	const isChanging: Ref<boolean> = ref(false);
	const changeStatus: Ref<boolean | null> = ref(null);

	const canChange: ComputedRef<boolean> = computed(
		() =>
			!!(
				refCurrentPassword.value &&
				refCurrentPassword.value !== "" &&
				refNewPassword.value &&
				refNewPassword.value !== "" &&
				refCurrentPassword.value.length >= 8 &&
				refNewPassword.value.length >= 8
			)
	);

	async function patchPassword(): Promise<void> {
		isChanging.value = true;

		trackEvent("account:password_change");

		await useQuery("PatchUserChangePassword", {
			old_password: refCurrentPassword.value,
			new_password: refNewPassword.value,
		})
			.execute()
			.then((result: boolean) => {
				changeStatus.value = result;
			})
			.finally(() => {
				isChanging.value = false;
				refCurrentPassword.value = "";
				refNewPassword.value = "";
			});
	}
</script>

<template>
	<details class="pt-3 border-t border-line">
		<summary class="cursor-pointer text-link hover:underline w-fit">
			{{ $t("profile.change_password.title") }}
		</summary>
		<div class="flex flex-col gap-3 pt-3">
			<div class="text-sm text-muted">
				{{ $t("profile.change_password.form.password_info") }}
			</div>
			<template v-if="changeStatus !== null">
				<div v-if="changeStatus" class="text-sm text-positive" role="status">
					{{ $t("profile.change_password.form.change_success") }}
				</div>
				<PNotice v-else type="error">
					{{ $t("profile.change_password.form.change_error") }}
				</PNotice>
			</template>
			<PForm class="!grid-cols-[10rem_minmax(0,1fr)]">
				<PFormItem
					:label="t('profile.change_password.form.current_password')">
					<PInput
						v-model:value="refCurrentPassword"
						autocomplete="current-password"
						:placeholder="t('account.components.hints.password')"
						type="password"
						class="w-full max-w-sm" />
				</PFormItem>
				<PFormItem
					:label="t('profile.change_password.form.new_password')">
					<PInput
						v-model:value="refNewPassword"
						autocomplete="new-password"
						:placeholder="t('account.components.hints.new_password')"
						type="password"
						class="w-full max-w-sm" />
				</PFormItem>
			</PForm>
			<PButton
				class="self-start"
				:type="canChange ? 'primary' : 'secondary'"
				:disabled="!canChange"
				:loading="isChanging"
				@click="patchPassword">
				{{ $t("profile.change_password.button") }}
			</PButton>
		</div>
	</details>
</template>
