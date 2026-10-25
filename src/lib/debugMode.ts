import { ref, type Ref } from "vue";

// Composables
import { toast } from "@/ui/useToast";

/**
 * # Debug modes
 *
 * Hidden, opt-in debug tooling, stored in `localStorage` as a comma
 * separated list of mode names (`"calc"`, `"gaps"`). Unknown names are kept
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

// adds or removes one mode in storage
function writeMode(mode: string, on: boolean): void {
	const modes = readModes(readStorage()).filter((m) => m !== mode);
	if (on) modes.push(mode);
	try {
		if (modes.length) localStorage.setItem(STORAGE_KEY, modes.join(","));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// no storage: on for this tab only
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
 */
export function setCalcDebug(on: boolean): void {
	writeMode("calc", on);
	calcDebug.value = on;
	toast(
		on
			? "Calculation debug on. Open a plan to see it."
			: "Calculation debug off.",
		{ type: "info" }
	);
}

/** the market report's price gaps show, hidden until their floors are tuned */
export const marketGapsDebug: Ref<boolean> = ref(
	readModes(readStorage()).includes("gaps")
);

/**
 * Shows or hides the market report's price gaps
 * @author jplacht
 *
 * @param {boolean} on Shown
 */
export function setMarketGapsDebug(on: boolean): void {
	writeMode("gaps", on);
	marketGapsDebug.value = on;
	if (on)
		toast("Market price gaps shown. ?debug=off hides them.", {
			type: "info",
		});
}

// other tabs follow
if (typeof window !== "undefined")
	window.addEventListener("storage", (e: StorageEvent) => {
		if (e.key === STORAGE_KEY || e.key === null) {
			calcDebug.value = readModes(e.newValue).includes("calc");
			marketGapsDebug.value = readModes(e.newValue).includes("gaps");
		}
	});
