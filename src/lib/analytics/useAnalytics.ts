import { debounce, type DebouncedFunc } from "lodash-es";

import {
	capture,
	captureException,
	identify,
	register,
	reset,
	setUserProp,
} from "@/lib/analytics/usePostHog";

// Types & Interfaces
import type { ComponentPublicInstance } from "vue";
import type { Properties } from "posthog-js";
import type {
	ANALYTICS_EVENT_TYPE,
	IAnalyticsEventProperties,
	IPlanEditProperties,
} from "@/lib/analytics/useAnalytics.types";
import type { UserProfile } from "@/features/api/schemas/user.schemas";

/**
 * Sends an event of the tracking plan (docs/analytics.md). Plan edits
 * go through trackPlanEdit, which debounces them.
 */
export function trackEvent<
	E extends Exclude<ANALYTICS_EVENT_TYPE, "plan:edit">,
>(event: E, props?: IAnalyticsEventProperties[E]): void {
	// the automatic optimization runs on every plan change
	if (
		event === "plan:hab_optimize" &&
		(props as IAnalyticsEventProperties["plan:hab_optimize"])?.goal ===
			"auto"
	)
		return;

	capture(event, props);
}

const PLAN_EDIT_DEBOUNCE_MS = 1000;

// pending plan:edit per edited control
const planEdits = new Map<
	string,
	DebouncedFunc<(props: IPlanEditProperties) => void>
>();

/**
 * Sends plan:edit, debounced per edited control: a burst of +/-
 * clicks is one event with the final values.
 */
export function trackPlanEdit(props: IPlanEditProperties): void {
	// the control that was edited: a field of a building, or of one
	// infrastructure, expert or workforce type
	const key = [
		props.field,
		props.building_ticker,
		props.infrastructure_type,
		props.expert_type,
		props.workforce_type,
		props.lux_type,
	].join("|");

	let send = planEdits.get(key);
	if (!send) {
		send = debounce(
			(last: IPlanEditProperties) => capture("plan:edit", last),
			PLAN_EDIT_DEBOUNCE_MS
		);
		planEdits.set(key, send);
	}
	send({
		...props,
		is_shared: window.location.pathname.startsWith("/shared/"),
	});
}

/**
 * Sends the pending plan edits now (before a save, on leaving the plan)
 */
export function flushPlanEdits(): void {
	planEdits.forEach((send) => send.flush());
}

/**
 * Sends the pageview of a route. PostHog's own pageview capture is off,
 * URLs carry uuids and planet ids and can't be grouped.
 */
export function trackPageview(routeName: string | undefined): void {
	trackContext({ route_name: routeName });
	capture("$pageview");
}

export function trackException(error: unknown, props?: Properties): void {
	captureException(error, props);
}

/**
 * Properties every later event and exception carries (e.g. route_name)
 */
export function trackContext(props: Properties): void {
	register(props);
}

/**
 * Vue's app.config.errorHandler: Vue catches component errors itself,
 * so PostHog's exception autocapture never sees them.
 */
export function trackVueError(
	err: unknown,
	instance: ComponentPublicInstance | null,
	info: string
): void {
	// apiService reports its own errors, and their message is the
	// response body or the Zod issues, which must not be sent
	const fromApi =
		err instanceof Error &&
		("status" in err || err.message.startsWith("Validation error"));

	if (!fromApi)
		trackException(err, {
			component:
				instance?.$options.name ?? instance?.$options.__name,
			vue_info: info,
		});
	console.error(err);
}

export function trackUser(props: Properties): void {
	setUserProp(props);
}

export function resetUser(): void {
	reset();
}

/**
 * Identifies the user with the person properties their profile holds
 */
export function identifyUser(profile: UserProfile): void {
	identify(profile.id.toString(), {
		username: profile.username,
		prun_username: profile.prun_username,
		is_fio_enabled: !!(profile.fio_apikey && profile.prun_username),
		has_verified_email: profile.is_email_verified,
	});
}
