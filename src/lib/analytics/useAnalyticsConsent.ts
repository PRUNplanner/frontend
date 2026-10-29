import { computed, ref, type Ref } from "vue";

import { readStorage, writeStorage } from "@/lib/storage";

type AnalyticsConsent = "granted" | "denied";

const STORAGE_KEY = "prunplanner_analytics_consent";

// storage blocked (private mode): not asked
function readStored(): AnalyticsConsent | null {
	const value = readStorage(STORAGE_KEY);
	return value === "granted" || value === "denied" ? value : null;
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

// the footer link asks a visitor again, until they choose
const reopened: Ref<boolean> = ref(false);

function store(value: AnalyticsConsent): void {
	stored.value = value;
	reopened.value = false;
	// storage blocked: the choice lasts until the page is closed
	writeStorage(STORAGE_KEY, value);
}

/**
 * Analytics consent of this browser. Shared module state, so the dialog,
 * the visitors' banner, the profile toggle and the PostHog wrapper see the
 * same value.
 */
export function useAnalyticsConsent() {
	return {
		consent,
		isDNT,
		grant: () => store("granted"),
		deny: () => store("denied"),
		reopened,
		reopen: () => (reopened.value = true),
	};
}
