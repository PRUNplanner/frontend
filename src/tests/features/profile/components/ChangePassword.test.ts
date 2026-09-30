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
import ChangePassword from "@/features/profile/components/ChangePassword.vue";
import { mountComponent } from "@/tests/mountComponent";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	trackEvent: vi.fn(),
	trackUser: vi.fn(),
	identifyUser: vi.fn(),
	resetUser: vi.fn(),
}));

const mock = new AxiosMockAdapter(apiService.client);
const CHANGE_URL = /user\/change_password\/$/;

const SUCCESS = "profile.change_password.form.change_success";
const ERROR = "profile.change_password.form.change_error";

const OLD = "correct-horse-battery";
const NEW = "staple-horse-battery";

const inputs = (wrapper: VueWrapper) => wrapper.findAll("input");
const changeButton = (wrapper: VueWrapper) => wrapper.find("button");
const disabled = (wrapper: VueWrapper) =>
	changeButton(wrapper).element.disabled;

async function fill(wrapper: VueWrapper, current: string, next: string) {
	await inputs(wrapper).at(0)!.setValue(current);
	await inputs(wrapper).at(1)!.setValue(next);
	await flushPromises();
}

async function change(wrapper: VueWrapper) {
	await changeButton(wrapper).trigger("click");
	await flushPromises();
}

describe("ChangePassword", () => {
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

	it("renders two empty password inputs and a disabled button", async () => {
		const { wrapper } = await mountComponent(ChangePassword);

		expect(inputs(wrapper).map((i) => i.attributes("type"))).toEqual([
			"password",
			"password",
		]);
		expect(inputs(wrapper).map((i) => i.element.value)).toEqual(["", ""]);
		expect(disabled(wrapper)).toBe(true);
		expect(wrapper.text()).not.toContain(SUCCESS);
		expect(wrapper.text()).not.toContain(ERROR);
	});

	it("needs the current password to have at least 8 characters", async () => {
		const { wrapper } = await mountComponent(ChangePassword);

		await fill(wrapper, "1234567", NEW);
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, "12345678", NEW);
		expect(disabled(wrapper)).toBe(false);
		await fill(wrapper, "123456789", NEW);
		expect(disabled(wrapper)).toBe(false);
	});

	it("needs the new password to have at least 8 characters", async () => {
		const { wrapper } = await mountComponent(ChangePassword);

		await fill(wrapper, OLD, "1234567");
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, OLD, "12345678");
		expect(disabled(wrapper)).toBe(false);
		await fill(wrapper, OLD, "123456789");
		expect(disabled(wrapper)).toBe(false);
	});

	it("stays disabled with only one of the passwords", async () => {
		const { wrapper } = await mountComponent(ChangePassword);

		await fill(wrapper, OLD, "");
		expect(disabled(wrapper)).toBe(true);
		await fill(wrapper, "", NEW);
		expect(disabled(wrapper)).toBe(true);
	});

	it("posts old and new password, shows the success and clears both", async () => {
		mock.onPost(CHANGE_URL).reply(200, { detail: "Password changed." });
		const { wrapper } = await mountComponent(ChangePassword);
		await fill(wrapper, OLD, NEW);

		await change(wrapper);

		expect(mock.history.post).toHaveLength(1);
		expect(JSON.parse(mock.history.post.at(0)!.data)).toEqual({
			old_password: OLD,
			new_password: NEW,
		});
		expect(trackEvent).toHaveBeenCalledWith("account:password_change");
		expect(wrapper.text()).toContain(SUCCESS);
		expect(wrapper.text()).not.toContain(ERROR);
		expect(inputs(wrapper).map((i) => i.element.value)).toEqual(["", ""]);
		expect(disabled(wrapper)).toBe(true);
	});

	it("shows the error for a wrong current password and clears both", async () => {
		mock.onPost(CHANGE_URL).reply(400, { detail: "Wrong password." });
		const { wrapper } = await mountComponent(ChangePassword);
		await fill(wrapper, OLD, NEW);

		await change(wrapper);

		expect(wrapper.text()).toContain(ERROR);
		expect(wrapper.text()).not.toContain(SUCCESS);
		expect(inputs(wrapper).map((i) => i.element.value)).toEqual(["", ""]);
		expect(changeButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("replaces an earlier error with the success of a retry", async () => {
		mock.onPost(CHANGE_URL).replyOnce(400, { detail: "Wrong password." });
		mock.onPost(CHANGE_URL).replyOnce(200, { detail: "Password changed." });
		const { wrapper } = await mountComponent(ChangePassword);
		await fill(wrapper, "wrong-horse-battery", NEW);
		await change(wrapper);
		expect(wrapper.text()).toContain(ERROR);

		await fill(wrapper, OLD, NEW);
		await change(wrapper);

		expect(wrapper.text()).toContain(SUCCESS);
		expect(wrapper.text()).not.toContain(ERROR);
	});

	it("spins the button while changing and keeps the inputs until done", async () => {
		let answer!: () => void;
		mock.onPost(CHANGE_URL).reply(
			() =>
				new Promise((r) => {
					answer = () => r([200, { detail: "Password changed." }]);
				})
		);
		const { wrapper } = await mountComponent(ChangePassword);
		await fill(wrapper, OLD, NEW);

		await change(wrapper);
		expect(changeButton(wrapper).attributes("aria-busy")).toBe("true");
		expect(inputs(wrapper).map((i) => i.element.value)).toEqual([OLD, NEW]);

		answer();
		await flushPromises();
		expect(changeButton(wrapper).attributes("aria-busy")).toBe("false");
		expect(wrapper.text()).toContain(SUCCESS);
	});
});
