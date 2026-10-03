<script setup lang="ts">
	import { defineAsyncComponent, onMounted, computed, watch } from "vue";
	import { useI18n } from "vue-i18n";
	const { t } = useI18n();
	import { useRoute } from "vue-router";
	const routeData = useRoute();

	// Components
	import AppFooter from "@/layout/components/AppFooter.vue";
	const HomepageHeader = defineAsyncComponent(
		() => import("@/layout/components/HomepageHeader.vue")
	);
	const NavigationBar = defineAsyncComponent(
		() => import("@/layout/components/NavigationBar.vue")
	);
	const MobileToggle = defineAsyncComponent(
		() => import("@/layout/components/MobileToggle.vue")
	);

	const VersionUpdateNotification = defineAsyncComponent(
		() => import("@/layout/components/VersionUpdateNotification.vue")
	);

	const AnalyticsConsentDialog = defineAsyncComponent(
		() =>
			import("@/features/analytics/components/AnalyticsConsentDialog.vue")
	);

	// Composables
	import { useVersionCheck } from "@/lib/useVersionCheck";
	const { updateAvailable, startWatch } = useVersionCheck();

	// Stores
	import { useUserStore } from "@/stores/userStore";
	const userStore = useUserStore();
	import { userActivity } from "@/features/user_activity/userActivityStore";
	import { identifyUser, trackEvent } from "@/lib/analytics/useAnalytics";
	import { useQuery } from "@/lib/query_cache/useQuery";
	import { dbBlocked } from "@/database/composables/useIndexedDBStore";
	import { sessionReplaced } from "@/lib/crossTab";
	import { useToast } from "@/ui";
	import type { MessageReactive } from "naive-ui";
	const toast = useToast();

	// an older PRUNplanner tab holds the database, game data waits on it
	let blockedToast: MessageReactive | undefined;
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
	const showUpdateNotification = computed(
		() => isLoggedIn.value && updateAvailable.value
	);
	onMounted(() => {
		startWatch();

		// a session restored from storage loads no profile, analytics still
		// needs to know the user once they consent
		if (userStore.profile) identifyUser(userStore.profile);

		if (userStore.isLoggedIn) {
			// start user activity monitor if logged in
			const _activity = userActivity;
			// changed in another browser or device since this one stored them
			useQuery("GetPreferences").execute().catch(console.error);
		}
	});
</script>

<template>
	<VersionUpdateNotification v-if="showUpdateNotification" />
	<!-- not over the terms the dialog links to -->
	<AnalyticsConsentDialog
		v-if="isLoggedIn && routeData.name !== 'imprint-tos'" />

	<main class="flex w-full text-white/80">
		<NavigationBar v-if="isLoggedIn" />

		<div class="flex-1 min-w-0 flex flex-col">
			<div class="h-full min-h-screen">
				<HomepageHeader
					v-if="!isLoggedIn"
					:show-header="routeData.meta.showHeader" />
				<MobileToggle v-if="isLoggedIn" />

				<Suspense>
					<RouterView />
				</Suspense>

				<!-- the landing page has its own footer -->
				<AppFooter v-if="routeData.name !== 'homepage'" />
			</div>
		</div>
	</main>
</template>
