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
		get_session_id: vi.fn(() => "ph-session"),
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

			capture("plan:save", { planet_natural_id: "OT-580b" });
			identify("1", { username: "foo" });
			setUserProp({ is_fio_enabled: true });
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
				capture_performance: { web_vitals_attribution: true },
			})
		);
		expect(posthog.register).toHaveBeenCalledWith({
			app_version: __APP_VERSION__,
		});

		capture("account:signup_fail", {
			fields: ["email"],
			password: "secret",
		});
		// keys are redacted, the field names of a failed signup are values
		expect(posthog.capture).toHaveBeenCalledWith("account:signup_fail", {
			fields: ["email"],
			password: "***",
		});
	});

	it("starts on grant and identifies the known user", async () => {
		const { grant, identify, setUserProp } = await load();
		await settle();

		// logged in before the choice
		identify("1", { username: "foo" });
		setUserProp({ is_fio_enabled: true });
		expect(posthog.init).not.toHaveBeenCalled();

		grant();
		await settle();

		expect(posthog.init).toHaveBeenCalledTimes(1);
		expect(posthog.identify).toHaveBeenCalledWith("1", {
			username: "foo",
			is_fio_enabled: true,
		});
	});

	it("leaves pageviews to the router", async () => {
		await load({ consent: "granted" });
		await settle();

		expect(posthog.init).toHaveBeenCalledWith(
			"phc_test",
			expect.objectContaining({
				capture_pageview: false,
				capture_pageleave: true,
			})
		);
	});

	const pageviews = () =>
		posthog.capture.mock.calls.filter(([event]) => event === "$pageview");

	it("sends the pageview of the page consent is granted on", async () => {
		const { capture, grant } = await load();
		await settle();
		// the landing page, before the visitor answered
		capture("$pageview");

		grant();
		await settle();

		expect(pageviews()).toHaveLength(1);
	});

	it("sends no second pageview when consent was given before", async () => {
		const { capture } = await load({ consent: "granted" });
		capture("$pageview");
		await settle();

		expect(pageviews()).toHaveLength(1);
	});

	it("sends the missed pageview after a deny and a new grant", async () => {
		const { capture, grant, deny } = await load({ consent: "granted" });
		await settle();
		capture("$pageview");
		deny();
		await settle();

		// same page: already counted
		grant();
		await settle();
		expect(pageviews()).toHaveLength(1);

		deny();
		await settle();
		capture("$pageview");
		grant();
		await settle();
		expect(pageviews()).toHaveLength(2);
	});

	it("keeps person properties of an anonymous visitor for identify", async () => {
		const { setUserProp, identify } = await load({ consent: "granted" });
		await settle();

		setUserProp({ plan_count: 3 });
		expect(posthog.people.set).not.toHaveBeenCalled();

		identify("1", { username: "foo" });
		expect(posthog.identify).toHaveBeenCalledWith("1", {
			plan_count: 3,
			username: "foo",
		});
	});

	it("drops pending person properties on logout", async () => {
		const { setUserProp, identify, reset } = await load({
			consent: "granted",
		});
		await settle();

		setUserProp({ plan_count: 3 });
		reset();
		identify("2", { username: "bar" });

		expect(posthog.identify).toHaveBeenCalledWith("2", { username: "bar" });
	});

	it("identifies the same user again only when a property changed", async () => {
		const { identify } = await load({ consent: "granted" });
		await settle();

		identify("1", { username: "foo", is_fio_enabled: true });
		identify("1", { username: "foo", is_fio_enabled: true });
		identify("1", { username: "foo", is_fio_enabled: false });

		expect(posthog.identify).toHaveBeenCalledTimes(2);
	});

	it("sends a person property only when its value changed", async () => {
		const { setUserProp, identify } = await load({ consent: "granted" });
		await settle();
		identify("1", { username: "foo" });

		setUserProp({ plan_count: 3 });
		setUserProp({ plan_count: 3 });
		setUserProp({ plan_count: 4 });

		expect(posthog.people.set.mock.calls).toEqual([
			[{ plan_count: 3 }],
			[{ plan_count: 4 }],
		]);
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
		capture("plan:view", { is_shared: false });
		expect(posthog.capture).not.toHaveBeenCalled();

		open();
		await settle();

		expect(posthog.capture).toHaveBeenCalledTimes(1);
		expect(posthog.capture).toHaveBeenCalledWith("plan:view", {
			is_shared: false,
		});
	});

	it("drops the queue when denied while loading", async () => {
		let open: () => void = () => {};
		gate.promise = new Promise((resolve) => (open = resolve));

		const { capture, deny } = await load({ consent: "granted" });
		capture("plan:view", { is_shared: false });
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

		capture("plan:save", { planet_natural_id: "OT-580b" });
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

		capture("plan:save", { planet_natural_id: "OT-580b" });
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

	it("returns the session id only while PostHog runs", async () => {
		const { getSessionId, grant, deny } = await load();
		await settle();
		expect(getSessionId()).toBeUndefined();

		grant();
		await settle();
		expect(getSessionId()).toBe("ph-session");

		deny();
		await settle();
		expect(getSessionId()).toBeUndefined();
	});

	it("keeps PostHog storage with a grant", async () => {
		localStorage.setItem("ph_phc_test_posthog", "{}");

		await load({ consent: "granted" });
		await settle();

		expect(localStorage.getItem("ph_phc_test_posthog")).toBe("{}");
	});

	describe("maskUrlCodes", () => {
		const event = (
			name: string,
			properties: Record<string, unknown>,
			extra: Record<string, unknown> = {}
		) => ({ uuid: "u", event: name, properties, ...extra });

		it("is passed to posthog.init as before_send", async () => {
			const { maskUrlCodes, dropChunkLoadErrors } = await load({
				consent: "granted",
			});
			await settle();

			expect(posthog.init).toHaveBeenCalledWith(
				"phc_test",
				expect.objectContaining({
					before_send: [maskUrlCodes, dropChunkLoadErrors],
				})
			);
		});

		it.each(["$pageview", "$pageleave", "$autocapture", "$exception"])(
			"masks reset and verify codes in every URL property of %s",
			async (name) => {
				const { maskUrlCodes } = await load();
				const masked = maskUrlCodes(
					event(
						name,
						{
							$current_url:
								"https://prunplanner.org/password-reset/abc123?x=1",
							$pathname: "/verify-email/def456",
							$referrer: "https://prunplanner.org/verify-email/def456#top",
							$session_entry_url:
								"https://prunplanner.org/password-reset/abc123",
							$exception_list: [
								{ value: "failed on /password-reset/abc123" },
							],
						},
						{
							$set_once: {
								$initial_referrer:
									"https://prunplanner.org/password-reset/abc123",
								$initial_pathname: "/verify-email/def456",
							},
						}
					)
				);

				expect(masked?.properties).toEqual({
					$current_url:
						"https://prunplanner.org/password-reset/:code?x=1",
					$pathname: "/verify-email/:code",
					$referrer: "https://prunplanner.org/verify-email/:code#top",
					$session_entry_url:
						"https://prunplanner.org/password-reset/:code",
					$exception_list: [
						{ value: "failed on /password-reset/:code" },
					],
				});
				expect(masked?.$set_once).toEqual({
					$initial_referrer:
						"https://prunplanner.org/password-reset/:code",
					$initial_pathname: "/verify-email/:code",
				});
				expect(JSON.stringify(masked)).not.toMatch(/abc123|def456/);
			}
		);

		it("masks the page URL in session replay snapshots", async () => {
			const { maskUrlCodes } = await load();
			const masked = maskUrlCodes(
				event("$snapshot", {
					$snapshot_data: [
						{
							type: 4,
							data: { href: "https://prunplanner.org/verify-email/def456" },
						},
					],
				})
			);

			expect(masked?.properties.$snapshot_data[0].data.href).toBe(
				"https://prunplanner.org/verify-email/:code"
			);
		});

		it("leaves other URLs and the bare routes untouched", async () => {
			const { maskUrlCodes } = await load();
			const properties = {
				$current_url: "https://prunplanner.org/plan/1234-abcd",
				$pathname: "/password-reset",
				$referrer: "https://prunplanner.org/verify-email/",
			};
			const input = event("$pageview", properties);

			const masked = maskUrlCodes(input);

			expect(masked?.properties).toBe(properties);
			expect(masked?.properties).toEqual({
				$current_url: "https://prunplanner.org/plan/1234-abcd",
				$pathname: "/password-reset",
				$referrer: "https://prunplanner.org/verify-email/",
			});
		});

		it("does not throw on events without URL properties", async () => {
			const { maskUrlCodes } = await load();

			expect(maskUrlCodes(null)).toBeNull();
			expect(maskUrlCodes(event("plan:view", {}))).toEqual(
				event("plan:view", {})
			);
			expect(
				maskUrlCodes(event("plan:view", { count: 2, ok: null }))?.properties
			).toEqual({ count: 2, ok: null });
		});
	});

	describe("dropChunkLoadErrors", () => {
		const CHUNK =
			"Failed to fetch dynamically imported module: https://prunplanner.org/assets/chunks/HomepageView.abc123.js";
		const exception = (...values: string[]) => ({
			uuid: "u",
			event: "$exception",
			properties: {
				$exception_list: values.map((value) => ({
					type: "TypeError",
					value,
					mechanism: { handled: false },
				})),
			},
		});

		it("drops an exception that is only a chunk-load error", async () => {
			const { dropChunkLoadErrors } = await load();

			expect(dropChunkLoadErrors(exception(CHUNK))).toBeNull();
		});

		it("keeps other exceptions, mixed ones included", async () => {
			const { dropChunkLoadErrors } = await load();
			const other = exception("Cannot read properties of undefined");
			const mixed = exception(CHUNK, "Cannot read properties of undefined");

			expect(dropChunkLoadErrors(other)).toBe(other);
			expect(dropChunkLoadErrors(mixed)).toBe(mixed);
		});

		it("keeps other events and exceptions without a list", async () => {
			const { dropChunkLoadErrors } = await load();
			const pageview = {
				uuid: "u",
				event: "$pageview",
				properties: { message: CHUNK },
			};
			const empty = { uuid: "u", event: "$exception", properties: {} };

			expect(dropChunkLoadErrors(null)).toBeNull();
			expect(dropChunkLoadErrors(pageview)).toBe(pageview);
			expect(dropChunkLoadErrors(empty)).toBe(empty);
		});
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
			real.capture("plan:view");

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
