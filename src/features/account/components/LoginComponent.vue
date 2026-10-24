<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { useUserStore } from "@/stores/userStore";
	import { useAuthPanel } from "@/features/account/useAuthPanel";

	const userStore = useUserStore();
	import router from "@/router";

	// UI
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

	// a shared plan stays open, to be cloned right away; a search keeps its
	// filters, its plan distances appear with the login
	const STAY_ON = ["shared-plan", "search"];

	const inputUsername: Ref<string | null> = ref(null);
	const inputPassword: Ref<string | null> = ref(null);
	const isLoggingIn: Ref<boolean> = ref(false);
	const loginError: Ref<"throttled" | "failed" | null> = ref(null);

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
		loginError.value = null;
		// read first: the header and its panel leave once logged in
		const next = useAuthPanel().next.value;

		const result = await userStore.performLogin(
			inputUsername.value!,
			inputPassword.value!
		);

		isLoggingIn.value = false;

		if (result !== "ok") loginError.value = result;
		else {
			let urlParams = new URLSearchParams(window.location.search);

			// successfull login should redirect back to origin, if present
			if (urlParams.has("redirectTo") && urlParams.get("redirectTo")) {
				router.push({ path: urlParams.get("redirectTo")! });
			} else if (next) {
				router.push({ path: next });
			} else if (
				!STAY_ON.includes(String(router.currentRoute.value.name))
			) {
				router.push({ path: "/empire" });
			}
		}
	}
</script>

<template>
	<form class="flex flex-col gap-5" @submit.prevent="handleLogin">
		<h2 :class="landingHeading">
			{{ $t("account.components.login.title") }}
		</h2>
		<PNotice v-if="loginError" type="error">
			{{
				loginError === "throttled"
					? $t("account.components.login.throttled")
					: $t("account.components.login.error")
			}}
		</PNotice>
		<div :class="landingField">
			<PFormItem :label="t('account.components.login.form.username')">
				<PInput
					v-model:value="inputUsername"
					autocomplete="username"
					:placeholder="t('account.components.hints.username')"
					:class="landingInput" />
			</PFormItem>
		</div>
		<div :class="landingField">
			<PFormItem :label="t('account.components.login.form.password')">
				<PInput
					v-model:value="inputPassword"
					autocomplete="current-password"
					:placeholder="t('account.components.hints.password')"
					type="password"
					:class="landingInput" />
			</PFormItem>
			<router-link
				to="/request-password-reset"
				class="self-end min-h-11 lg:min-h-6 inline-flex items-center text-sm text-white/78 underline hover:text-white">
				{{ $t("account.components.login.forgot_link") }}
			</router-link>
		</div>
		<button
			type="submit"
			:disabled="!canLogin || isLoggingIn"
			:aria-busy="isLoggingIn"
			:class="[landingPrimaryButton, 'w-full']">
			<PSpin v-if="isLoggingIn" color="muted" />
			{{ $t("account.components.login.buttons.login") }}
		</button>
		<i18n-t
			keypath="account.components.login.tos"
			tag="p"
			class="m-0 font-mono text-xs text-white/62">
			<template #tos_link>
				<router-link to="/imprint-tos" class="underline">
					{{ $t("account.components.login.tos_link") }}
				</router-link>
			</template>
		</i18n-t>
	</form>
</template>
