/**
 * Watches for a newer build: compares the deployed version.json with the
 * build this tab runs (__BUILD_ID__), so every tab knows on its own. Polls
 * only while the tab is visible, and not while the notice waits for the
 * user.
 *
 * Skipped in vue dev mode.
 *
 * @author jplacht
 */

import { computed, ref } from "vue";
import { writeStorage } from "@/lib/storage";

const POLL_MS = 5 * 60_000;
const MIN_GAP_MS = 60_000;

const updateAvailable = ref(false);
const latestVersion = ref<string | null>(null);
// dismissed with "Later" for this build, in this tab only
const dismissedVersion = ref<string | null>(null);
// a newer version took over the IndexedDB in another tab
const outdated = ref(false);

const showNotice = computed(
	() =>
		outdated.value ||
		(updateAvailable.value &&
			latestVersion.value !== dismissedVersion.value)
);
const showChip = computed(() => updateAvailable.value && !showNotice.value);

let lastCheck = 0;
let watching = false;

async function checkVersion(): Promise<void> {
	if (import.meta.env.DEV) return;
	lastCheck = Date.now();

	try {
		const res = await fetch("/version.json", { cache: "no-cache" });
		// the SPA fallback answers with index.html during a deploy
		const data = await res.json();
		if (typeof data?.version !== "string") return;

		latestVersion.value = data.version;
		updateAvailable.value = data.version !== __BUILD_ID__;
	} catch (err) {
		console.warn("Version check failed", err);
	}
}

function checkIfDue(): void {
	if (document.visibilityState !== "visible") return;
	// the notice is waiting for the user, nothing new to learn
	if (showNotice.value) return;
	if (Date.now() - lastCheck < MIN_GAP_MS) return;
	checkVersion();
}

function startWatch(): void {
	if (import.meta.env.DEV || watching) return;
	watching = true;

	// left by older builds, which compared against it
	writeStorage("prunplanner_version", null);

	checkIfDue();
	setInterval(checkIfDue, POLL_MS);
	document.addEventListener("visibilitychange", checkIfDue);
	window.addEventListener("online", checkIfDue);
}

function later(): void {
	dismissedVersion.value = latestVersion.value;
}

function markOutdated(): void {
	outdated.value = true;
}

export function useVersionCheck() {
	return {
		updateAvailable,
		latestVersion,
		outdated,
		showNotice,
		showChip,
		checkVersion,
		startWatch,
		later,
		markOutdated,
	};
}
