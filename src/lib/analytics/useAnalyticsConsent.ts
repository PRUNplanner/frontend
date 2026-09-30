import { computed, ref, type Ref } from "vue";

type AnalyticsConsent = "granted" | "denied";

const STORAGE_KEY = "prunplanner_analytics_consent";

function readStored(): AnalyticsConsent | null {
	try {
		const value = localStorage.getItem(STORAGE_KEY);
		return value === "granted" || value === "denied" ? value : null;
	} catch {
		// storage blocked (private mode): not asked
		return null;
	}
}

// the choice made in this browser, null = not asked yet
const stored: Ref<AnalyticsConsent | null> = ref(readStored());

// Do-Not-Track or Global Privacy Control
const isDNT: boolean =
	navigator.doNotTrack === "1" ||
	(navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl ===
		true;

// with DNT the answer is always no, and nobody is asked
const consent = computed<AnalyticsConsent | null>(() =>
	isDNT ? "denied" : stored.value
);

function store(value: AnalyticsConsent): void {
	stored.value = value;
	try {
		localStorage.setItem(STORAGE_KEY, value);
	} catch {
		// storage blocked: the choice lasts until the page is closed
	}
}

/**
 * Analytics consent of this browser. Shared module state, so the dialog,
 * the profile toggle and the PostHog wrapper see the same value.
 */
export function useAnalyticsConsent() {
	return {
		consent,
		isDNT,
		grant: () => store("granted"),
		deny: () => store("denied"),
	};
}
