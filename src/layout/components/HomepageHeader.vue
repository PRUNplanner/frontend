<script setup lang="ts">
	import {
		type Component,
		computed,
		onMounted,
		onUnmounted,
		shallowRef,
		watch,
	} from "vue";
	import { useRoute } from "vue-router";

	// Composables
	import { useAuthPanel } from "@/features/account/useAuthPanel";
	import { prefetchMarketReport } from "@/features/market_report/marketReportPrefetch.util";
	import { trackEvent } from "@/lib/analytics/useAnalytics";
	import { afterLoad } from "@/util/afterLoad";


	// UI
	import PDrawer from "@/ui/components/PDrawer.vue";
	import {
		GITHUB_URL,
		landingPrimaryButton,
	} from "@/features/homepage/homepage.constants";

	const route = useRoute();
	const {
		showLogin,
		showRegistration,
		toggleLogin,
		toggleRegistration,
		switchTo,
		showLoginForm,
		close,
	} = useAuthPanel();

	// The forms bring the API layer, which a visitor reading the page doesn't
	// need (this header loads before the mount): loaded once the page has,
	// or when the panel is asked for first. The panel opens with them, so
	// it focuses the form's first field.
	const forms = shallowRef<{ login: Component; registration: Component }>();
	let loading: Promise<void> | undefined;
	function loadForms(): Promise<void> {
		loading ??= Promise.all([
			import("@/features/account/components/LoginComponent.vue"),
			import("@/features/account/components/RegistrationComponent.vue"),
		])
			.then(([login, registration]) => {
				forms.value = {
					login: login.default,
					registration: registration.default,
				};
			})
			.catch((error) => {
				// closed, so the next request tries again
				loading = undefined;
				close();
				console.error(error);
			});
		return loading;
	}
	onMounted(() => afterLoad().then(loadForms));

	const asked = computed(() => showLogin.value || showRegistration.value);
	watch(asked, (open) => open && loadForms(), { immediate: true });

	const show = computed({
		get: () => asked.value && forms.value !== undefined,
		set: (value: boolean) => {
			if (!value) close();
		},
	});

	// the section links point into the landing page
	const isLanding = computed(() => route.name === "homepage");
	const sections = ["how", "features", "tools"] as const;

	// the header leaves on login, the next visitor starts with a closed panel
	onUnmounted(close);

	const switchButton =
		"min-h-10 px-4.5 inline-flex items-center rounded-[7px] text-[15px] font-semibold cursor-pointer";
</script>

<template>
	<header
		class="sticky top-0 z-20 bg-[#030707]/86 backdrop-blur-md border-b border-white/10">
		<div
			class="mx-auto max-w-[1240px] px-4 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-x-4 sm:gap-x-8 gap-y-3">
			<RouterLink
				to="/"
				class="min-h-11 inline-flex items-center text-[21px] sm:text-[26px] font-light tracking-[-0.01em] text-prunplanner">
				<span class="font-black">PRUN</span>planner
			</RouterLink>
			<nav
				v-if="isLanding"
				:aria-label="$t('homepage.navigation.sections')"
				class="hidden lg:flex flex-wrap items-center gap-x-7 gap-y-1 text-[15px] text-white/78">
				<template v-for="section in sections" :key="section">
					<a
						:href="`#${section}`"
						class="min-h-11 inline-flex items-center hover:text-white">
						{{ $t(`homepage.navigation.${section}`) }}
					</a>
					<RouterLink
						v-if="section === 'how'"
						to="/market"
						data-market-link
						class="min-h-11 inline-flex items-center hover:text-white"
						@mouseenter="prefetchMarketReport()"
						@focus="prefetchMarketReport()"
						@click="
							trackEvent('landing:market_click', {
								target: 'header',
							})
						">
						{{ $t("homepage.navigation.market") }}
					</RouterLink>
				</template>
				<a
					:href="GITHUB_URL"
					target="_blank"
					rel="noopener"
					class="min-h-11 inline-flex items-center hover:text-white">
					{{ $t("homepage.navigation.github") }}
				</a>
			</nav>
			<div class="flex items-center gap-3.5 sm:gap-5">
				<button
					type="button"
					data-login
					class="min-h-11 inline-flex items-center text-[15px] text-white/78 hover:text-white cursor-pointer"
					@click="toggleLogin">
					{{ $t("homepage.navigation.login") }}
				</button>
				<button
					type="button"
					data-registration
					:class="[landingPrimaryButton, 'min-h-11! px-3! sm:px-4.5! text-sm! sm:text-[15px]!']"
					@click="toggleRegistration">
					{{ $t("homepage.navigation.registration") }}
				</button>
			</div>
		</div>
	</header>

	<PDrawer
		v-model:show="show"
		width="min(100%, 480px)"
		class="max-w-full! bg-[#0a1010]! text-white! text-base! border-l border-white/16"
		body-class="px-8! pt-6! pb-10!">
		<template #header>
			<span class="sr-only">{{ $t("homepage.auth_panel.label") }}</span>
			<div
				role="group"
				:aria-label="$t('homepage.auth_panel.switch')"
				class="inline-flex p-1 rounded-[10px] bg-[#030707] border border-white/10">
				<button
					type="button"
					:aria-pressed="showLogin"
					:class="[
						switchButton,
						showLogin ? 'bg-white/12 text-white' : 'text-white/70',
					]"
					@click="switchTo('login')">
					{{ $t("homepage.navigation.login") }}
				</button>
				<button
					type="button"
					:aria-pressed="showRegistration"
					:class="[
						switchButton,
						showRegistration ? 'bg-white/12 text-white' : 'text-white/70',
					]"
					@click="switchTo('registration')">
					{{ $t("homepage.navigation.registration") }}
				</button>
			</div>
		</template>
		<template v-if="forms">
			<component :is="forms.login" v-if="showLogin" />
			<component
				:is="forms.registration"
				v-else
				@login="showLoginForm" />
		</template>
	</PDrawer>
</template>
