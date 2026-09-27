import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import axios, { isCancel } from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import axiosSetup from "@/util/axiosSetup";
import { useUserStore } from "@/stores/userStore";

vi.mock("@/router", () => ({ default: { push: vi.fn() } }));

const mock = new AxiosMockAdapter(axios);

// a response that arrives when the test releases it
function deferReply(status = 200) {
	let release!: () => void;
	mock.onGet("/data").replyOnce(
		() =>
			new Promise((resolve) => {
				release = () => resolve([status, "payload"]);
			})
	);
	return () => release();
}

// setToken also requests the profile, wait for our request only
const sent = () =>
	vi.waitFor(() =>
		expect(mock.history.get.some((r) => r.url === "/data")).toBe(true)
	);

describe("axiosSetup: responses of a previous session", () => {
	let userStore: ReturnType<typeof useUserStore>;

	beforeAll(() => axiosSetup());

	beforeEach(() => {
		setActivePinia(createPinia());
		userStore = useUserStore();
		mock.reset();
	});

	it("are discarded after logout and a new login", async () => {
		userStore.setToken("access-a", "refresh-a");
		const release = deferReply();
		const pending = axios.get("/data");
		await sent();

		userStore.logout();
		userStore.setToken("access-b", "refresh-b");
		release();

		const error = await pending.catch((e) => e);
		expect(isCancel(error)).toBe(true);
	});

	it("are kept across an access token refresh", async () => {
		userStore.setToken("access-a", "refresh-a");
		const release = deferReply();
		const pending = axios.get("/data");
		await sent();

		// a refresh keeps the refresh token
		userStore.setToken("access-a2", "refresh-a");
		release();

		expect((await pending).data).toBe("payload");
	});

	it("are kept when sent logged out", async () => {
		const release = deferReply();
		const pending = axios.get("/data");
		await sent();

		userStore.setToken("access-b", "refresh-b");
		release();

		expect((await pending).data).toBe("payload");
	});

	it("never refresh or log out on a 401", async () => {
		const refresh = vi.spyOn(userStore, "performTokenRefresh");
		userStore.setToken("access-a", "refresh-a");
		const release = deferReply(401);
		const pending = axios.get("/data");
		await sent();

		userStore.logout();
		userStore.setToken("access-b", "refresh-b");
		const logout = vi.spyOn(userStore, "logout");
		release();

		expect(isCancel(await pending.catch((e) => e))).toBe(true);
		expect(refresh).not.toHaveBeenCalled();
		expect(logout).not.toHaveBeenCalled();
		expect(userStore.refreshToken).toBe("refresh-b");
	});
});
