<script setup lang="ts">
	import { ref, type Ref, computed } from "vue";

	import { useI18n } from "vue-i18n";
	const { t } = useI18n();

	import { useUserStore } from "@/stores/userStore";
	import { useAuthPanel } from "@/features/account/useAuthPanel";
	import { reportError } from "@/lib/analytics/useAnalytics";

	const userStore = useUserStore();
	const { next, entering } = useAuthPanel();
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
		const target = loginTarget();
		// a page follows: this one keeps the visitor's layout until it shows,
		// so nothing here moves while it loads; the layout and the page change
		// in one render, when the navigation is done
		entering.value = target !== null;

		const result = await userStore.performLogin(
			inputUsername.value!,
			inputPassword.value!
		);

		if (result !== "ok") {
			entering.value = false;
			isLoggingIn.value = false;
			loginError.value = result;
		} else if (target === null) isLoggingIn.value = false;
		else {
			// in the navigation's own render: the next page mounts once, in
			// the app's layout
			const release = (): void => {
				off();
				entering.value = false;
				isLoggingIn.value = false;
			};
			const off = router.afterEach(release);
			router.push({ path: target }).catch((err: unknown) => {
				release();
				reportError(err);
			});
		}
	}

	/**
	 * Where a login leads: back to where it was asked for, the page the
	 * panel was opened for, or the empire; null stays on this page
	 *
	 * @returns {string | null} Path, or null to stay
	 */
	function loginTarget(): string | null {
		const redirectTo = new URLSearchParams(window.location.search).get(
			"redirectTo"
		);
		// only a path on this site, "//host" and "/\host" would leave it
		if (redirectTo)
			return /^\/(?![/\\])/.test(redirectTo) ? redirectTo : "/empire";
		if (next.value) return next.value;
		return STAY_ON.includes(String(router.currentRoute.value.name))
			? null
			: "/empire";
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
