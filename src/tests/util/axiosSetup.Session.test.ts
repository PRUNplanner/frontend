import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import axios, { type AxiosRequestConfig, isCancel } from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import axiosSetup from "@/util/axiosSetup";
import { useUserStore } from "@/stores/userStore";

const route = vi.hoisted(() => ({ value: { meta: {} as object } }));
vi.mock("@/router", () => ({
	default: { push: vi.fn(), currentRoute: route },
}));
import router from "@/router";

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

describe("axiosSetup: a session that can't be refreshed", () => {
	let userStore: ReturnType<typeof useUserStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		userStore = useUserStore();
		mock.reset();
		vi.mocked(router.push).mockClear();
		mock.onPost("/user/refresh/").reply(401);
		userStore.setToken("access-a", "refresh-a");
	});

	it("keeps a public page open and asks again logged out", async () => {
		route.value = { meta: {} };
		mock.onGet("/shared").reply((config) =>
			config.headers?.Authorization ? [401] : [200, "plan"]
		);

		expect((await axios.get("/shared")).data).toBe("plan");
		expect(userStore.isLoggedIn).toBe(false);
		expect(router.push).not.toHaveBeenCalled();
	});

	it("asks again for every request the dead token failed", async () => {
		route.value = { meta: {} };
		const logout = vi.spyOn(userStore, "logout");
		const reply = (config: AxiosRequestConfig): [number, string?] =>
			config.headers?.Authorization ? [401] : [200, "public"];
		mock.onGet("/shared").reply(reply);
		mock.onGet("/planet").reply(reply);

		// the second 401 is handled after the first has logged out
		const answers = await Promise.all([
			axios.get("/shared"),
			axios.get("/planet"),
		]);

		expect(answers.map((a) => a.data)).toEqual(["public", "public"]);
		expect(logout).toHaveBeenCalledTimes(1);
	});

	it("asks a public page's login-only endpoint only once more", async () => {
		route.value = { meta: {} };
		mock.onGet("/private").reply(401);

		const error = await axios.get("/private").catch((e) => e);

		expect(error.response.status).toBe(401);
		expect(
			mock.history.get.filter((r) => r.url === "/private")
		).toHaveLength(2);
		expect(router.push).not.toHaveBeenCalled();
	});

	it("sends the user home from a page that needs a login", async () => {
		route.value = { meta: { requiresAuth: true } };
		mock.onGet("/private").reply(401);

		const error = await axios.get("/private").catch((e) => e);

		expect(error.response.status).toBe(401);
		expect(userStore.isLoggedIn).toBe(false);
		expect(router.push).toHaveBeenCalledWith("/");
		expect(
			mock.history.get.filter((r) => r.url === "/private")
		).toHaveLength(1);
	});
});

describe("axiosSetup: a refresh without an answer", () => {
	const token = (name: string) => name.padEnd(120, "x");
	let userStore: ReturnType<typeof useUserStore>;

	const refreshes = () =>
		mock.history.post.filter((r) => r.url === "/user/refresh/");

	beforeEach(() => {
		setActivePinia(createPinia());
		userStore = useUserStore();
		mock.reset();
		vi.mocked(router.push).mockClear();
		route.value = { meta: { requiresAuth: true } };
		userStore.setToken(token("access-old"), token("refresh"));
		mock.onGet("/data").reply((config) =>
			config.headers?.Authorization === `Bearer ${token("access-new")}`
				? [200, "payload"]
				: [401]
		);
	});

	it.each([
		[
			"a network error",
			() => mock.onPost("/user/refresh/").networkErrorOnce(),
		],
		["a timeout", () => mock.onPost("/user/refresh/").timeoutOnce()],
		["a server error", () => mock.onPost("/user/refresh/").replyOnce(502)],
	])(
		"keeps the session after %s and refreshes on the next 401",
		async (_, fail) => {
			fail();
			const logout = vi.spyOn(userStore, "logout");

			const error = await axios.get("/data").catch((e) => e);

			// the original request fails with its own 401, not replayed
			expect(error.response.status).toBe(401);
			expect(
				mock.history.get.filter((r) => r.url === "/data")
			).toHaveLength(1);
			expect(logout).not.toHaveBeenCalled();
			expect(router.push).not.toHaveBeenCalled();
			expect(userStore.isLoggedIn).toBe(true);
			expect(userStore.refreshToken).toBe(token("refresh"));

			mock.onPost("/user/refresh/").replyOnce(200, {
				access: token("access-new"),
			});
			expect((await axios.get("/data")).data).toBe("payload");
			expect(refreshes()).toHaveLength(2);
		}
	);

	it("ends the session when the refresh is refused", async () => {
		mock.onPost("/user/refresh/").replyOnce(401);

		const error = await axios.get("/data").catch((e) => e);

		expect(error.response.status).toBe(401);
		expect(userStore.isLoggedIn).toBe(false);
		expect(router.push).toHaveBeenCalledWith("/");
	});
});

describe("axiosSetup: parallel 401s", () => {
	// the token schemas want 120+ characters
	const token = (name: string) => name.padEnd(120, "x");
	let userStore: ReturnType<typeof useUserStore>;
	let valid: string;

	const refreshes = () =>
		mock.history.post.filter((r) => r.url === "/user/refresh/");
	const parallel = (n: number) =>
		Promise.allSettled(Array.from({ length: n }, () => axios.get("/data")));

	beforeEach(() => {
		setActivePinia(createPinia());
		userStore = useUserStore();
		mock.reset();
		vi.mocked(router.push).mockClear();
		route.value = { meta: { requiresAuth: true } };
		userStore.setToken(token("access-old"), token("refresh"));
		valid = token("access-new-1");
		mock.onGet("/data").reply((config) =>
			config.headers?.Authorization === `Bearer ${valid}`
				? [200, "payload"]
				: [401]
		);
	});

	it("share one refresh and are all asked again", async () => {
		mock.onPost("/user/refresh/").reply(200, { access: valid });

		const answers = await parallel(3);

		expect(refreshes()).toHaveLength(1);
		expect(answers).toEqual(
			Array(3).fill(
				expect.objectContaining({
					status: "fulfilled",
					value: expect.objectContaining({ data: "payload" }),
				})
			)
		);
		expect(userStore.isLoggedIn).toBe(true);
	});

	it("end the session once when the shared refresh fails", async () => {
		mock.onPost("/user/refresh/").reply(401);
		const logout = vi.spyOn(userStore, "logout");

		const answers = await parallel(3);

		expect(refreshes()).toHaveLength(1);
		expect(answers.map((a) => a.status)).toEqual([
			"rejected",
			"rejected",
			"rejected",
		]);
		expect(logout).toHaveBeenCalledTimes(1);
		expect(router.push).toHaveBeenCalledTimes(1);
		expect(userStore.isLoggedIn).toBe(false);
	});

	it("refresh again on a 401 after the last refresh settled", async () => {
		mock.onPost("/user/refresh/")
			.replyOnce(200, { access: token("access-new-1") })
			.onPost("/user/refresh/")
			.replyOnce(200, { access: token("access-new-2") });

		await parallel(2);
		// the server drops the first refreshed token
		valid = token("access-new-2");
		const later = await axios.get("/data");

		expect(later.data).toBe("payload");
		expect(refreshes()).toHaveLength(2);
	});
});

describe("axiosSetup: a 401 on a replay", () => {
	const token = (name: string) => name.padEnd(120, "x");
	let userStore: ReturnType<typeof useUserStore>;

	const refreshes = () =>
		mock.history.post.filter((r) => r.url === "/user/refresh/");
	const asked = () => mock.history.get.filter((r) => r.url === "/always");

	beforeEach(() => {
		setActivePinia(createPinia());
		userStore = useUserStore();
		mock.reset();
		vi.mocked(router.push).mockClear();
		userStore.setToken(token("access-old"), token("refresh"));
		// the backend rejects even a freshly refreshed token on this path
		mock.onGet("/always").reply(401);
		mock.onPost("/user/refresh/").reply(200, {
			access: token("access-new"),
		});
	});

	it.each([
		["needs a login", { requiresAuth: true }],
		["is public", {}],
	])(
		"refreshes and replays once, then rejects, on a page that %s",
		async (_, meta) => {
			route.value = { meta };

			const error = await axios.get("/always").catch((e) => e);

			expect(error.response.status).toBe(401);
			expect(refreshes()).toHaveLength(1);
			expect(asked()).toHaveLength(2);
			expect(asked()[1].headers?.Authorization).toBe(
				`Bearer ${token("access-new")}`
			);
			// the refresh worked: the session stays
			expect(userStore.isLoggedIn).toBe(true);
			expect(router.push).not.toHaveBeenCalled();
		}
	);

	it("parallel ones share one refresh and are each replayed once", async () => {
		route.value = { meta: { requiresAuth: true } };

		const answers = await Promise.allSettled(
			Array.from({ length: 3 }, () => axios.get("/always"))
		);

		expect(answers.map((a) => a.status)).toEqual(Array(3).fill("rejected"));
		expect(refreshes()).toHaveLength(1);
		expect(asked()).toHaveLength(6);
	});
});
