<script setup lang="ts">
	import {
		type Component,
		computed,
		nextTick,
		onMounted,
		onUnmounted,
		ref,
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
	const forms = shallowRef<{
		login: Component;
		registration: Component;
		context: Component;
	}>();
	let loading: Promise<void> | undefined;
	function loadForms(): Promise<void> {
		loading ??= Promise.all([
			import("@/features/account/components/LoginComponent.vue"),
			import("@/features/account/components/RegistrationComponent.vue"),
			import("@/features/account/components/AuthPanelContext.vue"),
		])
			.then(([login, registration, context]) => {
				forms.value = {
					login: login.default,
					registration: registration.default,
					context: context.default,
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

	// the section links point into the landing page, also from the report
	const isLanding = computed(() => route.name === "homepage");
	// the full-width tool: the header spans it, at the height its frame expects
	const isSearch = computed(() => route.name === "search");
	const showSections = computed(
		() => isLanding.value || isSearch.value || route.name === "market"
	);
	const sections = ["how", "features", "tools"] as const;

	/*
	 * Menu below lg, where the section nav doesn't fit: the tools, the
	 * sections and, below sm, Log in
	 */
	const menuOpen = ref(false);
	const menuButton = ref<HTMLButtonElement | null>(null);
	const menu = ref<HTMLElement | null>(null);

	function closeMenu(focusButton: boolean): void {
		if (!menuOpen.value) return;
		menuOpen.value = false;
		if (focusButton) menuButton.value?.focus();
	}
	function onKeydown(e: KeyboardEvent): void {
		if (e.key === "Escape") closeMenu(true);
	}
	function onPointerdown(e: PointerEvent): void {
		const target = e.target as Node;
		if (
			!menu.value?.contains(target) &&
			!menuButton.value?.contains(target)
		)
			closeMenu(true);
	}
	watch(menuOpen, async (open) => {
		if (open) {
			document.addEventListener("keydown", onKeydown);
			document.addEventListener("pointerdown", onPointerdown);
			await nextTick();
			menu.value?.querySelector<HTMLElement>("a, button")?.focus();
		} else {
			document.removeEventListener("keydown", onKeydown);
			document.removeEventListener("pointerdown", onPointerdown);
		}
	});
	watch(
		() => route.name,
		() => closeMenu(false)
	);
	// the watchers have stopped by now: remove the listeners here
	onUnmounted(() => {
		document.removeEventListener("keydown", onKeydown);
		document.removeEventListener("pointerdown", onPointerdown);
	});

	// the header leaves on login, the next visitor starts with a closed panel
	onUnmounted(close);

	const navLink =
		"min-h-11 inline-flex items-center hover:text-white aria-[current=page]:text-white aria-[current=page]:shadow-[inset_0_-2px_0_#c0e219]";
	const menuLink =
		"min-h-12 flex items-center justify-between text-base text-white/85 border-b border-white/6 hover:text-white aria-[current=page]:text-white aria-[current=page]:font-bold";
	const menuLabel =
		"pt-3.5 pb-1 font-mono text-xs uppercase tracking-[0.08em] text-white/62";

	const switchButton =
		"min-h-10 px-4.5 inline-flex items-center rounded-[7px] text-[15px] font-semibold cursor-pointer";
</script>

<template>
	<header
		class="sticky top-0 z-40 bg-[#030707]/86 backdrop-blur-md border-b border-white/10"
		:class="{ 'lg:h-16': isSearch }">
		<div
			class="mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-4 sm:gap-x-8 gap-y-3"
			:class="
				isSearch ? 'lg:h-full lg:py-0' : 'max-w-[1240px] sm:py-3.5'
			">
			<RouterLink
				to="/"
				class="min-h-11 inline-flex items-center text-[21px] sm:text-[26px] font-light tracking-[-0.01em] text-prunplanner">
				<span class="font-black">PRUN</span>planner
			</RouterLink>
			<nav
				v-if="showSections"
				:aria-label="$t('homepage.navigation.sections')"
				class="hidden lg:flex flex-wrap items-center gap-x-7 gap-y-1 text-[15px] text-white/78"
				:class="{ 'mr-auto': isSearch }">
				<template v-for="section in sections" :key="section">
					<a
						v-if="isLanding"
						:href="`#${section}`"
						class="min-h-11 inline-flex items-center hover:text-white">
						{{ $t(`homepage.navigation.${section}`) }}
					</a>
					<RouterLink
						v-else
						:to="`/#${section}`"
						class="min-h-11 inline-flex items-center hover:text-white">
						{{ $t(`homepage.navigation.${section}`) }}
					</RouterLink>
					<RouterLink
						v-if="section === 'how'"
						to="/market"
						data-market-link
						:class="navLink"
						@mouseenter="prefetchMarketReport()"
						@focus="prefetchMarketReport()"
						@click="
							trackEvent('landing:market_click', {
								target: 'header',
							})
						">
						{{ $t("homepage.navigation.market") }}
					</RouterLink>
					<RouterLink
						v-if="section === 'how'"
						to="/search"
						data-planet-search-link
						:class="navLink"
						@click="
							trackEvent('landing:planet_search_click', {
								target: 'header',
							})
						">
						{{ $t("homepage.navigation.planet_search") }}
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
			<div class="flex items-center gap-2 sm:gap-5">
				<!-- below sm it moves into the menu, so the header stays one row -->
				<button
					type="button"
					data-login
					class="min-h-11 items-center text-[15px] text-white/78 hover:text-white cursor-pointer"
					:class="
						showSections ? 'hidden sm:inline-flex' : 'inline-flex'
					"
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
				<button
					v-if="showSections"
					ref="menuButton"
					type="button"
					data-menu
					class="lg:hidden size-11 inline-flex items-center justify-center rounded-md text-white/85 hover:text-white cursor-pointer"
					:class="{ 'bg-white/12 text-white!': menuOpen }"
					:aria-label="
						$t(
							menuOpen
								? 'homepage.navigation.menu_close'
								: 'homepage.navigation.menu'
						)
					"
					:aria-expanded="menuOpen"
					aria-controls="homepage-menu"
					@click="menuOpen = !menuOpen">
					<svg
						aria-hidden="true"
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2">
						<path v-if="menuOpen" d="M6 6l12 12M18 6L6 18" />
						<path v-else d="M4 7h16M4 12h16M4 17h16" />
					</svg>
				</button>
			</div>
		</div>

		<template v-if="menuOpen">
			<div
				aria-hidden="true"
				class="lg:hidden absolute top-full inset-x-0 h-dvh bg-black/60" />
			<nav
				id="homepage-menu"
				ref="menu"
				:aria-label="$t('homepage.navigation.menu')"
				class="lg:hidden absolute top-full inset-x-0 px-4 pt-2 pb-4 flex flex-col bg-[#0a1010] border-b border-white/16"
				@click="closeMenu(false)">
				<div :class="menuLabel">
					{{ $t("homepage.navigation.tools_group") }}
				</div>
				<RouterLink
					to="/search"
					:class="menuLink"
					@click="
						trackEvent('landing:planet_search_click', {
							target: 'header',
						})
					">
					{{ $t("homepage.navigation.planet_search") }}
					<span
						v-if="isSearch"
						aria-hidden="true"
						class="size-2 rounded-full bg-prunplanner" />
				</RouterLink>
				<RouterLink
					to="/market"
					:class="menuLink"
					@click="
						trackEvent('landing:market_click', { target: 'header' })
					">
					{{ $t("homepage.navigation.market") }}
				</RouterLink>
				<div :class="menuLabel">PRUNplanner</div>
				<template v-for="section in sections" :key="section">
					<a v-if="isLanding" :href="`#${section}`" :class="menuLink">
						{{
							$t(
								`homepage.navigation.${section === "tools" ? "all_tools" : section}`
							)
						}}
					</a>
					<RouterLink v-else :to="`/#${section}`" :class="menuLink">
						{{
							$t(
								`homepage.navigation.${section === "tools" ? "all_tools" : section}`
							)
						}}
					</RouterLink>
				</template>
				<a
					:href="GITHUB_URL"
					target="_blank"
					rel="noopener"
					:class="menuLink">
					{{ $t("homepage.navigation.github") }}
				</a>
				<button
					type="button"
					data-menu-login
					class="sm:hidden mt-2 min-h-12 flex items-center text-base font-semibold text-white cursor-pointer"
					@click="toggleLogin">
					{{ $t("homepage.navigation.login") }}
				</button>
			</nav>
		</template>
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
			<component :is="forms.context" />
			<component :is="forms.login" v-if="showLogin" />
			<component
				:is="forms.registration"
				v-else
				@login="showLoginForm" />
		</template>
	</PDrawer>
</template>
