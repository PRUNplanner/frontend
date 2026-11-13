/**
 * How the next help article was reached, set by the click that navigates
 * (help nav, search) and taken by the article page for help:article_view.
 */
import type { HelpViewSource } from "@/lib/analytics/useAnalytics.types";

let next: HelpViewSource | undefined;

export function markHelpSource(source: HelpViewSource): void {
	next = source;
}

export function takeHelpSource(): HelpViewSource | undefined {
	const source = next;
	next = undefined;
	return source;
}
