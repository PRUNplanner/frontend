import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import LoginComponent from "@/features/account/components/LoginComponent.vue";
import { useUserStore } from "@/stores/userStore";
import { mountComponent } from "@/tests/mountComponent";

const route = vi.hoisted(() => ({ value: { name: "homepage" } }));
vi.mock("@/router", () => ({
	default: { push: vi.fn(), currentRoute: route },
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
		vi.mocked(router.push).mockClear();
		window.history.replaceState({}, "", "/");
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
});
