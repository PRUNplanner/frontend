import { describe, it, expect, vi, beforeEach } from "vitest";

import { memoryStorage } from "@/tests/memoryStorage";

const STORAGE_KEY = "prunplanner_analytics_consent";

const { posthog, gate } = vi.hoisted(() => ({
	posthog: {
		init: vi.fn(),
		register: vi.fn(),
		capture: vi.fn(),
		captureException: vi.fn(),
		identify: vi.fn(),
		reset: vi.fn(),
		set_config: vi.fn(),
		opt_in_capturing: vi.fn(),
		opt_out_capturing: vi.fn(),
		startSessionRecording: vi.fn(),
		stopSessionRecording: vi.fn(),
		people: { set: vi.fn() },
		__loaded: true,
	},
	// holds back the posthog-js import, to test the time while it loads
	gate: { promise: Promise.resolve() },
}));

/** lets the consent watcher and the dynamic import finish */
async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve));
	await vi.dynamicImportSettled();
	await new Promise((resolve) => setTimeout(resolve));
}

// module state is set up on import, so each case loads a fresh copy
async function load(
	options: { consent?: "granted" | "denied"; key?: string } = {}
) {
	vi.resetModules();
	// doMock, so the factory (and its gate) runs again for each fresh copy
	vi.doMock("posthog-js", async () => {
		await gate.promise;
		return { default: posthog };
	});
	if (options.consent) localStorage.setItem(STORAGE_KEY, options.consent);
	window.__APP_CONFIG__ = {
		POSTHOG_KEY: "key" in options ? options.key : "phc_test",
	};

	const wrapper = await import("@/lib/analytics/usePostHog");
	const { useAnalyticsConsent } = await import(
		"@/lib/analytics/useAnalyticsConsent"
	);
	return { ...wrapper, ...useAnalyticsConsent() };
}

function clearCookies(): void {
	document.cookie.split(";").forEach((cookie) => {
		document.cookie = `${cookie.split("=")[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	});
}

describe("usePostHog", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", memoryStorage());
		vi.stubGlobal("sessionStorage", memoryStorage());
		clearCookies();
		vi.clearAllMocks();
		gate.promise = Promise.resolve();
		posthog.__loaded = true;
	});

	it.each([undefined, "denied"] as const)(
		"does not start with consent %s",
		async (consent) => {
			const { capture, identify, setUserProp, reset } = await load({
				consent,
			});
			await settle();

			capture("plan_save", { planetNaturalId: "OT-580b" });
			identify("1", { username: "foo" });
			setUserProp({ fio_enabled: true });
			reset();

			expect(posthog.init).not.toHaveBeenCalled();
			expect(posthog.capture).not.toHaveBeenCalled();
			expect(posthog.identify).not.toHaveBeenCalled();
			expect(posthog.people.set).not.toHaveBeenCalled();
			expect(posthog.reset).not.toHaveBeenCalled();
		}
	);

	it.each([undefined, ""])(
		"does not start without a key (%s)",
		async (key) => {
			const { getPostHogKey } = await load({ consent: "granted", key });
			await settle();

			expect(getPostHogKey()).toBeUndefined();
			expect(posthog.init).not.toHaveBeenCalled();
		}
	);

	it("starts with a stored grant, without a cookie", async () => {
		const { capture } = await load({ consent: "granted" });
		await settle();

		expect(posthog.init).toHaveBeenCalledTimes(1);
		expect(posthog.init).toHaveBeenCalledWith(
			"phc_test",
			expect.objectContaining({
				persistence: "localStorage",
				respect_dnt: true,
				person_profiles: "identified_only",
			})
		);
		expect(posthog.register).toHaveBeenCalledWith({
			app_version: __APP_VERSION__,
		});

		capture("user_login", { username: "foo", password: "secret" });
		expect(posthog.capture).toHaveBeenCalledWith("user_login", {
			username: "foo",
			password: "***",
		});
	});

	it("starts on grant and identifies the known user", async () => {
		const { grant, identify, setUserProp } = await load();
		await settle();

		// logged in before the choice
		identify("1", { username: "foo" });
		setUserProp({ fio_enabled: true });
		expect(posthog.init).not.toHaveBeenCalled();

		grant();
		await settle();

		expect(posthog.init).toHaveBeenCalledTimes(1);
		expect(posthog.identify).toHaveBeenCalledWith("1", {
			username: "foo",
			fio_enabled: true,
		});
	});

	it("does not identify after a logout", async () => {
		const { grant, identify, reset } = await load();
		identify("1", { username: "foo" });
		reset();

		grant();
		await settle();

		expect(posthog.init).toHaveBeenCalledTimes(1);
		expect(posthog.identify).not.toHaveBeenCalled();
	});

	it("queues events while loading, then sends them", async () => {
		let open: () => void = () => {};
		gate.promise = new Promise((resolve) => (open = resolve));

		const { capture } = await load({ consent: "granted" });
		capture("plan_view", { shared: false });
		expect(posthog.capture).not.toHaveBeenCalled();

		open();
		await settle();

		expect(posthog.capture).toHaveBeenCalledTimes(1);
		expect(posthog.capture).toHaveBeenCalledWith("plan_view", {
			shared: false,
		});
	});

	it("drops the queue when denied while loading", async () => {
		let open: () => void = () => {};
		gate.promise = new Promise((resolve) => (open = resolve));

		const { capture, deny } = await load({ consent: "granted" });
		capture("plan_view", { shared: false });
		deny();
		await new Promise((resolve) => setTimeout(resolve));

		open();
		await settle();

		expect(posthog.init).not.toHaveBeenCalled();
		expect(posthog.capture).not.toHaveBeenCalled();
	});

	it("stops on deny and starts again on grant", async () => {
		const { capture, identify, grant, deny } = await load({
			consent: "granted",
		});
		await settle();
		identify("1", { username: "foo" });
		localStorage.setItem("ph_phc_test_posthog", "{}");

		deny();
		await settle();

		// off by default first: reset() clears the opt-out it follows
		const OFF = {
			opt_out_capturing_by_default: true,
			opt_out_persistence_by_default: true,
			advanced_disable_flags: true,
		};
		expect(posthog.set_config).toHaveBeenCalledWith(OFF);
		const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
			fn.mock.invocationCallOrder[0];
		expect(order(posthog.set_config)).toBeLessThan(
			order(posthog.opt_out_capturing)
		);
		expect(order(posthog.opt_out_capturing)).toBeLessThan(
			order(posthog.reset)
		);
		expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
		expect(posthog.reset).toHaveBeenCalledTimes(1);
		expect(posthog.stopSessionRecording).toHaveBeenCalledTimes(1);
		// send path closed, see the test against the real posthog-js below
		expect(posthog.__loaded).toBe(false);
		expect(localStorage.getItem("ph_phc_test_posthog")).toBeNull();

		capture("plan_save", { planetNaturalId: "OT-580b" });
		expect(posthog.capture).not.toHaveBeenCalled();

		posthog.identify.mockClear();
		grant();
		await settle();

		// the loaded instance is reused
		expect(posthog.__loaded).toBe(true);
		expect(posthog.init).toHaveBeenCalledTimes(1);
		expect(posthog.set_config).toHaveBeenLastCalledWith({
			opt_out_capturing_by_default: false,
			opt_out_persistence_by_default: false,
			advanced_disable_flags: false,
		});
		expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
		expect(posthog.startSessionRecording).toHaveBeenCalledTimes(1);
		expect(posthog.identify).toHaveBeenCalledWith("1", {
			username: "foo",
		});

		capture("plan_save", { planetNaturalId: "OT-580b" });
		expect(posthog.capture).toHaveBeenCalledTimes(1);
	});

	it("sends exceptions with redacted props", async () => {
		const { captureException } = await load({ consent: "granted" });
		await settle();

		const error = new Error("boom");
		captureException(error, { component: "PlanView", email: "a@b.c" });

		expect(posthog.captureException).toHaveBeenCalledWith(error, {
			component: "PlanView",
			email: "***",
		});
	});

	it.each([undefined, "denied"] as const)(
		"sends no exception with consent %s",
		async (consent) => {
			const { captureException } = await load({ consent });
			await settle();

			captureException(new Error("boom"), { component: "PlanView" });

			expect(posthog.captureException).not.toHaveBeenCalled();
		}
	);

	it("does not queue exceptions while loading", async () => {
		let open: () => void = () => {};
		gate.promise = new Promise((resolve) => (open = resolve));

		const { captureException } = await load({ consent: "granted" });
		captureException(new Error("boom"));

		open();
		await settle();

		expect(posthog.captureException).not.toHaveBeenCalled();
	});

	it("registers super properties, again on a later grant", async () => {
		const { register, reset, grant, deny } = await load();
		await settle();

		// set before the choice, e.g. the first route
		register({ route_name: "homepage" });
		expect(posthog.register).not.toHaveBeenCalled();

		grant();
		await settle();
		expect(posthog.register).toHaveBeenLastCalledWith({
			app_version: __APP_VERSION__,
			route_name: "homepage",
		});

		register({ route_name: "empire" });
		expect(posthog.register).toHaveBeenLastCalledWith({
			route_name: "empire",
		});

		// a logout resets PostHog, the super properties stay
		posthog.register.mockClear();
		reset();
		expect(posthog.register).toHaveBeenLastCalledWith({
			app_version: __APP_VERSION__,
			route_name: "empire",
		});

		deny();
		await settle();
		posthog.register.mockClear();
		register({ route_name: "plan" });
		expect(posthog.register).not.toHaveBeenCalled();

		grant();
		await settle();
		expect(posthog.register).toHaveBeenLastCalledWith({
			app_version: __APP_VERSION__,
			route_name: "plan",
		});
	});

	it.each([undefined, "denied"] as const)(
		"removes leftover PostHog storage on start with consent %s",
		async (consent) => {
			localStorage.setItem("ph_phc_old_posthog", "{}");
			localStorage.setItem("__ph_opt_in_out_phc_old", "1");
			localStorage.setItem("seenSurvey_1", "true");
			localStorage.setItem("inProgressSurvey_1", "{}");
			localStorage.setItem("lastSeenSurveyDate", "2026-09-01");
			localStorage.setItem("prunplanner_version", "1.0.0");
			sessionStorage.setItem("ph_phc_old_window_id", "w");
			document.cookie = "ph_phc_old_posthog=1; path=/";
			document.cookie = "other=1; path=/";

			await load({ consent });
			await settle();

			expect(localStorage.getItem("ph_phc_old_posthog")).toBeNull();
			expect(localStorage.getItem("__ph_opt_in_out_phc_old")).toBeNull();
			expect(localStorage.getItem("seenSurvey_1")).toBeNull();
			expect(localStorage.getItem("inProgressSurvey_1")).toBeNull();
			expect(localStorage.getItem("lastSeenSurveyDate")).toBeNull();
			expect(sessionStorage.getItem("ph_phc_old_window_id")).toBeNull();
			expect(document.cookie).not.toContain("ph_phc_old_posthog");
			// everything else stays
			expect(localStorage.getItem("prunplanner_version")).toBe("1.0.0");
			expect(document.cookie).toContain("other=1");
		}
	);

	it("keeps PostHog storage with a grant", async () => {
		localStorage.setItem("ph_phc_test_posthog", "{}");

		await load({ consent: "granted" });
		await settle();

		expect(localStorage.getItem("ph_phc_test_posthog")).toBe("{}");
	});

	// deny relies on posthog-js dropping requests while `__loaded` is false
	describe("real posthog-js", () => {
		async function captureWithRealPostHog() {
			vi.resetModules();
			vi.doUnmock("posthog-js");
			const send = vi.fn(() => new Promise(() => {}));
			vi.stubGlobal("fetch", send);

			const real = (await import("posthog-js")).default;
			real.init("phc_test", {
				api_host: "http://localhost",
				persistence: "memory",
				autocapture: false,
				capture_pageview: false,
				disable_session_recording: true,
				disable_surveys: true,
				advanced_disable_flags: true,
				disable_external_dependency_loading: true,
				// the shortest batch interval posthog-js allows
				request_queue_config: { flush_interval_ms: 250 },
			});
			real.capture("plan_view");

			return { real, send };
		}

		it("sends a captured event with its next batch", async () => {
			const { send } = await captureWithRealPostHog();

			await new Promise((resolve) => setTimeout(resolve, 400));

			expect(send).toHaveBeenCalled();
		});

		it("sends nothing once the send path is closed", async () => {
			const { real, send } = await captureWithRealPostHog();

			real.__loaded = false;
			await new Promise((resolve) => setTimeout(resolve, 400));

			expect(send).not.toHaveBeenCalled();
		});
	});
});
