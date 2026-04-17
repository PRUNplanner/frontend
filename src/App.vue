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

	// Composables
	import { useVersionCheck } from "@/lib/useVersionCheck";
	const { updateAvailable, startWatch } = useVersionCheck();

	// Stores
	import { useUserStore } from "@/stores/userStore";
	const userStore = useUserStore();
	import { userActivity } from "@/features/user_activity/userActivityStore";

	const isLoggedIn = computed(() => userStore.isLoggedIn);
	const showUpdateNotification = computed(
		() => isLoggedIn.value && updateAvailable.value
	);
	onMounted(() => {
		startWatch();

		if (userStore.isLoggedIn) {
			// start user activity monitor if logged in
			const _activity = userActivity;
		}
	});
</script>

<template>
	<VersionUpdateNotification v-if="showUpdateNotification" />

	<main class="flex w-full text-white/80">
		<NavigationBar v-if="isLoggedIn" />

		<div class="flex-1 flex flex-col">
			<div class="h-full min-h-screen">
				<HomepageHeader
					v-if="!isLoggedIn"
					:show-header="routeData.meta.showHeader" />
				<MobileToggle v-if="isLoggedIn" />

				<Suspense>
					<RouterView />
				</Suspense>

				<AppFooter />
			</div>
		</div>
	</main>
</template>
