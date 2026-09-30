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
} from "@/lib/analytics/useAnalytics.types";

export function trackEvent<E extends ANALYTICS_EVENT_TYPE>(
	event: E,
	props?: IAnalyticsEventProperties[E]
): void {
	if (
		event === "plan_tool_optimize_habitation" &&
		(props as IAnalyticsEventProperties["plan_tool_optimize_habitation"])
			?.applyType === "auto"
	)
		return;

	capture(event, props);
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

export function identifyUser(distinct_id: string, props?: Properties): void {
	identify(distinct_id, props);
}
