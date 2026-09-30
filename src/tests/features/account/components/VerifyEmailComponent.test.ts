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
import { trackEvent } from "@/lib/analytics/useAnalytics";
import VerifyEmailComponent from "@/features/account/components/VerifyEmailComponent.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const VERIFY_URL = /user\/verify_email\/$/;

const OK = "account.components.verify_email.result.ok";
const ERROR = "account.components.verify_email.result.error";

const input = (wrapper: VueWrapper) => wrapper.find("input");
const sendButton = (wrapper: VueWrapper) => wrapper.find("button");

async function send(wrapper: VueWrapper) {
	await sendButton(wrapper).trigger("click");
	await flushPromises();
}

describe("VerifyEmailComponent", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.mocked(trackEvent).mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("starts empty and disabled without a code", async () => {
		const { wrapper } = await mountComponent(VerifyEmailComponent);

		expect(input(wrapper).element.value).toBe("");
		expect(sendButton(wrapper).element.disabled).toBe(true);
		expect(wrapper.text()).not.toContain(OK);
		expect(wrapper.text()).not.toContain(ERROR);
	});

	it("prefills the code from the link", async () => {
		const { wrapper } = await mountComponent(VerifyEmailComponent, {
			verifyCode: "test-code-123",
		});

		expect(input(wrapper).element.value).toBe("test-code-123");
		expect(sendButton(wrapper).element.disabled).toBe(false);
	});

	it("enables sending once a code is typed, and not for an empty one", async () => {
		const { wrapper } = await mountComponent(VerifyEmailComponent);

		await input(wrapper).setValue("x");
		expect(sendButton(wrapper).element.disabled).toBe(false);
		await input(wrapper).setValue("");
		expect(sendButton(wrapper).element.disabled).toBe(true);
	});

	it("posts the code, shows the success and clears the input", async () => {
		mock.onPost(VERIFY_URL).reply(200, { detail: "Email verified." });
		const { wrapper } = await mountComponent(VerifyEmailComponent);
		await input(wrapper).setValue("test-code-123");

		await send(wrapper);

		expect(mock.history.post).toHaveLength(1);
		expect(JSON.parse(mock.history.post.at(0)!.data)).toEqual({
			code: "test-code-123",
		});
		expect(wrapper.text()).toContain(OK);
		expect(wrapper.text()).not.toContain(ERROR);
		expect(input(wrapper).element.value).toBe("");
		expect(sendButton(wrapper).element.disabled).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("account:email_verify", {
			is_success: true,
		});
	});

	it("shows the error for a rejected code and clears the input", async () => {
		mock.onPost(VERIFY_URL).reply(400, { detail: "Invalid code." });
		const { wrapper } = await mountComponent(VerifyEmailComponent, {
			verifyCode: "wrong-code",
		});

		await send(wrapper);

		expect(wrapper.text()).toContain(ERROR);
		expect(wrapper.text()).not.toContain(OK);
		expect(input(wrapper).element.value).toBe("");
		expect(trackEvent).toHaveBeenCalledWith("account:email_verify", {
			is_success: false,
		});
	});

	it("replaces an earlier error with the success of a retry", async () => {
		mock.onPost(VERIFY_URL).replyOnce(400, { detail: "Invalid code." });
		mock.onPost(VERIFY_URL).replyOnce(200, { detail: "Email verified." });
		const { wrapper } = await mountComponent(VerifyEmailComponent, {
			verifyCode: "wrong-code",
		});
		await send(wrapper);
		expect(wrapper.text()).toContain(ERROR);

		await input(wrapper).setValue("test-code-123");
		await send(wrapper);

		expect(wrapper.text()).toContain(OK);
		expect(wrapper.text()).not.toContain(ERROR);
	});

	it("spins the button while verifying", async () => {
		let answer!: () => void;
		mock.onPost(VERIFY_URL).reply(
			() =>
				new Promise((r) => {
					answer = () => r([200, { detail: "Email verified." }]);
				})
		);
		const { wrapper } = await mountComponent(VerifyEmailComponent, {
			verifyCode: "test-code-123",
		});

		await send(wrapper);
		expect(sendButton(wrapper).attributes("aria-busy")).toBe("true");
		// the code stays until the answer arrives
		expect(input(wrapper).element.value).toBe("test-code-123");

		answer();
		await flushPromises();
		expect(sendButton(wrapper).attributes("aria-busy")).toBe("false");
		expect(wrapper.text()).toContain(OK);
	});
});
