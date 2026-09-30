<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { useUserStore } from "@/stores/userStore";

	const userStore = useUserStore();
	import router from "@/router";

	// UI
	import { PForm, PFormItem, PFormSeperator, PInput, PButton } from "@/ui";

	const inputUsername: Ref<string | null> = ref(null);
	const inputPassword: Ref<string | null> = ref(null);
	const isLoggingIn: Ref<boolean> = ref(false);
	const hasError: Ref<boolean> = ref(false);

	const canLogin = computed(() => {
		if (inputUsername.value === null || inputUsername.value.length < 3)
			return false;
		if (inputPassword.value === null || inputPassword.value.length < 8)
			return false;

		return true;
	});

	async function handleLogin(): Promise<void> {
		if (!canLogin.value || isLoggingIn.value) return;

		isLoggingIn.value = true;
		hasError.value = false;

		const result = await userStore.performLogin(
			inputUsername.value!,
			inputPassword.value!
		);

		isLoggingIn.value = false;

		if (!result) hasError.value = true;
		else {
			let urlParams = new URLSearchParams(window.location.search);

			// successfull login should redirect back to origin, if present
			if (urlParams.has("redirectTo") && urlParams.get("redirectTo")) {
				router.push({ path: urlParams.get("redirectTo")! });
			} else if (router.currentRoute.value.name !== "shared-plan") {
				// a shared plan stays open, to be cloned right away
				router.push({ path: "/empire" });
			}
		}
	}
</script>

<template>
	<div class="mx-auto max-w-100">
		<div class="text-xl text-white font-bold font-mono pb-3">
			{{ $t("account.components.login.title") }}
		</div>
		<div v-if="hasError" class="pb-3 text-red-600">
			{{ $t("account.components.login.error") }}
		</div>
		<PForm as-form @submit="handleLogin">
			<PFormSeperator>
				<div class="font-mono text-xs text-white/60 pb-3">
					<i18n-t keypath="account.components.login.tos" tag="p">
						<template #tos_link>
							<router-link
								to="/imprint-tos"
								class="hover:cursor-pointer underline">
								{{ $t("account.components.login.tos_link") }}
							</router-link>
						</template>
					</i18n-t>
				</div>
			</PFormSeperator>
			<PFormItem :label="t('account.components.login.form.username')">
				<PInput
					v-model:value="inputUsername"
					autocomplete="username"
					:placeholder="t('account.components.hints.username')"
					class="w-full" />
			</PFormItem>
			<PFormItem :label="t('account.components.login.form.password')">
				<PInput
					v-model:value="inputPassword"
					autocomplete="current-password"
					:placeholder="t('account.components.hints.password')"
					type="password"
					class="w-full" />
			</PFormItem>
			<PFormSeperator>
				<div class="font-mono text-xs text-white/60 py-3">
					<i18n-t keypath="account.components.login.forgot" tag="p">
						<template #forgot_link>
							<router-link
								to="/request-password-reset"
								class="hover:cursor-pointer underline">
								{{ $t("account.components.login.forgot_link") }}
							</router-link>
						</template>
					</i18n-t>
				</div>
			</PFormSeperator>
			<PFormItem label="">
				<PButton
					:loading="isLoggingIn"
					:disabled="!canLogin"
					html-type="submit">
					{{ $t("account.components.login.buttons.login") }}
				</PButton>
			</PFormItem>
		</PForm>
	</div>
</template>
