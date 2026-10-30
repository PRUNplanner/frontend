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
import { createPinia, type Pinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { reportError, trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import ProfileEmail from "@/features/profile/components/ProfileEmail.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { UserProfile } from "@/features/api/schemas/user.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const PROFILE_URL = /user\/profile\/$/;
const RESEND_URL = /user\/request_email_verification\/$/;

const RECOVERY = "profile.change_profile.recovery";
const CODE_STEP = "account.email_dialog.title.code";

function profile(patch: Partial<UserProfile> = {}): UserProfile {
	return {
		id: 1,
		username: "test-user",
		email: "test@example.com",
		is_email_verified: true,
		fio_apikey: "test-fio-key",
		prun_username: "test-prun-user",
		fio_status: "ok",
		fio_last_refreshed_at: null,
		...patch,
	};
}

let pinia: Pinia;

async function mountEmail(stored: UserProfile | undefined) {
	useUserStore().profile = stored;
	return mountComponent(ProfileEmail, {}, { pinia });
}

const input = (wrapper: VueWrapper) => wrapper.find<HTMLInputElement>("input");
const tag = (wrapper: VueWrapper) =>
	wrapper.find("[data-testid=email-recovery]");
const enterCode = (wrapper: VueWrapper) =>
	wrapper.find("[data-testid=email-enter-code]");
const resend = (wrapper: VueWrapper) =>
	wrapper.find("[data-testid=email-resend]");
const saveButton = (wrapper: VueWrapper) =>
	wrapper
		.findAllComponents({ name: "PButton" })
		.find((b) => b.text() === "profile.buttons.save")!;

async function save(wrapper: VueWrapper) {
	await saveButton(wrapper).trigger("click");
	await flushPromises();
}

describe("ProfileEmail", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		mock.reset();
		mock.onGet(PROFILE_URL).reply(200, profile());
		vi.mocked(trackEvent).mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		["a confirmed email", profile(), "ready"],
		[
			"no email",
			profile({ email: null, is_email_verified: false }),
			"not_set_up",
		],
		[
			"an unconfirmed email",
			profile({ is_email_verified: false }),
			"waiting",
		],
	])("shows the recovery status for %s", async (_, stored, key) => {
		const { wrapper } = await mountEmail(stored);

		expect(tag(wrapper).text()).toBe(`${RECOVERY}.${key}`);
		expect(enterCode(wrapper).exists()).toBe(key === "waiting");
		expect(resend(wrapper).exists()).toBe(key === "waiting");
		if (key !== "waiting")
			expect(wrapper.text()).toContain(`${RECOVERY}.${key}_info`);
	});

	it("opens the dialog at the code step from Enter code", async () => {
		const { wrapper } = await mountEmail(
			profile({ is_email_verified: false })
		);

		await enterCode(wrapper).trigger("click");
		await flushPromises();

		expect(document.body.textContent).toContain(CODE_STEP);
	});

	it("sends a new code, then opens the dialog at the code step", async () => {
		mock.onPost(RESEND_URL).reply(200, { detail: "Code sent." });
		const { wrapper } = await mountEmail(
			profile({ is_email_verified: false })
		);

		await resend(wrapper).trigger("click");
		await flushPromises();

		expect(mock.history.post).toHaveLength(1);
		expect(trackEvent).toHaveBeenCalledWith("account:email_verify_request");
		expect(document.body.textContent).toContain(CODE_STEP);
	});

	it("reports a failed code request and keeps the dialog closed", async () => {
		mock.onPost(RESEND_URL).reply(500);
		const { wrapper } = await mountEmail(
			profile({ is_email_verified: false })
		);

		await resend(wrapper).trigger("click");
		await flushPromises();

		expect(reportError).toHaveBeenCalledWith(expect.any(Error));
		expect(document.body.textContent).not.toContain(CODE_STEP);
	});

	it("patches the email alone and says a code was sent", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile());
		const { wrapper } = await mountEmail(profile());
		await input(wrapper).setValue("new@example.com");

		expect(saveButton(wrapper).props("type")).toBe("primary");
		await save(wrapper);

		expect(JSON.parse(mock.history.patch[0].data)).toEqual({
			email: "new@example.com",
		});
		expect(wrapper.find("[data-testid=email-code-sent]").exists()).toBe(
			true
		);
	});

	it("sends a cleared email as null, without the code notice", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile({ email: null }));
		const { wrapper } = await mountEmail(profile());
		await input(wrapper).setValue("");

		await save(wrapper);

		expect(JSON.parse(mock.history.patch[0].data)).toEqual({ email: null });
		expect(wrapper.find("[data-testid=email-code-sent]").exists()).toBe(
			false
		);
	});

	it("shows an address used by another account under the field", async () => {
		mock.onPatch(PROFILE_URL).reply(400, { email: ["email_taken"] });
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountEmail(profile());
		await input(wrapper).setValue("taken@example.com");

		await save(wrapper);

		expect(wrapper.text()).toContain("profile.change_profile.email_taken");
		expect(wrapper.find("[role=alert]").exists()).toBe(false);
		expect(wrapper.find("[data-testid=email-code-sent]").exists()).toBe(
			false
		);
	});

	it("shows any other email field error as the invalid text", async () => {
		mock.onPatch(PROFILE_URL).reply(400, {
			email: ["Enter a valid email address."],
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountEmail(profile());
		await input(wrapper).setValue("x@y");

		await save(wrapper);

		expect(wrapper.text()).toContain(
			"account.email_dialog.errors.invalid_email"
		);
		expect(wrapper.text()).not.toContain("Enter a valid email address.");
	});

	it("follows later changes of the stored email", async () => {
		const { wrapper } = await mountEmail(profile());

		useUserStore().profile = profile({ email: "other@example.com" });
		await flushPromises();

		expect(input(wrapper).element.value).toBe("other@example.com");
		expect(saveButton(wrapper).props("type")).toBe("secondary");
	});

	it.each([
		[429, "profile.change_profile.throttled"],
		[400, "profile.change_profile.fio_errors.unknown"],
	])("shows an alert when the patch answers %i", async (status, text) => {
		mock.onPatch(PROFILE_URL).reply(status, {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountEmail(profile());
		await input(wrapper).setValue("not-an-email");

		await save(wrapper);

		expect(wrapper.find("[role=alert]").text()).toBe(text);
		expect(input(wrapper).element.value).toBe("not-an-email");

		mock.resetHandlers();
		mock.onPatch(PROFILE_URL).reply(200, profile());
		await save(wrapper);
		expect(wrapper.find("[role=alert]").exists()).toBe(false);
	});
});
