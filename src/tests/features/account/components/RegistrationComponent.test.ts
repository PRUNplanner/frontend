import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import RegistrationComponent from "@/features/account/components/RegistrationComponent.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const SIGNUP_URL = /user\/signup\/$/;

// Math.random picks index floor(r * 9) of the 9 security planets
const FIRST_PLANET = "OT-580b"; // r = 0 → index 0
const FIFTH_PLANET = "FK-794b"; // r = 0.5 → floor(4.5) = 4

const inputs = (wrapper: VueWrapper) => wrapper.findAll("input");
const registerButton = (wrapper: VueWrapper) => wrapper.find("button");
const disabled = (wrapper: VueWrapper) =>
	registerButton(wrapper).element.disabled;

async function fill(
	wrapper: VueWrapper,
	values: {
		username?: string;
		password?: string;
		email?: string;
		planet?: string;
	}
) {
	const [username, password, email, planet] = inputs(wrapper);
	if (values.username !== undefined)
		await username.setValue(values.username);
	if (values.password !== undefined)
		await password.setValue(values.password);
	if (values.email !== undefined) await email.setValue(values.email);
	if (values.planet !== undefined) await planet.setValue(values.planet);
	await flushPromises();
}

const VALID = {
	username: "test-user",
	password: "correct-horse-battery",
	planet: "Promitor",
};

async function register(wrapper: VueWrapper) {
	await registerButton(wrapper).trigger("click");
	await flushPromises();
}

/**
 * the signup goes out as multipart form data, which the mock adapter only
 * records as "[object FormData]", so read the payload handed to apiService
 */
function sentBody(index = 0): unknown {
	const call = vi
		.mocked(apiService.post)
		.mock.calls.filter(([path]) => path === "/user/signup/")
		.at(index);
	expect(call).toBeDefined();
	return call![1];
}

describe("RegistrationComponent", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		vi.spyOn(Math, "random").mockReturnValue(0);
		vi.spyOn(apiService, "post");
		// the query store logs every failed request
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the empty form with a disabled register button", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);

		expect(wrapper.text()).toContain(
			"account.components.registration.title"
		);
		expect(inputs(wrapper)).toHaveLength(4);
		expect(inputs(wrapper).at(1)!.attributes("type")).toBe("password");
		expect(disabled(wrapper)).toBe(true);
		expect(wrapper.text()).not.toContain(
			"account.components.registration.result.error"
		);
	});

	// the planet is shown inside <i18n-t> slots, which a message-less i18n
	// doesn't render, so the request body is where the pick is visible
	it("picks the security planet at random on mount", async () => {
		mock.onPost(SIGNUP_URL).reply(200, { username: "test-user" });
		vi.mocked(Math.random).mockReturnValue(0.999);
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		// r = 0.999 → floor(0.999 * 9) = floor(8.991) = 8, the last planet
		expect(sentBody()).toMatchObject({ planet_id: "KW-020c" });
	});

	it("enables register once username, password and planet are valid", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);

		await fill(wrapper, { username: VALID.username });
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, { password: VALID.password });
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, { planet: VALID.planet });
		// email stays optional
		expect(disabled(wrapper)).toBe(false);
	});

	it("needs a username of at least 3 characters", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await fill(wrapper, { username: "ab" });
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, { username: "abc" });
		expect(disabled(wrapper)).toBe(false);
		await fill(wrapper, { username: "abcd" });
		expect(disabled(wrapper)).toBe(false);
	});

	it("rejects usernames with a space anywhere", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await fill(wrapper, { username: "test user" });
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, { username: "test-user " });
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, { username: "test-user" });
		expect(disabled(wrapper)).toBe(false);
	});

	it("needs a password of at least 8 characters", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await fill(wrapper, { password: "1234567" });
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, { password: "12345678" });
		expect(disabled(wrapper)).toBe(false);
		await fill(wrapper, { password: "123456789" });
		expect(disabled(wrapper)).toBe(false);
	});

	it("needs a planet name, cleared input counts as empty", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });
		expect(disabled(wrapper)).toBe(false);

		await fill(wrapper, { planet: "" });
		expect(disabled(wrapper)).toBe(true);
	});

	it("posts the registration with the shown security planet", async () => {
		mock.onPost(SIGNUP_URL).reply(200, { username: "test-user" });
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID, email: "test@example.com" });

		await register(wrapper);

		expect(mock.history.post).toHaveLength(1);
		expect(sentBody()).toEqual({
			username: "test-user",
			password: "correct-horse-battery",
			planet_id: FIRST_PLANET,
			planet_input: "Promitor",
			email: "test@example.com",
		});
	});

	it("leaves the email out of the body when none is given", async () => {
		mock.onPost(SIGNUP_URL).reply(200, { username: "test-user" });
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID, email: "" });

		await register(wrapper);

		expect(sentBody()).not.toHaveProperty("email");
		expect(sentBody()).toMatchObject({ username: "test-user" });
	});

	it("replaces the form with the success message", async () => {
		mock.onPost(SIGNUP_URL).reply(200, { username: "test-user" });
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(wrapper.text()).toContain(
			"account.components.registration.result.ok_header"
		);
		expect(wrapper.text()).toContain(
			"account.components.registration.result.ok_message"
		);
		expect(inputs(wrapper)).toHaveLength(0);
		expect(wrapper.find("button").exists()).toBe(false);
	});

	it("spins the button while the request runs", async () => {
		let answer!: () => void;
		mock.onPost(SIGNUP_URL).reply(
			() =>
				new Promise((r) => {
					answer = () => r([200, { username: "test-user" }]);
				})
		);
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		expect(registerButton(wrapper).attributes("aria-busy")).toBe("false");
		await register(wrapper);
		expect(registerButton(wrapper).attributes("aria-busy")).toBe("true");

		answer();
		await flushPromises();
		expect(wrapper.text()).toContain(
			"account.components.registration.result.ok_message"
		);
	});

	it("shows the first backend validation message and keeps the inputs", async () => {
		mock.onPost(SIGNUP_URL).reply(400, {
			username: ["A user with that username already exists.", "other"],
			password: ["Too common."],
		});
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(wrapper.text()).toContain(
			"account.components.registration.result.error"
		);
		expect(wrapper.text()).toContain(
			"A user with that username already exists."
		);
		expect(wrapper.text()).not.toContain("other");
		expect(wrapper.text()).not.toContain("Too common.");
		expect(inputs(wrapper).map((i) => i.element.value)).toEqual([
			"test-user",
			"correct-horse-battery",
			"",
			"Promitor",
		]);
		expect(registerButton(wrapper).attributes("aria-busy")).toBe("false");
		expect(disabled(wrapper)).toBe(false);
	});

	it("shows a plain string validation message as is", async () => {
		mock.onPost(SIGNUP_URL).reply(400, { detail: "Planet answer wrong." });
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(wrapper.text()).toContain("Planet answer wrong.");
	});

	it("falls back to an unknown error without a backend message", async () => {
		mock.onPost(SIGNUP_URL).networkError();
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(wrapper.text()).toContain(
			"account.components.registration.result.error"
		);
		expect(wrapper.text()).toContain(
			"Unknown error. Please try again later."
		);
		expect(registerButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("asks for a new security planet after a failure", async () => {
		mock.onPost(SIGNUP_URL).replyOnce(400, { planet_input: ["Wrong."] });
		mock.onPost(SIGNUP_URL).replyOnce(200, { username: "test-user" });
		// mounted with r = 0, the re-roll after the failure gets r = 0.5
		const { wrapper } = await mountComponent(RegistrationComponent);
		vi.mocked(Math.random).mockReturnValue(0.5);
		await fill(wrapper, { ...VALID });

		await register(wrapper);
		await register(wrapper);

		expect(sentBody(0)).toMatchObject({ planet_id: FIRST_PLANET });
		expect(sentBody(1)).toMatchObject({ planet_id: FIFTH_PLANET });
		expect(wrapper.text()).toContain(
			"account.components.registration.result.ok_message"
		);
	});

	it("hides the previous error while retrying", async () => {
		mock.onPost(SIGNUP_URL).replyOnce(400, { username: ["Taken."] });
		let answer!: () => void;
		mock.onPost(SIGNUP_URL).replyOnce(
			() =>
				new Promise((r) => {
					answer = () => r([200, { username: "test-user" }]);
				})
		);
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });
		await register(wrapper);
		expect(wrapper.text()).toContain("Taken.");

		await register(wrapper);
		expect(wrapper.text()).not.toContain("Taken.");
		expect(wrapper.text()).not.toContain(
			"account.components.registration.result.error"
		);

		answer();
		await flushPromises();
		expect(wrapper.text()).toContain(
			"account.components.registration.result.ok_message"
		);
	});
});
