import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { flushPromises, RouterLinkStub, VueWrapper } from "@vue/test-utils";
import { createPinia, Pinia, setActivePinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import ChangeProfile from "@/features/profile/components/ChangeProfile.vue";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { UserProfile } from "@/features/api/schemas/user.schemas";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
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
		...patch,
	};
}

let pinia: Pinia;

async function mountProfile(stored: UserProfile | undefined, loggedIn = true) {
	const userStore = useUserStore();
	if (loggedIn) {
		userStore.accessToken = "test-access-token";
		userStore.refreshToken = "test-refresh-token";
	}
	userStore.profile = stored;
	return mountComponent(ChangeProfile, {}, { pinia });
}

/** fio key, prun username, email */
const inputs = (wrapper: VueWrapper) => wrapper.findAll("input[type=text]");
const values = (wrapper: VueWrapper) =>
	inputs(wrapper).map((i) => (i.element as HTMLInputElement).value);
const saveButton = (wrapper: VueWrapper) => wrapper.findComponent(PButton);
const saveType = (wrapper: VueWrapper) => saveButton(wrapper).props("type");

async function save(wrapper: VueWrapper) {
	await saveButton(wrapper).trigger("click");
	await flushPromises();
}

const patchBody = (index = 0) => JSON.parse(mock.history.patch.at(index)!.data);

describe("ChangeProfile", () => {
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

	it("shows the stored profile and counts as saved", async () => {
		const { wrapper } = await mountProfile(profile());

		expect(values(wrapper)).toEqual([
			"test-fio-key",
			"test-prun-user",
			"test@example.com",
		]);
		expect(saveType(wrapper)).toBe("primary");
		expect(mock.history.get).toHaveLength(1);
	});

	it("takes over the profile the backend returns on mount", async () => {
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(
			200,
			profile({ prun_username: "renamed-user" })
		);
		const { wrapper } = await mountProfile(profile());

		expect(values(wrapper)).toEqual([
			"test-fio-key",
			"renamed-user",
			"test@example.com",
		]);
		// the refresh isn't a user edit
		expect(saveType(wrapper)).toBe("primary");
	});

	it("follows later changes of the stored profile", async () => {
		const { wrapper } = await mountProfile(profile());

		useUserStore().profile = profile({ email: "new@example.com" });
		await flushPromises();

		expect(values(wrapper).at(2)).toBe("new@example.com");
	});

	it("starts empty and skips the reload when logged out", async () => {
		const { wrapper } = await mountProfile(undefined, false);

		expect(values(wrapper)).toEqual(["", "", ""]);
		expect(mock.history.get).toHaveLength(0);
		expect(saveType(wrapper)).toBe("primary");
	});

	it("marks the button once a field is edited", async () => {
		const { wrapper } = await mountProfile(profile());

		await inputs(wrapper).at(1)!.setValue("other-user");
		await flushPromises();

		expect(saveType(wrapper)).toBe("error");
	});

	it("patches the profile without spaces in the FIO key", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile());
		const { wrapper } = await mountProfile(profile());
		await inputs(wrapper).at(0)!.setValue(" test fio key ");
		await flushPromises();

		await save(wrapper);

		expect(mock.history.patch).toHaveLength(1);
		expect(patchBody()).toEqual({
			fio_apikey: "testfiokey",
			prun_username: "test-prun-user",
			email: "test@example.com",
		});
		expect(trackEvent).toHaveBeenCalledWith("user_profile_change");
		expect(trackEvent).toHaveBeenCalledWith("user_profile_change_fio", {
			active: true,
		});
	});

	it("reloads the profile after saving and counts as saved again", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile());
		const { wrapper } = await mountProfile(profile());
		await inputs(wrapper).at(1)!.setValue("other-user");
		await flushPromises();
		mock.resetHandlers();
		mock.onPatch(PROFILE_URL).reply(
			200,
			profile({ prun_username: "other-user" })
		);
		mock.onGet(PROFILE_URL).reply(
			200,
			profile({ prun_username: "other-user" })
		);

		await save(wrapper);

		// mount + after the patch
		expect(mock.history.get).toHaveLength(2);
		expect(useUserStore().profile?.prun_username).toBe("other-user");
		expect(values(wrapper).at(1)).toBe("other-user");
		expect(saveType(wrapper)).toBe("primary");
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("sends cleared fields as null and reports FIO as inactive", async () => {
		mock.onPatch(PROFILE_URL).reply(
			200,
			profile({ fio_apikey: null, prun_username: null, email: null })
		);
		const { wrapper } = await mountProfile(profile());
		for (const input of inputs(wrapper)) await input.setValue("");
		await flushPromises();

		await save(wrapper);

		expect(patchBody()).toEqual({
			fio_apikey: null,
			prun_username: null,
			email: null,
		});
		expect(trackEvent).toHaveBeenCalledWith("user_profile_change_fio", {
			active: false,
		});
	});

	it("sends missing fields as null", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile());
		// logged out, so the local copy has no fields at all
		const { wrapper } = await mountProfile(undefined, false);

		await save(wrapper);

		expect(patchBody()).toEqual({
			fio_apikey: null,
			prun_username: null,
			email: null,
		});
	});

	it("needs both the FIO key and the username for FIO to be active", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile());
		const { wrapper } = await mountProfile(profile());
		const fioActive = () =>
			vi
				.mocked(trackEvent)
				.mock.calls.filter(([e]) => e === "user_profile_change_fio")
				.map(([, props]) => props);

		await inputs(wrapper).at(1)!.setValue("");
		await save(wrapper);
		await inputs(wrapper).at(1)!.setValue("test-prun-user");
		await inputs(wrapper).at(0)!.setValue("");
		await save(wrapper);

		expect(fioActive()).toEqual([{ active: false }, { active: false }]);
	});

	it("reports FIO as inactive for a key of only spaces", async () => {
		mock.onPatch(PROFILE_URL).reply(200, profile());
		const { wrapper } = await mountProfile(profile());

		await inputs(wrapper).at(0)!.setValue("   ");
		await save(wrapper);

		// without its spaces the key is empty, sent as null
		expect(patchBody()).toMatchObject({ fio_apikey: null });
		expect(trackEvent).toHaveBeenCalledWith("user_profile_change_fio", {
			active: false,
		});
	});

	it("reports FIO as inactive for a key without any username", async () => {
		const noUsername = profile({ prun_username: null });
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(200, noUsername);
		mock.onPatch(PROFILE_URL).reply(200, noUsername);
		const { wrapper } = await mountProfile(noUsername);

		await save(wrapper);

		expect(patchBody()).toMatchObject({ prun_username: null });
		expect(trackEvent).toHaveBeenCalledWith("user_profile_change_fio", {
			active: false,
		});
	});

	it("reports FIO as inactive for a username without any key", async () => {
		const noKey = profile({ fio_apikey: null });
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(200, noKey);
		mock.onPatch(PROFILE_URL).reply(200, noKey);
		const { wrapper } = await mountProfile(noKey);

		await save(wrapper);

		expect(patchBody()).toMatchObject({ fio_apikey: null });
		expect(trackEvent).toHaveBeenCalledWith("user_profile_change_fio", {
			active: false,
		});
	});

	it("spins the button while saving", async () => {
		let answer!: () => void;
		mock.onPatch(PROFILE_URL).reply(
			() =>
				new Promise((r) => {
					answer = () => r([200, profile()]);
				})
		);
		const { wrapper } = await mountProfile(profile());

		await save(wrapper);
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("true");

		answer();
		await flushPromises();
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("keeps the edit unsaved when the patch fails", async () => {
		mock.onPatch(PROFILE_URL).reply(400, {
			email: ["Enter a valid email."],
		});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountProfile(profile());
		await inputs(wrapper).at(2)!.setValue("not-an-email");
		await flushPromises();

		await save(wrapper);

		expect(error).toHaveBeenCalledWith(
			"Error patching user profile",
			expect.any(Error)
		);
		expect(saveType(wrapper)).toBe("error");
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("false");
		expect(values(wrapper).at(2)).toBe("not-an-email");
	});

	it("shows a verified email as a checked, disabled checkbox", async () => {
		const { wrapper } = await mountProfile(profile());
		const checkbox = wrapper.find<HTMLInputElement>("input[type=checkbox]");

		expect(checkbox.element.checked).toBe(true);
		expect(checkbox.element.disabled).toBe(true);
		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
		expect(wrapper.text()).not.toContain(RESEND);
	});

	it("offers verification links for an unverified email", async () => {
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(
			200,
			profile({ is_email_verified: false })
		);
		const { wrapper } = await mountProfile(
			profile({ is_email_verified: false })
		);

		expect(
			wrapper.find<HTMLInputElement>("input[type=checkbox]").element
				.checked
		).toBe(false);
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			"/verify-email"
		);
		expect(wrapper.text()).toContain(RESEND);
		expect(wrapper.text()).not.toContain(REQUESTED);
	});

	it("requests a new verification code once", async () => {
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(
			200,
			profile({ is_email_verified: false })
		);
		mock.onPost(RESEND_URL).reply(200, { detail: "Code sent." });
		const { wrapper } = await mountProfile(
			profile({ is_email_verified: false })
		);

		await wrapper
			.findAll("span")
			.find((s) => s.text() === RESEND)!
			.trigger("click");
		await flushPromises();

		expect(mock.history.post).toHaveLength(1);
		expect(trackEvent).toHaveBeenCalledWith(
			"user_request_email_verification"
		);
		expect(wrapper.text()).toContain(REQUESTED);
		expect(wrapper.text()).not.toContain(RESEND);
	});

	it("logs a failed code request", async () => {
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(
			200,
			profile({ is_email_verified: false })
		);
		mock.onPost(RESEND_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountProfile(
			profile({ is_email_verified: false })
		);

		await wrapper
			.findAll("span")
			.find((s) => s.text() === RESEND)!
			.trigger("click");
		await flushPromises();

		expect(error).toHaveBeenCalledWith(
			"Error resending verification code",
			expect.any(Error)
		);
		// the link stays, so the user can ask again
		expect(wrapper.text()).toContain(RESEND);
		expect(wrapper.text()).not.toContain(REQUESTED);
	});
});
