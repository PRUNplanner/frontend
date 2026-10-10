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
import RequestPasswordReset from "@/features/account/components/RequestPasswordReset.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));
import { trackEvent } from "@/lib/analytics/useAnalytics";

const mock = new AxiosMockAdapter(apiService.client);
const REQUEST_URL = /user\/request_password_reset\/$/;

const SENT = "If the email is known, a code is on its way";

async function mountForm(): Promise<VueWrapper> {
	const { wrapper } = await mountComponent(RequestPasswordReset);
	return wrapper;
}

const button = (wrapper: VueWrapper) => wrapper.find("button");

async function request(
	wrapper: VueWrapper,
	email = "test@example.com"
): Promise<void> {
	await wrapper.find("input").setValue(email);
	await button(wrapper).trigger("click");
	await flushPromises();
}

describe("RequestPasswordReset", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.mocked(trackEvent).mockClear();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("keeps the button disabled until the email is valid", async () => {
		const wrapper = await mountForm();
		const input = wrapper.find("input");

		expect(button(wrapper).attributes("disabled")).toBeDefined();
		await input.setValue("test.example.com");
		expect(button(wrapper).attributes("disabled")).toBeDefined();
		await input.setValue("test@");
		expect(button(wrapper).attributes("disabled")).toBeDefined();
		await input.setValue("test@example.com");
		expect(button(wrapper).attributes("disabled")).toBeUndefined();
		await input.setValue("");
		expect(button(wrapper).attributes("disabled")).toBeDefined();
	});

	it("sends no request for an invalid email", async () => {
		const wrapper = await mountForm();
		await request(wrapper, "test.example.com");
		await request(wrapper, "test@");

		expect(mock.history.post).toHaveLength(0);
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("posts only the email and shows the backend's answer", async () => {
		mock.onPost(REQUEST_URL).reply(200, { detail: SENT });
		const wrapper = await mountForm();
		await request(wrapper);

		expect(mock.history.post).toHaveLength(1);
		expect(JSON.parse(mock.history.post[0].data)).toEqual({
			email: "test@example.com",
		});
		expect(trackEvent).toHaveBeenCalledWith(
			"account:password_reset_request"
		);
		// the component appends the full stop
		expect(wrapper.find(".text-prunplanner").text()).toBe(`${SENT}.`);
		expect(button(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("shows the spinner while the request is in flight", async () => {
		let release!: () => void;
		mock.onPost(REQUEST_URL).reply(
			() =>
				new Promise((resolve) => {
					release = () => resolve([200, { detail: SENT }]);
				})
		);
		const wrapper = await mountForm();
		await request(wrapper);

		expect(button(wrapper).attributes("aria-busy")).toBe("true");
		expect(wrapper.find(".text-prunplanner").exists()).toBe(false);

		release();
		await flushPromises();
		expect(button(wrapper).attributes("aria-busy")).toBe("false");
		expect(wrapper.find(".text-prunplanner").text()).toBe(`${SENT}.`);
	});

	it("clears the previous answer when requesting again", async () => {
		let release!: () => void;
		mock.onPost(REQUEST_URL).replyOnce(200, { detail: SENT });
		mock.onPost(REQUEST_URL).replyOnce(
			() =>
				new Promise((resolve) => {
					release = () => resolve([200, { detail: "Sent again" }]);
				})
		);
		const wrapper = await mountForm();
		await request(wrapper);
		expect(wrapper.find(".text-prunplanner").text()).toBe(`${SENT}.`);

		await request(wrapper, "other@example.com");
		expect(mock.history.post).toHaveLength(2);
		expect(JSON.parse(mock.history.post[1].data)).toEqual({
			email: "other@example.com",
		});
		expect(wrapper.find(".text-prunplanner").exists()).toBe(false);

		release();
		await flushPromises();
		expect(wrapper.find(".text-prunplanner").text()).toBe("Sent again.");
	});

	it("sends one request for a double click", async () => {
		let release!: () => void;
		mock.onPost(REQUEST_URL).reply(
			() =>
				new Promise((resolve) => {
					release = () => resolve([200, { detail: SENT }]);
				})
		);
		const wrapper = await mountForm();
		await request(wrapper);
		await button(wrapper).trigger("click");
		await flushPromises();

		expect(button(wrapper).attributes("disabled")).toBeDefined();
		expect(mock.history.post).toHaveLength(1);
		release();
		await flushPromises();
	});

	const alert = (wrapper: VueWrapper) => wrapper.find('[role="alert"]');

	it("says the request failed on a server error", async () => {
		mock.onPost(REQUEST_URL).reply(500);
		const wrapper = await mountForm();
		await request(wrapper);

		expect(alert(wrapper).text()).toBe(
			"account.components.request_password_reset.error"
		);
		expect(button(wrapper).attributes("aria-busy")).toBe("false");
		expect(button(wrapper).attributes("disabled")).toBeUndefined();
		expect(wrapper.find(".text-prunplanner").exists()).toBe(false);
	});

	it("asks to wait on a 429 and clears it on the next try", async () => {
		mock.onPost(REQUEST_URL)
			.replyOnce(429, { detail: "Request was throttled." })
			.onPost(REQUEST_URL)
			.reply(200, { detail: SENT });
		const wrapper = await mountForm();
		await request(wrapper);

		expect(alert(wrapper).text()).toBe(
			"account.components.request_password_reset.throttled"
		);

		await request(wrapper);
		expect(alert(wrapper).exists()).toBe(false);
		expect(wrapper.find(".text-prunplanner").text()).toBe(`${SENT}.`);
	});
});
