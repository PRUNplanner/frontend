<script setup lang="ts">
	import { type ComputedRef, computed, type Ref, ref } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	// API
	import { useQuery } from "@/lib/query_cache/useQuery";

	// Composables
	import { trackEvent } from "@/lib/analytics/useAnalytics";

	// UI
	import { PForm, PFormItem, PInput, PButton } from "@/ui";

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
	<div>
		<div class="flex flex-row flex-wrap gap-3">
			<h2 class="grow my-auto text-white/80 font-bold text-lg">
				{{ $t("profile.change_password.title") }}
			</h2>
			<PButton
				:disabled="!canChange"
				:loading="isChanging"
				@click="patchPassword">
				{{ $t("profile.change_password.button") }}
			</PButton>
		</div>
		<div class="py-3 text-white/60">
			{{ $t("profile.change_password.form.password_info") }}
		</div>
		<template v-if="changeStatus !== null">
			<div
				v-if="changeStatus"
				class="mb-3 py-1 px-2 bg-prunplanner text-black">
				{{ $t("profile.change_password.form.change_success") }}
			</div>
			<div v-else class="mb-3 py-1 px-2 bg-red-600 text-white">
				{{ $t("profile.change_password.form.change_error") }}
			</div>
		</template>
		<PForm>
			<PFormItem
				:label="t('profile.change_password.form.current_password')">
				<PInput
					v-model:value="refCurrentPassword"
					autocomplete="current-password"
					:placeholder="t('account.components.hints.password')"
					type="password"
					class="w-full min-w-50 max-w-[50%]" />
			</PFormItem>
			<PFormItem :label="t('profile.change_password.form.new_password')">
				<PInput
					v-model:value="refNewPassword"
					autocomplete="new-password"
					:placeholder="t('account.components.hints.new_password')"
					type="password"
					class="w-full min-w-50 max-w-[50%]" />
			</PFormItem>
		</PForm>
	</div>
</template>
