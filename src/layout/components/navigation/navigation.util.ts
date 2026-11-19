// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";

// Types & Interfaces
import type {
	INavPlan,
	NavArea,
	NavSection,
} from "@/layout/components/navigation/navigation.types";

/** from this many plans on, the plan lists get a filter field */
export const FILTER_FROM = 15;

/**
 * Plans A–Z by name, case-insensitive
 * @author jplacht
 */
export function sortPlans(plans: INavPlan[]): INavPlan[] {
	return [...plans].sort((a, b) =>
		a.plan_name.localeCompare(b.plan_name, undefined, {
			sensitivity: "base",
		})
	);
}

/**
 * Plans whose name or planet id contains the text, case-insensitive
 * @author jplacht
 */
export function filterPlans(plans: INavPlan[], text: string): INavPlan[] {
	const needle = text.trim().toLowerCase();
	if (!needle) return plans;
	return plans.filter(
		(p) =>
			p.plan_name.toLowerCase().includes(needle) ||
			p.planet_natural_id.toLowerCase().includes(needle)
	);
}

/** up to two letters for the empire badge */
export function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters =
		words.length > 1
			? words[0][0] + words[1][0]
			: (words[0] ?? "").slice(0, 2);
	return letters.toUpperCase();
}

/**
 * One navigation click, so the menu can be measured (autocapture is off)
 * @author jplacht
 */
export function trackNav(
	target: string,
	area: NavArea,
	section: NavSection
): void {
	trackEvent("app:nav_click", { target, area, section });
}
