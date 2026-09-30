import {
	capture,
	identify,
	reset,
	setUserProp,
} from "@/lib/analytics/usePostHog";

// Types & Interfaces
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

export function trackUser(props: Properties): void {
	setUserProp(props);
}

export function resetUser(): void {
	reset();
}

export function identifyUser(distinct_id: string, props?: Properties): void {
	identify(distinct_id, props);
}
