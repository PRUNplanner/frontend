import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import App from "@/App.vue";
import { dbBlocked } from "@/database/composables/useIndexedDBStore";
import { sessionReplaced } from "@/lib/crossTab";
import { toasts } from "@/ui/useToast";
import { useUserStore } from "@/stores/userStore";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { UserProfile } from "@/features/api/schemas/user.schemas";

// vi.mock factories are hoisted, so are their helpers. The shell's
// children have their own tests: they show what App hands them.
const mocks = vi.hoisted(() => {
	const stub = (name: string, props: string[] = []) => ({
		__esModule: true,
		default: {
			name,
			props,
			render: () => null,
		},
	});
	return {
		stub,
		route: { name: "empire", meta: {} } as {
			name: string;
			meta: Record<string, unknown>;
		},
		push: vi.fn(),
		startWatch: vi.fn(),
		announceRelease: vi.fn(),
		identifyUser: vi.fn(),
		trackEvent: vi.fn(),
		execute: vi.fn(),
		useQuery: vi.fn(),
	};
});

vi.mock("vue-router", () => ({
	useRoute: () => mocks.route,
	useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/layout/components/AppFooter.vue", () => mocks.stub("AppFooter"));
vi.mock("@/layout/components/HomepageHeader.vue", () =>
	mocks.stub("HomepageHeader")
);
vi.mock("@/layout/components/navigation/AppSidebar.vue", () =>
	mocks.stub("AppSidebar")
);
vi.mock("@/layout/components/navigation/MobileNavBar.vue", () =>
	mocks.stub("MobileNavBar")
);
vi.mock("@/features/analytics/components/AnalyticsConsentDialog.vue", () =>
	mocks.stub("AnalyticsConsentDialog")
);
vi.mock("@/features/user_activity/userActivityStore", () => ({
	userActivity: {},
}));
vi.mock("@/lib/useVersionCheck", () => ({
	useVersionCheck: () => ({ startWatch: mocks.startWatch }),
}));
vi.mock("@/lib/whatsNew", () => ({ announceRelease: mocks.announceRelease }));
vi.mock("@/lib/analytics/useAnalytics", () => ({
	identifyUser: mocks.identifyUser,
	trackEvent: mocks.trackEvent,
}));
vi.mock("@/lib/query_cache/useQuery", () => ({ useQuery: mocks.useQuery }));

const PROFILE: UserProfile = {
	id: 1,
	username: "test-user",
	email: null,
	is_email_verified: true,
	fio_apikey: null,
	prun_username: null,
	fio_status: "none",
	fio_last_refreshed_at: null,
};

let pinia: Pinia;

async function mountApp(loggedIn = false) {
	if (loggedIn) useUserStore().setToken("access", "refresh");
	const mounted = await mountComponent(App, {}, { pinia });
	// the async children load behind a dynamic import
	await vi.waitFor(() => expect(mounted.wrapper.html()).toContain("main"));
	await flushPromises();
	return mounted.wrapper;
}

const has = (w: Awaited<ReturnType<typeof mountApp>>, name: string) =>
	w.findComponent({ name }).exists();

beforeEach(() => {
	pinia = createPinia();
	setActivePinia(pinia);
	(Object.values(mocks) as unknown[])
		.filter(vi.isMockFunction)
		.forEach((fn) => fn.mockReset());
	mocks.execute.mockResolvedValue(undefined);
	mocks.useQuery.mockReturnValue({ execute: mocks.execute });
	mocks.route.name = "empire";
	mocks.route.meta = {};
	toasts.value = [];
	dbBlocked.value = false;
	sessionReplaced.value = false;
	config.global.stubs = { ...config.global.stubs, RouterView: true };
});

afterEach(() => {
	delete config.global.stubs.RouterView;
	vi.unstubAllGlobals();
});

describe("App", () => {
	describe("logged out", () => {
		it("shows the homepage header and the footer, no navigation", async () => {
			const w = await mountApp();

			expect(has(w, "HomepageHeader")).toBe(true);
			// the page alone is the main landmark
			expect(w.findAll("main")).toHaveLength(1);
			expect(w.find("main").html()).toContain("router-view-stub");
			expect(has(w, "AppFooter")).toBe(true);
			expect(has(w, "AppSidebar")).toBe(false);
			expect(has(w, "MobileNavBar")).toBe(false);
			expect(has(w, "AnalyticsConsentDialog")).toBe(false);
			expect(w.find(".min-h-screen").classes()).not.toContain("pb-16");
		});

		it("leaves the footer to the landing page", async () => {
			mocks.route.name = "homepage";
			const w = await mountApp();

			expect(has(w, "HomepageHeader")).toBe(true);
			expect(has(w, "AppFooter")).toBe(false);
		});

		it("does not start the logged-in loads", async () => {
			await mountApp();

			expect(mocks.startWatch).toHaveBeenCalledOnce();
			expect(mocks.announceRelease).not.toHaveBeenCalled();
			expect(mocks.useQuery).not.toHaveBeenCalled();
			expect(mocks.identifyUser).not.toHaveBeenCalled();
		});
	});

	describe("logged in", () => {
		it("shows the sidebar, the phone bar and the consent dialog", async () => {
			const w = await mountApp(true);

			expect(has(w, "AppSidebar")).toBe(true);
			expect(has(w, "MobileNavBar")).toBe(true);
			expect(has(w, "AnalyticsConsentDialog")).toBe(true);
			expect(has(w, "HomepageHeader")).toBe(false);
			expect(has(w, "AppFooter")).toBe(true);
			// phones keep the page clear of the bottom bar
			expect(w.find(".min-h-screen").classes()).toContain("pb-16");
		});

		it("keeps the consent dialog off the terms it links to", async () => {
			mocks.route.name = "imprint-tos";
			const w = await mountApp(true);

			expect(has(w, "AnalyticsConsentDialog")).toBe(false);
			expect(has(w, "AppSidebar")).toBe(true);
		});

		it("refreshes the preferences and the profile", async () => {
			const loadProfile = vi
				.spyOn(useUserStore(), "loadProfile")
				.mockImplementation(() => {});
			await mountApp(true);

			expect(mocks.useQuery).toHaveBeenCalledWith("GetPreferences");
			expect(mocks.execute).toHaveBeenCalledOnce();
			expect(loadProfile).toHaveBeenCalledOnce();
		});

		it("logs a failed preferences refresh", async () => {
			const failure = new Error("offline");
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			mocks.execute.mockRejectedValue(failure);
			await mountApp(true);

			await vi.waitFor(() => expect(error).toHaveBeenCalledWith(failure));
		});

		it("opens the changelog from the release notice", async () => {
			await mountApp(true);

			const open = mocks.announceRelease.mock.calls[0][0] as () => void;
			open();

			expect(mocks.push).toHaveBeenCalledWith("/help#changelog");
		});
	});

	it("tells analytics who a restored session belongs to", async () => {
		useUserStore().profile = PROFILE;
		await mountApp();

		expect(mocks.identifyUser).toHaveBeenCalledExactlyOnceWith(PROFILE);
	});

	describe("blocked database", () => {
		it("warns, tracks and clears the warning when the other tab lets go", async () => {
			await mountApp();

			dbBlocked.value = true;
			await flushPromises();
			expect(mocks.trackEvent).toHaveBeenCalledExactlyOnceWith(
				"app:db_blocked"
			);
			expect(toasts.value).toHaveLength(1);
			expect(toasts.value[0]).toMatchObject({
				text: "save_conflict.notice.db_blocked",
				type: "error",
			});

			dbBlocked.value = false;
			await flushPromises();
			expect(toasts.value).toHaveLength(0);
			expect(mocks.trackEvent).toHaveBeenCalledOnce();
		});

		it("shows one warning when it is blocked again", async () => {
			await mountApp();

			dbBlocked.value = true;
			await flushPromises();
			dbBlocked.value = false;
			await flushPromises();
			dbBlocked.value = true;
			await flushPromises();

			expect(toasts.value).toHaveLength(1);
			expect(mocks.trackEvent).toHaveBeenCalledTimes(2);
		});
	});

	describe("session replaced in another tab", () => {
		it("offers a reload that stays until used", async () => {
			const reload = vi.fn();
			vi.stubGlobal("location", { reload });
			await mountApp();

			sessionReplaced.value = true;
			await flushPromises();

			expect(toasts.value).toHaveLength(1);
			const [notice] = toasts.value;
			expect(notice).toMatchObject({
				text: "save_conflict.notice.session_replaced",
				type: "error",
			});
			expect(notice.action?.label).toBe("save_conflict.notice.reload");
			notice.action!.onClick();
			expect(reload).toHaveBeenCalledOnce();
		});
	});
});
