import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import LoginComponent from "@/features/account/components/LoginComponent.vue";
import { useUserStore } from "@/stores/userStore";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { mountComponent } from "@/tests/mountComponent";

const route = vi.hoisted(() => ({ value: { name: "homepage" } }));
vi.mock("@/router", () => ({
	default: {
		push: vi.fn(() => Promise.resolve()),
		afterEach: vi.fn(() => vi.fn()),
		currentRoute: route,
	},
}));
import router from "@/router";

async function login(result: "ok" | "throttled" | "failed" = "ok") {
	const pinia = createPinia();
	setActivePinia(pinia);
	vi.spyOn(useUserStore(), "performLogin").mockResolvedValue(result);

	const { wrapper } = await mountComponent(LoginComponent, {}, { pinia });
	const [username, password] = wrapper.findAll("input");
	await username.setValue("test-user");
	await password.setValue("correct-horse-battery");
	await wrapper.find("form").trigger("submit");
	await flushPromises();
	return wrapper;
}

describe("LoginComponent", () => {
	beforeEach(() => {
		useAuthPanel().close();
		vi.mocked(router.push).mockClear();
		vi.mocked(router.afterEach).mockClear();
		window.history.replaceState({}, "", "/");
	});

	it("keeps the visitor's layout until the page after the login shows", async () => {
		route.value = { name: "homepage" };
		const off = vi.fn();
		vi.mocked(router.afterEach).mockReturnValueOnce(off);
		await login();
		// performLogin is mocked: the token it sets
		useUserStore().setToken("access", "refresh");
		// logged in, the empire still on its way: the homepage stays as it is
		expect(useUserStore().isLoggedIn).toBe(true);
		expect(useAuthPanel().entering.value).toBe(true);
		expect(useAuthPanel().loggedInLayout.value).toBe(false);

		// the navigation is done: its own render switches the layout
		const [[hook]] = vi.mocked(router.afterEach).mock.calls;
		(hook as () => void)();
		expect(off).toHaveBeenCalledOnce();
		expect(useAuthPanel().entering.value).toBe(false);
		expect(useAuthPanel().loggedInLayout.value).toBe(true);
	});

	it("lets go of the layout when the navigation fails", async () => {
		route.value = { name: "homepage" };
		vi.mocked(router.push).mockRejectedValueOnce(new Error("guard"));
		await login();
		expect(useAuthPanel().entering.value).toBe(false);
	});

	it.each([
		["a failed login", "homepage", "failed"],
		["a login that stays on the page", "search", "ok"],
	] as const)("holds no layout after %s", async (_, name, result) => {
		route.value = { name };
		await login(result);
		expect(useAuthPanel().entering.value).toBe(false);
	});

	it("goes to the empire after a login on the homepage", async () => {
		route.value = { name: "homepage" };
		await login();

		expect(router.push).toHaveBeenCalledWith({ path: "/empire" });
	});

	it("goes back to the page that asked for the login", async () => {
		route.value = { name: "homepage" };
		window.history.replaceState({}, "", "/?redirectTo=/manage");
		await login();

		expect(router.push).toHaveBeenCalledWith({ path: "/manage" });
	});

	it.each(["//example.org", "/\\example.org", "https://example.org"])(
		"stays on the site for redirectTo=%s",
		async (target) => {
			route.value = { name: "homepage" };
			window.history.replaceState(
				{},
				"",
				`/?redirectTo=${encodeURIComponent(target)}`
			);
			await login();

			expect(router.push).toHaveBeenCalledWith({ path: "/empire" });
		}
	);

	it("honours a redirectTo plan path", async () => {
		route.value = { name: "homepage" };
		window.history.replaceState({}, "", "/?redirectTo=/plan/x");
		await login();

		expect(router.push).toHaveBeenCalledWith({ path: "/plan/x" });
	});

	it("goes where the panel was opened for, after a redirectTo", async () => {
		route.value = { name: "search" };
		useAuthPanel().open("login", "planet_search_plan", {
			next: "/plan/CH-771a",
		});
		await login();
		expect(router.push).toHaveBeenCalledWith({ path: "/plan/CH-771a" });

		vi.mocked(router.push).mockClear();
		window.history.replaceState({}, "", "/search?redirectTo=/manage");
		useAuthPanel().open("login", "planet_search_plan", {
			next: "/plan/CH-771a",
		});
		await login();
		expect(router.push).toHaveBeenCalledWith({ path: "/manage" });
	});

	it("stays on Planet Search, with its query", async () => {
		route.value = { name: "search" };
		await login();

		expect(router.push).not.toHaveBeenCalled();
	});

	it("stays on a shared plan", async () => {
		route.value = { name: "shared-plan" };
		await login();

		expect(router.push).not.toHaveBeenCalled();
	});

	it("stays and shows the error after a failed login", async () => {
		route.value = { name: "homepage" };
		const wrapper = await login("failed");

		expect(router.push).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain("account.components.login.error");
		expect(wrapper.text()).not.toContain(
			"account.components.login.throttled"
		);
	});

	it("asks to wait instead of blaming the password when throttled", async () => {
		route.value = { name: "homepage" };
		const wrapper = await login("throttled");

		expect(router.push).not.toHaveBeenCalled();
		expect(wrapper.text()).toContain("account.components.login.throttled");
		expect(wrapper.text()).not.toContain("account.components.login.error");
	});

	it("disables and spins the button while the login runs", async () => {
		route.value = { name: "homepage" };
		const pinia = createPinia();
		setActivePinia(pinia);
		let answer!: (r: "ok") => void;
		vi.spyOn(useUserStore(), "performLogin").mockReturnValue(
			new Promise((r) => (answer = r))
		);
		const { wrapper } = await mountComponent(LoginComponent, {}, { pinia });
		const button = () => wrapper.find("button[type=submit]");
		expect(button().attributes("disabled")).toBeDefined();

		const [username, password] = wrapper.findAll("input");
		await username.setValue("test-user");
		await password.setValue("correct-horse-battery");
		expect(button().attributes("disabled")).toBeUndefined();

		await wrapper.find("form").trigger("submit");
		expect(button().attributes("aria-busy")).toBe("true");
		expect(button().attributes("disabled")).toBeDefined();

		answer("ok");
		await flushPromises();
		// on to the empire: busy until it shows
		expect(button().attributes("aria-busy")).toBe("true");
		const [[hook]] = vi.mocked(router.afterEach).mock.calls;
		(hook as () => void)();
		await flushPromises();
		expect(button().attributes("aria-busy")).toBe("false");
	});
});
