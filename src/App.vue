<script setup lang="ts">
	import { defineAsyncComponent, onMounted, computed, ref, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();
	import { useRoute, useRouter } from "vue-router";
	const routeData = useRoute();
	const router = useRouter();

	// Components
	import AppFooter from "@/layout/components/AppFooter.vue";
	import { homepageHeader } from "@/lib/seo/prerenderMount";
	// loaded before a fresh mount over the prerendered page, else async
	// (hydrating the landing page: see docs/seo.md)
	const HomepageHeader =
		homepageHeader ??
		defineAsyncComponent(
			() => import("@/layout/components/HomepageHeader.vue")
		);
	const AppSidebar = defineAsyncComponent(
		() => import("@/layout/components/navigation/AppSidebar.vue")
	);
	const MobileNavBar = defineAsyncComponent(
		() => import("@/layout/components/navigation/MobileNavBar.vue")
	);

	const AnalyticsConsentDialog = defineAsyncComponent(
		() =>
			import("@/features/analytics/components/AnalyticsConsentDialog.vue")
	);
	const AnalyticsConsentBanner = defineAsyncComponent(
		() =>
			import("@/features/analytics/components/AnalyticsConsentBanner.vue")
	);

	// Composables
	import { useVersionCheck } from "@/lib/useVersionCheck";
	import { announceRelease } from "@/lib/whatsNew";
	const { startWatch } = useVersionCheck();

	// Stores
	import { useUserStore } from "@/stores/userStore";
	const userStore = useUserStore();
	import { userActivity } from "@/features/user_activity/userActivityStore";
	import { identifyUser, trackEvent } from "@/lib/analytics/useAnalytics";
	import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
	import { getPostHogKey } from "@/lib/analytics/usePostHog";
	import { dbBlocked } from "@/database/dbBlocked";
	import { sessionReplaced } from "@/lib/crossTab";
	import { useToast } from "@/ui/useToast";
	import type { PToastHandle } from "@/ui/ui.types";
	const toast = useToast();

	// an older PRUNplanner tab holds the database, game data waits on it
	let blockedToast: PToastHandle | undefined;
	watch(dbBlocked, (blocked) => {
		if (blocked) trackEvent("app:db_blocked");
		blockedToast?.destroy();
		blockedToast = blocked
			? toast(t("save_conflict.notice.db_blocked"), {
					type: "error",
					duration: 0,
				})
			: undefined;
	});

	// another tab logged in while the leave-page prompt kept this one open
	watch(sessionReplaced, () =>
		toast(t("save_conflict.notice.session_replaced"), {
			type: "error",
			duration: 0,
			action: {
				label: t("save_conflict.notice.reload"),
				onClick: () => location.reload(),
			},
		})
	);

	const isLoggedIn = computed(() => userStore.isLoggedIn);

	// the banner's chunk loads only for a visitor who still has to choose;
	// not before mount, so the prerendered landing page hydrates as rendered
	const mounted = ref(false);
	const { consent, reopened } = useAnalyticsConsent();
	const askVisitor = computed(
		() =>
			mounted.value &&
			!isLoggedIn.value &&
			getPostHogKey() !== undefined &&
			(consent.value === null || reopened.value)
	);

	onMounted(() => {
		mounted.value = true;
		startWatch();

		// a session restored from storage: analytics knows the user from the
		// stored profile until the fresh one (loaded below) arrives
		if (userStore.profile) identifyUser(userStore.profile);

		if (userStore.isLoggedIn) {
			announceRelease(() => router.push("/help#changelog"));
			// start user activity monitor if logged in
			const _activity = userActivity;
			// changed in another browser or device since this one stored them
			// (preferences, and the profile: email confirmed, FIO linked).
			// The query layer isn't in a visitor's shell
			import("@/lib/query_cache/useQuery")
				.then(({ useQuery }) => useQuery("GetPreferences").execute())
				.catch(console.error);
			userStore.loadProfile();
		}
	});
</script>

<template>
	<!-- not over the terms the dialog links to -->
	<AnalyticsConsentDialog
		v-if="isLoggedIn && routeData.name !== 'imprint-tos'" />
	<AnalyticsConsentBanner v-if="askVisitor" />

	<div class="flex w-full text-white/80">
		<AppSidebar v-if="isLoggedIn" class="hidden md:flex" />

		<div class="flex-1 min-w-0 flex flex-col">
			<!-- logged in, phones keep the page clear of the bottom bar -->
			<div
				class="h-full min-h-screen"
				:class="isLoggedIn ? 'pb-16 md:pb-0' : ''">
				<HomepageHeader v-if="!isLoggedIn" />

				<!-- the page alone is the main landmark, not header and footer -->
				<main class="contents">
					<Suspense>
						<RouterView />
					</Suspense>
				</main>

				<!-- the landing page has its own footer -->
				<AppFooter v-if="routeData.name !== 'homepage'" />
			</div>
		</div>
	</div>
	<MobileNavBar v-if="isLoggedIn" />
</template>
