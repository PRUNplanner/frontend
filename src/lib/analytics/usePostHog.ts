import { watch } from "vue";

// Composables
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

// Util
import { redact } from "@/util/data";

// Types & Interfaces
import type { PostHog, Properties } from "posthog-js";

const POSTHOG_NAME = "prunplanner_frontend";

const SENSITIVE_KEYS: string[] = [
	"password",
	"access_token",
	"refresh_token",
	"fio_apikey",
	"email",
	"old",
	"new",
	"code",
];

// storage keys PostHog writes: its own, the opt-out flag and survey state
const POSTHOG_STORAGE_KEY =
	/^((__)?ph_|seenSurvey_|inProgressSurvey_|lastSeenSurveyDate$)/;

// after a deny: nothing stored means off, and no feature flag requests
const OFF_BY_DEFAULT = (off: boolean) => ({
	opt_out_capturing_by_default: off,
	opt_out_persistence_by_default: off,
	advanced_disable_flags: off,
});

const { consent } = useAnalyticsConsent();

// loaded on the first grant, kept for a later grant after a deny
let posthog: PostHog | undefined = undefined;
// true while PostHog captures
let started = false;
// events between a grant and posthog-js being loaded, null otherwise
let queue: Array<[string, Properties | null | undefined]> | null = null;
// last identified user, so a later grant can identify them
let identity: { id: string; props?: Properties } | null = null;
// person properties set before the user is identified
let pendingUserProps: Properties = {};
// a pageview was dropped while off, sent once PostHog starts
let missedPageview = false;
// super properties, so a later grant can register them again
let superProps: Properties = {};

/**
 * Key can be public, as its web sdk + has configured authorized urls
 */
export function getPostHogKey(): string | undefined {
	return window.__APP_CONFIG__?.POSTHOG_KEY || undefined;
}

/**
 * Removes everything PostHog stored in this browser, including the
 * cookie of the setup before consent existed.
 */
function removePostHogStorage(): void {
	try {
		for (const storage of [localStorage, sessionStorage]) {
			Array.from({ length: storage.length }, (_, i) => storage.key(i))
				.filter(
					(key): key is string =>
						key !== null && POSTHOG_STORAGE_KEY.test(key)
				)
				.forEach((key) => storage.removeItem(key));
		}

		// the cookie was set on the host or on a parent domain
		const domains: string[] = location.hostname
			.split(".")
			.map((_, i, parts) => `; domain=.${parts.slice(i).join(".")}`);
		document.cookie
			.split(";")
			.map((cookie) => cookie.split("=")[0].trim())
			.filter((name) => name.startsWith("ph_"))
			.forEach((name) => {
				["", ...domains].forEach((domain) => {
					document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
				});
			});
	} catch {
		// storage blocked, nothing to remove
	}
}

/**
 * The page a visitor is on when they grant: its pageview came before
 * the grant and was dropped.
 */
function sendMissedPageview(): void {
	if (missedPageview) posthog?.capture("$pageview");
	missedPageview = false;
}

async function startAnalytics(): Promise<void> {
	const key = getPostHogKey();
	if (started || queue || !key) return;

	if (posthog) {
		// granted again after a deny, reopens the send path first
		posthog.__loaded = true;
		posthog.set_config(OFF_BY_DEFAULT(false));
		posthog.opt_in_capturing({ captureEventName: false });
		posthog.startSessionRecording();
		// reset() on the deny dropped them
		posthog.register({ app_version: __APP_VERSION__, ...superProps });
		started = true;
		if (identity) posthog.identify(identity.id, identity.props);
		sendMissedPageview();
		return;
	}

	queue = [];
	try {
		// own chunk (vendor_posthog), only fetched with consent
		const loaded = (await import("posthog-js")).default;

		// denied while loading
		if (consent.value !== "granted" || started) return;

		loaded.init(key, {
			api_host: "https://squirrel.prunplanner.org/relay-DWJJ",
			ui_host: "https://eu.posthog.com",
			defaults: "2026-08-30",
			person_profiles: "identified_only",
			name: POSTHOG_NAME,
			autocapture: true,
			// the router sends $pageview with route_name
			capture_pageview: false,
			// would follow capture_pageview otherwise
			capture_pageleave: true,
			// no cookie
			persistence: "localStorage",
			respect_dnt: true,
		});

		// register global versions
		loaded.register({
			app_version: __APP_VERSION__,
			...superProps,
		});

		posthog = loaded;
		started = true;

		if (identity) loaded.identify(identity.id, identity.props);
		sendMissedPageview();
		queue?.forEach(([event, props]) => loaded.capture(event, props));
	} catch (error) {
		console.warn("Analytics failed to load", error);
	} finally {
		queue = null;
	}
}

function stopAnalytics(): void {
	queue = null;

	if (posthog && started) {
		// reset() clears the stored opt-out (and would reload the feature
		// flags), and the cleanup below removes the opt-out as well, so
		// "nothing stored" has to mean off from here on
		posthog.set_config(OFF_BY_DEFAULT(true));
		posthog.opt_out_capturing();
		posthog.reset();
		posthog.stopSessionRecording();
		// closes the send path: posthog-js drops every request while not
		// loaded, so events it captured but has not sent yet (batch and
		// retry queue, the beacon on page leave) stay unsent
		posthog.__loaded = false;
	}
	started = false;

	removePostHogStorage();
}

// PostHog follows the consent: runs once on app start, then on each choice
watch(
	consent,
	(value) => {
		if (value === "granted") void startAnalytics();
		else stopAnalytics();
	},
	{ immediate: true }
);

export function capture(
	eventName: string,
	props?: Properties | null | undefined
): void {
	if (!started && !queue) {
		if (eventName === "$pageview") missedPageview = true;
		return;
	}
	if (eventName === "$pageview") missedPageview = false;

	// redact props
	const safeProps = props ? redact(props, SENSITIVE_KEYS) : props;

	if (started) posthog?.capture(eventName, safeProps);
	else queue?.push([eventName, safeProps]);
}

/**
 * Sends an error to PostHog error tracking. Not queued while PostHog
 * loads: without a started PostHog nothing is sent.
 */
export function captureException(error: unknown, props?: Properties): void {
	if (!started) return;

	posthog?.captureException(
		error,
		props ? redact(props, SENSITIVE_KEYS) : props
	);
}

/**
 * Sets super properties, sent with every event, exception and web vital.
 */
export function register(props: Properties): void {
	superProps = { ...superProps, ...props };
	if (started) posthog?.register(props);
}

/**
 * Sets person properties. Before the user is identified they are kept
 * for identify(): set on an anonymous visitor they would create a person
 * profile.
 */
export function setUserProp(props: Properties): void {
	if (!identity) {
		pendingUserProps = { ...pendingUserProps, ...props };
		return;
	}

	// unchanged values are not sent again, loaders set them on every page
	const known: Properties = identity.props ?? {};
	if (Object.entries(props).every(([key, value]) => known[key] === value))
		return;

	identity.props = { ...known, ...props };
	if (started) posthog?.people.set(props);
}

export function identify(id: string, props?: Properties): void {
	const known: Properties = identity?.id === id ? (identity.props ?? {}) : {};
	const merged: Properties = { ...known, ...pendingUserProps, ...props };
	pendingUserProps = {};

	// the profile reloads after every change, nothing new to send then
	const unchanged: boolean =
		identity?.id === id &&
		Object.entries(merged).every(([key, value]) => known[key] === value);

	identity = { id, props: merged };
	if (started && !unchanged) posthog?.identify(id, merged);
}

export function reset(): void {
	identity = null;
	pendingUserProps = {};
	if (!started) return;

	posthog?.reset();
	// reset() drops the super properties as well
	posthog?.register({ app_version: __APP_VERSION__, ...superProps });
}
