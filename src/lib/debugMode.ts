import { ref, type Ref } from "vue";

// Composables
import { toast } from "@/ui/useToast";
import { readStorage, writeStorage } from "@/lib/storage";

/**
 * # Debug modes
 *
 * Hidden, opt-in debug tooling, stored in `localStorage` as a comma
 * separated list of mode names (`"calc"`). Unknown names are kept but
 * ignored. Without storage every mode is off. English only by
 * decision, like all debug tooling.
 */

const STORAGE_KEY = "prunplanner_debug";

function readModes(value: string | null | undefined): string[] {
	return (value ?? "")
		.split(",")
		.map((m) => m.trim())
		.filter((m) => m !== "");
}

// adds or removes one mode in storage
function writeMode(mode: string, on: boolean): void {
	const modes = readModes(readStorage(STORAGE_KEY)).filter((m) => m !== mode);
	if (on) modes.push(mode);
	// no storage: on for this tab only
	writeStorage(STORAGE_KEY, modes.length ? modes.join(",") : null);
}

/** the calculation debug panel on the plan page is available */
export const calcDebug: Ref<boolean> = ref(
	readModes(readStorage(STORAGE_KEY)).includes("calc")
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

// other tabs follow
if (typeof window !== "undefined")
	window.addEventListener("storage", (e: StorageEvent) => {
		if (e.key === STORAGE_KEY || e.key === null)
			calcDebug.value = readModes(e.newValue).includes("calc");
	});
