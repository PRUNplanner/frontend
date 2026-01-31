import { createWebHistory, createRouter } from "vue-router";

// Stores
import { useUserStore } from "@/stores/userStore";

// Composables
// import { trackEvent } from "@/lib/analytics/useAnalytics";

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			name: "homepage",
			path: "/",
			meta: { showHeader: false },
			component: () => import("@/views/HomepageView.vue"),
			props: true,
		},
		{
			name: "profile",
			path: "/profile",
			meta: { requiresAuth: true },
			component: () => import("@/views/ProfileView.vue"),
			props: true,
		},
		{
			name: "empire",
			path: "/empire/:empireUuid?",
			meta: { requiresAuth: true },
			component: () => import("@/views/EmpireView.vue"),
			props: true,
		},
		{
			name: "manage",
			path: "/manage",
			meta: { requiresAuth: true },
			component: () => import("@/views/ManageView.vue"),
		},
		{
			name: "exchanges",
			path: "/exchanges/:cxUuid?",
			meta: { requiresAuth: true },
			component: () => import("@/views/ExchangesView.vue"),
			props: true,
		},
		{
			name: "search",
			path: "/search",
			meta: { requiresAuth: true },
			component: () => import("@/views/PlanetSearchView.vue"),
		},
		{
			name: "not-implemented",
			path: "/not-implemented",
			component: () => import("@/views/NotImplementedView.vue"),
		},
		{
			name: "plan",
			path: "/plan/:planetNaturalId/:planUuid?",
			meta: { requiresAuth: true },
			component: () => import("@/views/PlanLoadView.vue"),
			props: true,
		},
		{
			name: "shared-plan",
			path: "/shared/:sharedPlanUuid",
			meta: { showHeader: false },
			component: () => import("@/views/PlanLoadView.vue"),
			props: true,
		},
		{
			name: "fio-repair",
			path: "/fio/repair",
			meta: { requiresAuth: true },
			component: () => import("@/views/fio/FIORepairView.vue"),
		},
		{
			name: "fio-burn",
			path: "/fio/burn",
			meta: { requiresAuth: true },
			component: () => import("@/views/fio/FIOBurnView.vue"),
		},
		{
			name: "market-exploration",
			path: "/market-exploration",
			meta: { requiresAuth: true },
			component: () => import("@/views/tools/MarketExplorationView.vue"),
		},
		{
			name: "hq-upgrade-calculator",
			path: "/hq-upgrade-calculator",
			meta: { requiresAuth: true },
			component: () =>
				import("@/views/tools/HQUpgradeCalculatorView.vue"),
		},
		{
			name: "imprint-tos",
			path: "/imprint-tos",
			meta: { showHeader: false },
			component: () => import("@/views/ImprintToSView.vue"),
		},
		{
			name: "help",
			path: "/help",
			meta: { requiresAuth: true },
			component: () => import("@/views/HelpView.vue"),
		},
		{
			name: "roi-overview",
			path: "/roi-overview",
			meta: { requiresAuth: true },
			component: () => import("@/views/tools/ROIOverviewView.vue"),
		},
		{
			name: "resource-roi-overview",
			path: "/resource-roi-overview",
			meta: { requiresAuth: true },
			component: () =>
				import("@/views/tools/ResourceROIOverviewView.vue"),
		},
		{
			name: "production-chain",
			path: "/production-chain",
			meta: { requiresAuth: true },
			component: () => import("@/views/tools/ProductionChainView.vue"),
		},
		{
			name: "upkeep-price-calculator",
			path: "/upkeep-price-calculator",
			meta: { requiresAuth: true },
			component: () =>
				import("@/views/tools/UpkeepPriceCalculatorView.vue"),
		},
		{
			name: "verify-email",
			path: "/verify-email",
			meta: { showHeader: false },
			component: () => import("@/views/VerifyEmailView.vue"),
		},
		{
			name: "request-password-reset",
			path: "/request-password-reset",
			meta: { showHeader: false },
			component: () => import("@/views/RequestPasswordResetView.vue"),
		},
		{
			name: "password-reset",
			path: "/password-reset/:resetCode?",
			meta: { showHeader: false },
			props: true,
			component: () => import("@/views/PasswordResetView.vue"),
		},
		{
			name: "debug",
			path: "/debug",
			meta: { requiresAuth: true },
			component: () => import("@/lib/query_cache/QueryCacheView.vue"),
		},
		{
			name: "api",
			path: "/api",
			meta: { requiresAuth: true },
			component: () => import("@/views/APIView.vue"),
		},
	],
});

router.beforeEach((to, _) => {
	const userStore = useUserStore();

	if (to.meta.requiresAuth && !userStore.isLoggedIn) {
		return {
			path: "/",
			name: "homepage",
			state: { showLogin: "true" },
			query: {
				redirectTo: to.fullPath,
			},
		};
	} else if (to.name === "homepage" && userStore.isLoggedIn) {
		return {
			path: "/empire",
			name: "empire",
		};
	}
});

// router.afterEach((to, from) => {
// 	trackEvent("page_view", {
// 		page_name: to.name?.toString() ?? to.path,
// 		referrer: from.name?.toString(),
// 	});
// });

export default router;
