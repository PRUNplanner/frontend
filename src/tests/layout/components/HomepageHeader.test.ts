import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterLinkStub } from "@vue/test-utils";

import HomepageHeader from "@/layout/components/HomepageHeader.vue";
import LoginComponent from "@/features/account/components/LoginComponent.vue";
import RegistrationComponent from "@/features/account/components/RegistrationComponent.vue";
import { PButton } from "@/ui";
import { useAuthPanel } from "@/features/account/useAuthPanel";
import { mountComponent } from "@/tests/mountComponent";

// the forms have their own tests: only their presence matters here
vi.mock("@/features/account/components/LoginComponent.vue", () => ({
	default: { name: "LoginComponent", template: "<p>login form</p>" },
}));
vi.mock("@/features/account/components/RegistrationComponent.vue", () => ({
	default: {
		name: "RegistrationComponent",
		template: "<p>registration form</p>",
	},
}));

describe("HomepageHeader", () => {
	const panel = useAuthPanel();

	beforeEach(() => {
		panel.close();
		// jsdom has no scrolling, open() asks for it
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	it("opens one panel at a time from the login and register buttons", async () => {
		const { wrapper } = await mountComponent(HomepageHeader);
		const login = wrapper.find("button[type=button]");
		const register = wrapper.findComponent(PButton);
		expect(login.text()).toBe("homepage.navigation.login");
		expect(register.text()).toBe("homepage.navigation.registration");
		expect(wrapper.findComponent(LoginComponent).exists()).toBe(false);
		expect(wrapper.findComponent(RegistrationComponent).exists()).toBe(
			false
		);

		await login.trigger("click");
		expect(wrapper.findComponent(LoginComponent).exists()).toBe(true);
		expect(wrapper.findComponent(RegistrationComponent).exists()).toBe(
			false
		);

		await register.trigger("click");
		expect(wrapper.findComponent(LoginComponent).exists()).toBe(false);
		expect(wrapper.findComponent(RegistrationComponent).exists()).toBe(
			true
		);

		// the same button again folds its panel
		await register.trigger("click");
		expect(wrapper.findComponent(RegistrationComponent).exists()).toBe(
			false
		);
	});

	it("shows a panel that was opened from elsewhere", async () => {
		panel.open("login");
		const { wrapper } = await mountComponent(HomepageHeader);

		expect(wrapper.findComponent(LoginComponent).exists()).toBe(true);
	});

	it("closes both panels when the header leaves", async () => {
		panel.open("registration");
		const { wrapper } = await mountComponent(HomepageHeader);

		wrapper.unmount();

		expect(panel.showLogin.value).toBe(false);
		expect(panel.showRegistration.value).toBe(false);
	});

	it.each([
		[true, 1],
		[false, 0],
	])(
		"with showHeader=%s links the name back to the start: %s heading(s) in the link",
		async (showHeader, headings) => {
			const { wrapper } = await mountComponent(HomepageHeader, {
				showHeader,
			});

			const link = wrapper.findComponent(RouterLinkStub);
			expect(link.props("to")).toBe("/");
			expect(link.findAll("h2")).toHaveLength(headings);
		}
	);

	it("shows the link heading by default", async () => {
		const { wrapper } = await mountComponent(HomepageHeader);

		expect(wrapper.findComponent(RouterLinkStub).find("h2").text()).toBe(
			"PRUNplanner"
		);
	});
});
