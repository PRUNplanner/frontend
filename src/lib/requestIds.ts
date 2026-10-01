import { getSessionId } from "@/lib/analytics/usePostHog";

// this tab's session without PostHog: in memory only, never stored
const TAB_ID: string = crypto.randomUUID();

/**
 * Session id sent as X-Correlation-ID: PostHog's session id while it
 * runs (links a backend log line to the replay), else this tab's id.
 *
 * @returns {string} Session id
 */
export function correlationId(): string {
	return getSessionId() ?? TAB_ID;
}
