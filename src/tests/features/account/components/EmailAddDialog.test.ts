import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import { toasts } from "@/ui/useToast";
import EmailAddDialog from "@/features/account/components/EmailAddDialog.vue";
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
const VERIFY_URL = /user\/verify_email\/$/;
const RESEND_URL = /user\/request_email_verification\/$/;

const TITLE = "account.email_dialog.title";
const ERRORS = "account.email_dialog.errors";

function profile(patch: Partial<UserProfile> = {}): UserProfile {
	return {
		id: 1,
		username: "test-user",
		email: null,
		is_email_verified: false,
		fio_apikey: "test-fio-key",
		prun_username: "test-prun-user",
		fio_status: "ok",
		fio_last_refreshed_at: null,
		...patch,
	};
}

let pinia: Pinia;

// the modal is teleported to the body
const body = () => new DOMWrapper(document.body);
const input = () => body().find<HTMLInputElement>("input");
const byTestId = (id: string) => body().find(`[data-testid=${id}]`);
const button = (label: string) =>
	body()
		.findAll("button")
		.find((b) => b.text() === `account.email_dialog.buttons.${label}`)!;

async function click(el: DOMWrapper<Element>) {
	await el.trigger("click");
	await flushPromises();
}

async function mountDialog(
	stored: UserProfile,
	props: Record<string, unknown> = {}
) {
	useUserStore().profile = stored;
	return mountComponent(
		EmailAddDialog,
		{ show: true, source: "banner", ...props },
		{ pinia }
	);
}

describe("EmailAddDialog", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		mock.reset();
		toasts.value = [];
		vi.mocked(trackEvent).mockClear();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("saves only the email, then asks for the code", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile({ email: "new@ex.com" }));
		await mountDialog(profile());
		expect(body().text()).toContain(`${TITLE}.email`);

		await input().setValue("not-an-email");
		expect(
			byTestId("email-dialog-save").attributes("disabled")
		).toBeDefined();

		await input().setValue("new@ex.com");
		await click(byTestId("email-dialog-save"));

		expect(JSON.parse(mock.history.patch[0].data)).toEqual({
			email: "new@ex.com",
		});
		expect(trackEvent).toHaveBeenCalledWith("account:email_add", {
			is_success: true,
		});
		expect(body().text()).toContain(`${TITLE}.code`);
	});

	it.each([
		[400, { email: ["email_taken"] }, "email_taken"],
		[400, { email: ["Enter a valid email address."] }, "invalid_email"],
		[429, {}, "throttled"],
		[500, {}, "unknown"],
	])("shows the error of a %i %o", async (status, data, reason) => {
		mock.onPatch(PROFILE_URL).reply(status, data);
		await mountDialog(profile());

		await input().setValue("taken@ex.com");
		await click(byTestId("email-dialog-save"));

		expect(body().text()).toContain(`${ERRORS}.${reason}`);
		expect(body().text()).toContain(`${TITLE}.email`);
		expect(trackEvent).toHaveBeenCalledWith("account:email_add", {
			is_success: false,
			reason,
		});
	});

	it("submits the email and the code with Enter", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile({ email: "new@ex.com" }));
		mock.onPost(VERIFY_URL).reply(200, { detail: "x", code: "verified" });
		await mountDialog(profile());

		await input().setValue("new@ex.com");
		await input().trigger("keydown", { key: "Enter" });
		await flushPromises();
		expect(mock.history.patch).toHaveLength(1);
		expect(body().text()).toContain(`${TITLE}.code`);

		await input().setValue("ABCD1234");
		await input().trigger("keydown", { key: "Enter" });
		await flushPromises();
		expect(mock.history.post).toHaveLength(1);
		expect(body().text()).toContain(`${TITLE}.done`);
	});

	it("opens at the code step and upper-cases the code", async () => {
		await mountDialog(profile({ email: "a@ex.com" }), {
			initialStep: "code",
		});
		expect(body().text()).toContain(`${TITLE}.code`);

		await input().setValue("ab cd1234xyz");

		expect(input().element.value).toBe("ABCD1234");
	});

	it.each(["invalid", "expired", "no_code"])(
		"shows the %s text and stays at the code step",
		async (code) => {
			mock.onPost(VERIFY_URL).reply(400, { detail: "x", code });
			await mountDialog(profile({ email: "a@ex.com" }), {
				initialStep: "code",
			});

			await input().setValue("ABCD1234");
			await click(byTestId("email-dialog-confirm"));

			expect(body().text()).toContain(`${ERRORS}.${code}`);
			expect(body().text()).toContain(`${TITLE}.code`);
			expect(trackEvent).toHaveBeenCalledWith("account:email_verify", {
				is_success: false,
				source: "banner",
				reason: code,
			});
		}
	);

	it.each(["verified", "already_verified"])(
		"finishes on %s with a toast from the banner",
		async (code) => {
			if (code === "verified")
				mock.onPost(VERIFY_URL).reply(200, { detail: "x", code });
			else mock.onPost(VERIFY_URL).reply(400, { detail: "x", code });
			await mountDialog(profile({ email: "a@ex.com" }), {
				initialStep: "code",
			});

			await input().setValue("ABCD1234");
			await click(byTestId("email-dialog-confirm"));

			expect(body().text()).toContain(`${TITLE}.done`);
			expect(toasts.value.map((t) => t.text)).toEqual([
				"account.email_dialog.confirmed_toast",
			]);
			expect(trackEvent).toHaveBeenCalledWith("account:email_verify", {
				is_success: true,
				source: "banner",
			});
		}
	);

	it("shows no toast when opened from Profile", async () => {
		mock.onPost(VERIFY_URL).reply(200, { detail: "x", code: "verified" });
		await mountDialog(profile({ email: "a@ex.com" }), {
			initialStep: "code",
			source: "profile",
		});

		await input().setValue("ABCD1234");
		await click(byTestId("email-dialog-confirm"));

		expect(body().text()).toContain(`${TITLE}.done`);
		expect(toasts.value).toEqual([]);
	});

	it("sends a new code and goes back to change the email", async () => {
		mock.onPost(RESEND_URL).reply(200, { detail: "x", code: "sent" });
		await mountDialog(profile({ email: "a@ex.com" }), {
			initialStep: "code",
		});

		await click(byTestId("email-dialog-resend"));
		expect(mock.history.post).toHaveLength(1);
		expect(toasts.value.map((t) => t.text)).toEqual([
			"account.email_nudge.code_sent",
		]);

		await click(button("change_email"));
		expect(body().text()).toContain(`${TITLE}.email`);
		expect(input().element.value).toBe("a@ex.com");
	});
});
