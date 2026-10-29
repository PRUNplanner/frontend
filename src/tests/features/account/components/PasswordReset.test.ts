import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import PasswordReset from "@/features/account/components/PasswordReset.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const RESET_URL = /user\/password_reset\/$/;

const THROTTLED = "account.components.password_reset.throttled";
const ERROR = "account.components.password_reset.error";

async function reset(): Promise<VueWrapper> {
	const { wrapper } = await mountComponent(PasswordReset, {
		resetCode: "test-code",
	});
	const [email, , password] = wrapper.findAll("input");
	await email.setValue("test@example.com");
	await password.setValue("correct-horse-battery");
	await wrapper.find("form").trigger("submit");
	await flushPromises();
	return wrapper;
}

describe("PasswordReset", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("keeps the button disabled for an invalid email", async () => {
		const { wrapper } = await mountComponent(PasswordReset, {
			resetCode: "test-code",
		});
		const [email, , password] = wrapper.findAll("input");
		const button = () => wrapper.find("button");
		await password.setValue("correct-horse-battery");

		for (const invalid of ["", "test.example.com", "test@"]) {
			await email.setValue(invalid);
			expect(button().attributes("disabled")).toBeDefined();
		}
		await email.setValue("test@example.com");
		expect(button().attributes("disabled")).toBeUndefined();
		await password.setValue("short");
		expect(button().attributes("disabled")).toBeDefined();

		await email.setValue("test.example.com");
		await password.setValue("correct-horse-battery");
		await wrapper.find("form").trigger("submit");
		await flushPromises();
		expect(mock.history.post).toHaveLength(0);
	});

	it("shows the throttled message on a 429", async () => {
		mock.onPost(RESET_URL).reply(429, {
			detail: "Request was throttled.",
		});
		const wrapper = await reset();

		expect(wrapper.text()).toContain(THROTTLED);
		expect(wrapper.text()).not.toContain(ERROR);
	});

	it("keeps the check-your-input message for other errors", async () => {
		mock.onPost(RESET_URL).reply(400, { detail: "Invalid code." });
		const wrapper = await reset();

		expect(wrapper.text()).toContain(ERROR);
		expect(wrapper.text()).not.toContain(THROTTLED);
	});
});
