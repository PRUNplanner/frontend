import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import {
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import ProfileEmail from "@/features/profile/components/ProfileEmail.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { UserProfile } from "@/features/api/schemas/user.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const PROFILE_URL = /user\/profile\/$/;
const RESEND_URL = /user\/request_email_verification\/$/;

const RESEND = "profile.change_profile.buttons.resend_code";
const REQUESTED = "profile.change_profile.buttons.code_requested";

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

const input = (wrapper: VueWrapper) =>
	wrapper.find<HTMLInputElement>("input");
const tag = (wrapper: VueWrapper) =>
	wrapper.find("[data-testid=email-verified]");
const saveButton = (wrapper: VueWrapper) => wrapper.findComponent(PButton);
const resend = (wrapper: VueWrapper) =>
	wrapper.findAll("button").find((b) => b.text() === RESEND);

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

	it("shows the stored email as verified, without verify links", async () => {
		const { wrapper } = await mountEmail(profile());

		expect(input(wrapper).element.value).toBe("test@example.com");
		expect(tag(wrapper).text()).toBe("profile.account.verified");
		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
		expect(resend(wrapper)).toBeUndefined();
		expect(saveButton(wrapper).props("type")).toBe("secondary");
	});

	it("shows neither tag nor links without an email", async () => {
		const { wrapper } = await mountEmail(
			profile({ email: null, is_email_verified: false })
		);

		expect(tag(wrapper).exists()).toBe(false);
		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
	});

	it("offers verification links for an unverified email", async () => {
		const { wrapper } = await mountEmail(
			profile({ is_email_verified: false })
		);

		expect(tag(wrapper).text()).toBe("profile.account.not_verified");
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			"/verify-email"
		);
		expect(resend(wrapper)).toBeDefined();
		expect(wrapper.text()).not.toContain(REQUESTED);
	});

	it("requests a new verification code once", async () => {
		mock.onPost(RESEND_URL).reply(200, { detail: "Code sent." });
		const { wrapper } = await mountEmail(
			profile({ is_email_verified: false })
		);

		await resend(wrapper)!.trigger("click");
		await flushPromises();

		expect(mock.history.post).toHaveLength(1);
		expect(trackEvent).toHaveBeenCalledWith(
			"account:email_verify_request"
		);
		expect(wrapper.text()).toContain(REQUESTED);
		expect(resend(wrapper)).toBeUndefined();
	});

	it("logs a failed code request and keeps the link", async () => {
		mock.onPost(RESEND_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountEmail(
			profile({ is_email_verified: false })
		);

		await resend(wrapper)!.trigger("click");
		await flushPromises();

		expect(error).toHaveBeenCalledWith(
			"Error resending verification code",
			expect.any(Error)
		);
		expect(resend(wrapper)).toBeDefined();
		expect(wrapper.text()).not.toContain(REQUESTED);
	});

	it("patches the email with the stored FIO fields", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile());
		const { wrapper } = await mountEmail(profile());
		await input(wrapper).setValue("new@example.com");

		expect(saveButton(wrapper).props("type")).toBe("primary");
		await save(wrapper);

		expect(JSON.parse(mock.history.patch[0].data)).toEqual({
			fio_apikey: "test-fio-key",
			prun_username: "test-prun-user",
			email: "new@example.com",
		});
		expect(trackEvent).toHaveBeenCalledWith("account:profile_update");
	});

	it("sends a cleared email as null", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile({ email: null }));
		const { wrapper } = await mountEmail(profile());
		await input(wrapper).setValue("");

		await save(wrapper);

		expect(JSON.parse(mock.history.patch[0].data)).toMatchObject({
			email: null,
		});
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
