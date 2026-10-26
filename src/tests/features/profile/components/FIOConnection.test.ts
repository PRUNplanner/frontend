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
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useUserStore } from "@/stores/userStore";
import FIOConnection from "@/features/profile/components/FIOConnection.vue";
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

async function mountProfile(stored: UserProfile | undefined, loggedIn = true) {
	const userStore = useUserStore();
	if (loggedIn) {
		userStore.accessToken = "test-access-token";
		userStore.refreshToken = "test-refresh-token";
	}
	userStore.profile = stored;
	return mountComponent(FIOConnection, {}, { pinia });
}

/** fio key, prun username */
const inputs = (wrapper: VueWrapper) => [
	wrapper.find("input[type=password]"),
	wrapper.find("input[type=text]"),
];
const values = (wrapper: VueWrapper) =>
	inputs(wrapper).map((i) => (i.element as HTMLInputElement).value);
const saveButton = (wrapper: VueWrapper) => wrapper.findComponent(PButton);
const saveType = (wrapper: VueWrapper) => saveButton(wrapper).props("type");

async function save(wrapper: VueWrapper) {
	await saveButton(wrapper).trigger("click");
	await flushPromises();
}

const patchBody = (index = 0) => JSON.parse(mock.history.patch.at(index)!.data);

describe("FIOConnection", () => {
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
		]);
		expect(saveType(wrapper)).toBe("secondary");
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
		]);
		// the refresh isn't a user edit
		expect(saveType(wrapper)).toBe("secondary");
	});

	it("follows later changes of the stored profile", async () => {
		const { wrapper } = await mountProfile(profile());

		useUserStore().profile = profile({ prun_username: "new-user" });
		await flushPromises();

		expect(values(wrapper).at(1)).toBe("new-user");
	});

	it("starts empty and skips the reload when logged out", async () => {
		const { wrapper } = await mountProfile(undefined, false);

		expect(values(wrapper)).toEqual(["", ""]);
		expect(mock.history.get).toHaveLength(0);
		expect(saveType(wrapper)).toBe("secondary");
	});

	it("makes the button primary once a field is edited", async () => {
		const { wrapper } = await mountProfile(profile());

		await inputs(wrapper).at(1)!.setValue("other-user");
		await flushPromises();

		expect(saveType(wrapper)).toBe("primary");
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
		// FIO was active before
		expect(trackEvent).not.toHaveBeenCalledWith("account:fio_link");
	});

	it("reports the first FIO link once the profile is saved", async () => {
		const noFIO = profile({ fio_apikey: null, prun_username: null });
		mock.onGet(PROFILE_URL).reply(200, noFIO);
		mock.onPatch(PROFILE_URL).reply(200, profile());
		const { wrapper } = await mountProfile(noFIO);
		await inputs(wrapper).at(0)!.setValue("key");
		await inputs(wrapper).at(1)!.setValue("PRUN");
		await flushPromises();

		await save(wrapper);

		expect(trackEvent).toHaveBeenCalledWith("account:fio_link");
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
		expect(saveType(wrapper)).toBe("secondary");
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("sends cleared fields as null and keeps the stored email", async () => {
		mock.onPatch(PROFILE_URL).reply(
			200,
			profile({ fio_apikey: null, prun_username: null })
		);
		const { wrapper } = await mountProfile(profile());
		for (const input of inputs(wrapper)) await input.setValue("");
		await flushPromises();

		await save(wrapper);

		expect(patchBody()).toEqual({
			fio_apikey: null,
			prun_username: null,
			email: "test@example.com",
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
		const noFIO = profile({ fio_apikey: null, prun_username: null });
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(200, noFIO);
		mock.onPatch(PROFILE_URL).reply(200, noFIO);
		const { wrapper } = await mountProfile(noFIO);

		await inputs(wrapper).at(0)!.setValue("key");
		await save(wrapper);
		await inputs(wrapper).at(0)!.setValue("");
		await inputs(wrapper).at(1)!.setValue("PRUN");
		await save(wrapper);

		expect(mock.history.patch).toHaveLength(2);
		expect(trackEvent).not.toHaveBeenCalledWith("account:fio_link");
	});

	it("reports FIO as inactive for a key of only spaces", async () => {
		const noKey = profile({ fio_apikey: null });
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(200, noKey);
		mock.onPatch(PROFILE_URL).reply(200, noKey);
		const { wrapper } = await mountProfile(noKey);

		await inputs(wrapper).at(0)!.setValue("   ");
		await save(wrapper);

		// without its spaces the key is empty, sent as null
		expect(patchBody()).toMatchObject({ fio_apikey: null });
		expect(trackEvent).not.toHaveBeenCalledWith("account:fio_link");
	});

	it("reports FIO as inactive for a key without any username", async () => {
		const noUsername = profile({ prun_username: null });
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(200, noUsername);
		mock.onPatch(PROFILE_URL).reply(200, noUsername);
		const { wrapper } = await mountProfile(noUsername);

		await save(wrapper);

		expect(patchBody()).toMatchObject({ prun_username: null });
		expect(trackEvent).not.toHaveBeenCalledWith("account:fio_link");
	});

	it("reports FIO as inactive for a username without any key", async () => {
		const noKey = profile({ fio_apikey: null });
		mock.resetHandlers();
		mock.onGet(PROFILE_URL).reply(200, noKey);
		mock.onPatch(PROFILE_URL).reply(200, noKey);
		const { wrapper } = await mountProfile(noKey);

		await save(wrapper);

		expect(patchBody()).toMatchObject({ fio_apikey: null });
		expect(trackEvent).not.toHaveBeenCalledWith("account:fio_link");
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
		mock.onPatch(PROFILE_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountProfile(profile());
		await inputs(wrapper).at(1)!.setValue("other-user");
		await flushPromises();

		await save(wrapper);

		expect(error).toHaveBeenCalledWith(
			"Error patching user profile",
			expect.any(Error)
		);
		expect(saveType(wrapper)).toBe("primary");
		expect(saveButton(wrapper).attributes("aria-busy")).toBe("false");
		expect(values(wrapper).at(1)).toBe("other-user");
	});

	it("sends no second patch while one is in flight", async () => {
		let answer!: () => void;
		mock.onPatch(PROFILE_URL).reply(
			() =>
				new Promise((r) => {
					answer = () => r([200, profile()]);
				})
		);
		const { wrapper } = await mountProfile(profile());

		await save(wrapper);
		expect(saveButton(wrapper).props("disabled")).toBe(true);
		// the guard, past the disabled button
		saveButton(wrapper).vm.$emit("click");
		await save(wrapper);
		expect(mock.history.patch).toHaveLength(1);

		answer();
		await flushPromises();
		expect(saveButton(wrapper).props("disabled")).toBe(false);
	});

	it("asks to wait when the patch is throttled", async () => {
		mock.onPatch(PROFILE_URL).reply(429, {
			detail: "Request was throttled. Expected available in 42 seconds.",
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountProfile(profile());

		await save(wrapper);

		const alerts = wrapper.findAll("[role=alert]");
		expect(alerts).toHaveLength(1);
		expect(alerts[0].text()).toBe("profile.change_profile.throttled");

		mock.resetHandlers();
		mock.onPatch(PROFILE_URL).reply(200, profile());
		mock.onGet(PROFILE_URL).reply(200, profile());
		await save(wrapper);
		expect(wrapper.findAll("[role=alert]")).toHaveLength(0);
	});


	describe("FIO credential check", () => {
		const ERRORS = "profile.change_profile.fio_errors";
		const noFIO = profile({
			fio_apikey: null,
			prun_username: null,
			fio_status: "none",
		});

		async function link(patchStatus: number, body: object) {
			mock.resetHandlers();
			mock.onGet(PROFILE_URL).reply(200, noFIO);
			mock.onPatch(PROFILE_URL).reply(patchStatus, body);
			vi.spyOn(console, "error").mockImplementation(() => {});
			const { wrapper } = await mountProfile(noFIO);
			await inputs(wrapper).at(0)!.setValue("key");
			await inputs(wrapper).at(1)!.setValue("PRUN");
			await save(wrapper);
			return wrapper;
		}

		it.each([
			["fio_apikey", "fio_invalid_key"],
			["prun_username", "fio_username_mismatch"],
			["fio_apikey", "fio_required"],
		])("shows %s: %s under its field", async (field, code) => {
			const wrapper = await link(400, { [field]: [code] });

			const alerts = wrapper.findAll("[role=alert]");
			expect(alerts.map((a) => a.text())).toEqual([`${ERRORS}.${code}`]);
			// the error sits in the field's own form item
			const label =
				field === "fio_apikey"
					? "profile.change_profile.form.fio_apikey"
					: "profile.change_profile.form.prun_username";
			const labelId = wrapper
				.findAll("label")
				.find((l) => l.text() === label)!
				.attributes("id");
			expect(
				alerts[0].element.closest("div")!.previousElementSibling!
					.previousElementSibling!.id
			).toBe(labelId);
			expect(saveType(wrapper)).toBe("primary");
			expect(trackEvent).toHaveBeenCalledWith("account:fio_link_failed", {
				reason: code,
			});
			expect(trackEvent).not.toHaveBeenCalledWith("account:fio_link");
		});

		it("falls back to a generic message for an unknown code", async () => {
			const wrapper = await link(400, { prun_username: ["other"] });

			expect(wrapper.find("[role=alert]").text()).toBe(`${ERRORS}.unknown`);
		});

		it("shows no FIO error for other failures", async () => {
			const wrapper = await link(500, {});

			expect(wrapper.findAll("[role=alert]")).toHaveLength(0);
			expect(trackEvent).not.toHaveBeenCalledWith(
				"account:fio_link_failed",
				expect.anything()
			);
		});

		it("confirms the connection and clears old errors on success", async () => {
			const wrapper = await link(400, { fio_apikey: ["fio_invalid_key"] });
			mock.resetHandlers();
			mock.onPatch(PROFILE_URL).reply(
				200,
				profile({ prun_username: "PRUN", fio_apikey: "key" })
			);
			mock.onGet(PROFILE_URL).reply(
				200,
				profile({
					prun_username: "PRUN",
					fio_apikey: "key",
					fio_status: "syncing",
				})
			);

			await save(wrapper);

			expect(wrapper.findAll("[role=alert]")).toHaveLength(0);
			expect(wrapper.find("[data-testid=fio-status]").text()).toBe(
				"profile.change_profile.fio_connected"
			);
			expect(trackEvent).toHaveBeenCalledWith("account:fio_link");

			// the first refresh replaces it with the real status
			useUserStore().profile = profile({
				prun_username: "PRUN",
				fio_apikey: "key",
				fio_status: "ok",
			});
			await flushPromises();
			expect(wrapper.find("[data-testid=fio-status]").text()).toBe(
				"profile.change_profile.fio_status.ok"
			);
		});

		it.each([
			"none",
			"syncing",
			"ok",
			"no_data",
			"invalid_credentials",
			"error",
		] as const)("shows the %s status", async (status) => {
			mock.resetHandlers();
			mock.onGet(PROFILE_URL).reply(200, profile({ fio_status: status }));
			const { wrapper } = await mountProfile(
				profile({ fio_status: status })
			);

			expect(wrapper.find("[data-testid=fio-status]").text()).toBe(
				`profile.change_profile.fio_status.${status}`
			);
		});
	});
});
