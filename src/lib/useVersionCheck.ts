/**
 * Composable to set the version from version.json
 * as the current version and then continuously watch for a new
 * version being pushed to the server.
 *
 * Will be skipped in vue dev mode.
 *
 * @author jplacht
 */

import { ref } from "vue";

const currentVersion = ref<string | null>(null);
const updateAvailable = ref(false);
const LOCAL_KEY = "prunplanner_version";

export function useVersionCheck(interval = 60_000) {
	function startWatch(): void {
		// skip on dev mode
		if (import.meta.env.DEV) return;
		checkVersion();
		setInterval(checkVersion, interval);
	}

	const checkVersion = async () => {
		// skip on dev mode
		if (import.meta.env.DEV) return;

		try {
			const res = await fetch("/version.json", { cache: "no-cache" });
			const data = await res.json();

			const latestVersion = data.version;
			const storedVersion = localStorage.getItem(LOCAL_KEY);

			// no stored version
			if (!storedVersion) {
				currentVersion.value = latestVersion;
				updateAvailable.value = true;
				return;
			}

			currentVersion.value = storedVersion;

			if (storedVersion != latestVersion) {
				updateAvailable.value = true;
			}
		} catch (err) {
			console.warn("Version check failed", err);
		}
	};

	async function markUpdated(): Promise<void> {
		// skip on dev mode
		if (import.meta.env.DEV) return;

		const res = await fetch("/version.json", { cache: "no-cache" });
		const data = await res.json();
		const latestVersion = data.version;

		localStorage.setItem(LOCAL_KEY, latestVersion);
		updateAvailable.value = false;
	}

	/**
	 * Shows the update notification without a version check, e.g. when a
	 * newer version took over the IndexedDB in another tab
	 */
	function markOutdated(): void {
		updateAvailable.value = true;
	}

	return {
		currentVersion,
		updateAvailable,
		markOutdated,
		markUpdated,
		checkVersion,
		startWatch,
	};
}
