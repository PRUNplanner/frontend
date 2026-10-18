import { ref, type Ref } from "vue";

// Composables
import { toast } from "@/ui/useToast";
import { trackEvent } from "@/lib/analytics/useAnalytics";

/**
 * # Debug modes
 *
 * Hidden, opt-in debug tooling, stored in `localStorage` as a comma
 * separated list of mode names (`"calc"` today). Unknown names are kept
 * but ignored. Without storage every mode is off. English only by
 * decision, like all debug tooling.
 */

const STORAGE_KEY = "prunplanner_debug";

function readModes(value: string | null | undefined): string[] {
	return (value ?? "")
		.split(",")
		.map((m) => m.trim())
		.filter((m) => m !== "");
}

function readStorage(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

/** the calculation debug panel on the plan page is available */
export const calcDebug: Ref<boolean> = ref(
	readModes(readStorage()).includes("calc")
);

/**
 * Turns calculation debug on or off, with a toast
 * @author jplacht
 *
 * @param {boolean} on Debug on
 * @param {"url" | "debug_page" | "panel"} source What switched it
 */
export function setCalcDebug(
	on: boolean,
	source: "url" | "debug_page" | "panel"
): void {
	const modes = readModes(readStorage()).filter((m) => m !== "calc");
	if (on) modes.push("calc");
	try {
		if (modes.length) localStorage.setItem(STORAGE_KEY, modes.join(","));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// no storage: on for this tab only
	}

	calcDebug.value = on;
	toast(
		on
			? "Calculation debug on. Open a plan to see it."
			: "Calculation debug off.",
		{ type: "info" }
	);
	trackEvent("debug:calc_toggle", { on, source });
}

// other tabs follow
if (typeof window !== "undefined")
	window.addEventListener("storage", (e: StorageEvent) => {
		if (e.key === STORAGE_KEY || e.key === null)
			calcDebug.value = readModes(e.newValue).includes("calc");
	});
