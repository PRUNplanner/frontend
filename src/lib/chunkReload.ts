/**
 * Recovers from chunks a deploy removed: an open tab still references the
 * old build's hashed files, so the next lazy route fails to load. Reloads
 * once to get the new build; if that already happened in the last 30 s the
 * chunk is really broken, so the error is shown instead of looping. The
 * same guard covers the silent update to a newer build on navigation.
 */

import type { Router } from "vue-router";
import { i18n } from "@/lib/i18n";
import { toast } from "@/ui/useToast";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useVersionCheck } from "@/lib/useVersionCheck";
import { hasUnsavedChanges } from "@/lib/useUnsavedGuard";

const KEY = "prunplanner_chunk_reload";
const GUARD_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
		message
	);
}

/**
 * Reloads (to url, if given) unless a reload already happened within the
 * guard window. Returns whether it reloaded.
 */
export function reloadOnce(url?: string): boolean {
	const last = Number(sessionStorage.getItem(KEY) ?? 0);
	if (Date.now() - last < GUARD_MS) return false;

	sessionStorage.setItem(KEY, String(Date.now()));
	if (url) window.location.assign(url);
	else window.location.reload();
	return true;
}

// the toast host lives in AppProvider, which stays mounted when a route's
// chunk fails
function showError(error: unknown): void {
	console.error(error);
	toast(i18n.global.t("common.ui.page_load_failed"), {
		type: "error",
		duration: 0,
		closable: true,
	});
}

export function registerChunkReload(router: Router): void {
	// during a navigation the failed import reaches router.onError, which
	// knows the target route; reloading here would land on the old page
	let navigating = false;
	router.beforeEach(() => {
		navigating = true;
	});
	router.afterEach(() => {
		navigating = false;
	});

	// any other lazy chunk (async components); Vite sends both failed
	// preloads and failed imports here. posthog-js handles its own failure
	// (a content blocker), a reload wouldn't help.
	window.addEventListener("vite:preloadError", (event) => {
		const error = event.payload;
		if (navigating || !isChunkLoadError(error)) return;
		if (String(error).includes("vendor_posthog")) return;
		if (reloadOnce()) event.preventDefault();
	});

	// a newer build is out: a navigation to another page loads it instead,
	// after the leave guards ran. Not for query changes (search filters) and
	// not while a view has unsaved changes: the leave was confirmed already,
	// the browser's prompt would ask a second time.
	const { updateAvailable, outdated } = useVersionCheck();
	router.beforeResolve((to, from) => {
		if (!updateAvailable.value && !outdated.value) return;
		if (to.path === from.path || hasUnsavedChanges()) return;
		if (!reloadOnce(to.fullPath)) return;
		trackEvent("app:version_reload", { source: "navigation" });
		return false;
	});

	router.onError((error, to) => {
		navigating = false;
		if (!isChunkLoadError(error)) return;
		if (!reloadOnce(to.fullPath)) showError(error);
	});
}
