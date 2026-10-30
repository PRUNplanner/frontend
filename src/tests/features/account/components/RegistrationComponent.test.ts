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
import RegistrationComponent from "@/features/account/components/RegistrationComponent.vue";
import PNotice from "@/ui/components/PNotice.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
	trackException: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const SIGNUP_URL = /user\/signup\/$/;

// Math.random picks index floor(r * 9) of the 9 security planets
const FIRST_PLANET = "OT-580b"; // r = 0 → index 0

const inputs = (wrapper: VueWrapper) => wrapper.findAll("input");
const registerButton = (wrapper: VueWrapper) =>
	wrapper
		.findAll("button")
		.find((b) => b.text().includes("buttons.register"))!;
const anotherPlanetButton = (wrapper: VueWrapper) =>
	wrapper
		.findAll("button")
		.find((b) => b.text().includes("form.another_planet"))!;
// the info line under the nth form field (username, password, email, planet)
const fieldInfo = (wrapper: VueWrapper, index: number) => {
	const id = inputs(wrapper)[index].attributes("id");
	const content = wrapper.find(`label[for="${id}"]`).element
		.nextElementSibling;
	const info = content?.nextElementSibling;
	return info?.classList.contains("col-2") ? (info.textContent ?? "") : "";
};
const alert = (wrapper: VueWrapper) => wrapper.findComponent(PNotice).text();
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
	if (values.username !== undefined) await username.setValue(values.username);
	if (values.password !== undefined) await password.setValue(values.password);
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

	it("replaces the form with the welcome state and its log in button", async () => {
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
		expect(wrapper.find("[role=status]").exists()).toBe(true);

		// the panel switches to the login form
		const buttons = wrapper.findAll("button");
		expect(buttons).toHaveLength(1);
		expect(buttons[0].text()).toBe(
			"account.components.login.buttons.login"
		);
		await buttons[0].trigger("click");
		expect(
			wrapper.findComponent(RegistrationComponent).emitted("login")
		).toHaveLength(1);
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

	it("keeps the planet and the answer after a 400, so fixing the username succeeds", async () => {
		mock.onPost(SIGNUP_URL).replyOnce(400, {
			username: ["A user with that username already exists."],
		});
		mock.onPost(SIGNUP_URL).replyOnce(200, { username: "other-user" });
		const { wrapper } = await mountComponent(RegistrationComponent);
		// a re-roll would now pick another planet
		vi.mocked(Math.random).mockReturnValue(0.5);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(fieldInfo(wrapper, 0)).toContain(
			"A user with that username already exists."
		);
		expect(alert(wrapper)).toContain(
			"account.components.registration.result.fix_fields"
		);
		expect(inputs(wrapper).map((i) => i.element.value)).toEqual([
			"test-user",
			"correct-horse-battery",
			"",
			"Promitor",
		]);
		expect(registerButton(wrapper).attributes("aria-busy")).toBe("false");
		expect(disabled(wrapper)).toBe(false);

		await fill(wrapper, { username: "other-user" });
		await register(wrapper);

		expect(sentBody(0)).toMatchObject({ planet_id: FIRST_PLANET });
		expect(sentBody(1)).toEqual({
			...(sentBody(0) as object),
			username: "other-user",
		});
		expect(wrapper.text()).toContain(
			"account.components.registration.result.ok_message"
		);
	});

	it("shows every message of a combined 400 under its own field", async () => {
		mock.onPost(SIGNUP_URL).reply(400, {
			username: ["Taken."],
			password: ["Too common.", "Entirely numeric."],
			email: ["Enter a valid email address."],
			planet_input: ["Wrong planet."],
		});
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(fieldInfo(wrapper, 0)).toContain("Taken.");
		expect(fieldInfo(wrapper, 1)).toContain("Too common.");
		expect(fieldInfo(wrapper, 1)).toContain("Entirely numeric.");
		expect(fieldInfo(wrapper, 2)).toContain("Enter a valid email address.");
		expect(fieldInfo(wrapper, 3)).toContain("Wrong planet.");
		expect(
			wrapper.findAll(".col-2 .text-negative[role=alert]")
		).toHaveLength(4);
		// the top alert only points at the fields
		expect(alert(wrapper)).not.toContain("Taken.");
	});

	it("puts messages that belong to no field into the top alert", async () => {
		mock.onPost(SIGNUP_URL).reply(400, {
			non_field_errors: ["Something else."],
			planet_id: ["Unknown planet."],
		});
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(alert(wrapper)).toContain(
			"account.components.registration.result.error"
		);
		expect(alert(wrapper)).toContain("Something else.");
		expect(alert(wrapper)).toContain("Unknown planet.");
		expect(alert(wrapper)).not.toContain("result.fix_fields");
	});

	it("shows a wrong planet answer under the planet name, and another planet clears it", async () => {
		mock.onPost(SIGNUP_URL).replyOnce(400, {
			planet_input: ["Wrong planet."],
		});
		mock.onPost(SIGNUP_URL).replyOnce(200, { username: "test-user" });
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });
		await register(wrapper);
		expect(fieldInfo(wrapper, 3)).toContain("Wrong planet.");

		await anotherPlanetButton(wrapper).trigger("click");
		await flushPromises();

		expect(inputs(wrapper)[3].element.value).toBe("");
		expect(wrapper.text()).not.toContain("Wrong planet.");
		await fill(wrapper, { planet: "Katoa" });
		await register(wrapper);
		// r = 0 among the 8 others: the second planet of the list
		expect(sentBody(0)).toMatchObject({ planet_id: FIRST_PLANET });
		expect(sentBody(1)).toMatchObject({
			planet_id: "KW-688c",
			planet_input: "Katoa",
		});
	});

	it("never draws the current planet again", async () => {
		mock.onPost(SIGNUP_URL).reply(200, { username: "test-user" });
		const { wrapper } = await mountComponent(RegistrationComponent);
		for (const r of [0, 0.5, 0.999]) {
			vi.mocked(Math.random).mockReturnValue(r);
			await anotherPlanetButton(wrapper).trigger("click");
		}
		await fill(wrapper, { ...VALID });
		await register(wrapper);

		// mounted on OT-580b, then each draw skips the planet shown before it
		expect(sentBody()).not.toMatchObject({ planet_id: FIRST_PLANET });
	});

	it("clears only the error of the field being edited", async () => {
		mock.onPost(SIGNUP_URL).reply(400, {
			username: ["Taken."],
			planet_input: ["Wrong planet."],
		});
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });
		await register(wrapper);

		await fill(wrapper, { username: "other-user" });

		expect(wrapper.text()).not.toContain("Taken.");
		expect(fieldInfo(wrapper, 0)).toContain(
			"account.components.registration.form.username_info"
		);
		expect(fieldInfo(wrapper, 3)).toContain("Wrong planet.");
	});

	it("drops the top alert once the last field error is edited away", async () => {
		mock.onPost(SIGNUP_URL).reply(400, { username: ["Taken."] });
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });
		await register(wrapper);
		expect(alert(wrapper)).toContain("result.fix_fields");

		await fill(wrapper, { username: "other-user" });

		expect(wrapper.findComponent(PNotice).exists()).toBe(false);
	});

	it("explains the password rules before submitting", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);

		expect(fieldInfo(wrapper, 1)).toContain(
			"account.components.registration.form.password_info"
		);
	});

	it("shows the throttle message on a 429", async () => {
		mock.onPost(SIGNUP_URL).reply(429, {
			detail: "Request was throttled. Expected available in 42 seconds.",
		});
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(alert(wrapper)).toContain(
			"account.components.registration.result.throttled"
		);
		expect(alert(wrapper)).not.toContain("result.unknown");
		expect(alert(wrapper)).not.toContain("throttled. Expected");
	});

	it.each([
		["a network error", () => mock.onPost(SIGNUP_URL).networkError()],
		["a server error", () => mock.onPost(SIGNUP_URL).reply(500)],
	])("falls back to an unknown error on %s", async (_, answer) => {
		answer();
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(alert(wrapper)).toContain(
			"account.components.registration.result.error"
		);
		expect(alert(wrapper)).toContain(
			"account.components.registration.result.unknown"
		);
		expect(registerButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("needs a filled email to look like one, with the reason at the field", async () => {
		const { wrapper } = await mountComponent(RegistrationComponent);
		await fill(wrapper, { ...VALID });

		for (const email of ["foo", "foo@bar", "foo@@bar.com", "a b@c.de"]) {
			await fill(wrapper, { email });
			expect(disabled(wrapper)).toBe(true);
			expect(fieldInfo(wrapper, 2)).toContain(
				"account.components.registration.form.email_invalid"
			);
		}
		await fill(wrapper, { email: "foo@bar.com" });
		expect(disabled(wrapper)).toBe(false);
		await fill(wrapper, { email: "" });
		expect(disabled(wrapper)).toBe(false);
		expect(fieldInfo(wrapper, 2)).toContain(
			"account.components.registration.form.email_info"
		);
	});

	it("focuses the first field with an error after a failed submit", async () => {
		mock.onPost(SIGNUP_URL).reply(400, {
			planet_input: ["Wrong planet."],
			password: ["Too common."],
		});
		const { wrapper } = await mountComponent(
			RegistrationComponent,
			{},
			{ attach: true }
		);
		await fill(wrapper, { ...VALID });

		await register(wrapper);

		expect(document.activeElement).toBe(inputs(wrapper)[1].element);
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
