<script setup lang="ts">
	import { defineAsyncComponent, onMounted, computed } from "vue";
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
	import { identifyUser } from "@/lib/analytics/useAnalytics";

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
