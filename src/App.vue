<script setup lang="ts">
	import { defineAsyncComponent, onMounted, computed, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();
	import { useRoute, useRouter } from "vue-router";
	const routeData = useRoute();
	const router = useRouter();

	// Components
	import AppFooter from "@/layout/components/AppFooter.vue";
	const HomepageHeader = defineAsyncComponent(
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
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
	import { getPostHogKey } from "@/lib/analytics/usePostHog";
	import { dbBlocked } from "@/database/composables/useIndexedDBStore";
	import { sessionReplaced } from "@/lib/crossTab";
	import { useToast } from "@/ui";
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

	// the banner's chunk loads only for a visitor who still has to choose
	const { consent, reopened } = useAnalyticsConsent();
	const askVisitor = computed(
		() =>
			!isLoggedIn.value &&
			getPostHogKey() !== undefined &&
			(consent.value === null || reopened.value)
	);

	onMounted(() => {
		startWatch();

		// a session restored from storage: analytics knows the user from the
		// stored profile until the fresh one (loaded below) arrives
		if (userStore.profile) identifyUser(userStore.profile);

		if (userStore.isLoggedIn) {
			announceRelease(() => router.push("/help#changelog"));
			// start user activity monitor if logged in
			const _activity = userActivity;
			// changed in another browser or device since this one stored them
			// (preferences, and the profile: email confirmed, FIO linked)
			useQuery("GetPreferences").execute().catch(console.error);
			userStore.loadProfile();
		}
	});
</script>

<template>
	<!-- not over the terms the dialog links to -->
	<AnalyticsConsentDialog
		v-if="isLoggedIn && routeData.name !== 'imprint-tos'" />
	<AnalyticsConsentBanner v-if="askVisitor" />

	<main class="flex w-full text-white/80">
		<AppSidebar v-if="isLoggedIn" class="hidden md:flex" />

		<div class="flex-1 min-w-0 flex flex-col">
			<!-- logged in, phones keep the page clear of the bottom bar -->
			<div
				class="h-full min-h-screen"
				:class="isLoggedIn ? 'pb-16 md:pb-0' : ''">
				<HomepageHeader
					v-if="!isLoggedIn"
					:show-header="routeData.meta.showHeader" />

				<Suspense>
					<RouterView />
				</Suspense>

				<!-- the landing page has its own footer -->
				<AppFooter v-if="routeData.name !== 'homepage'" />
			</div>
		</div>
	</main>
	<MobileNavBar v-if="isLoggedIn" />
</template>
