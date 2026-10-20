import { nextTick, onBeforeUnmount, onMounted } from "vue";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";
import {
	navigationKind,
	navigationStartedAt,
} from "@/lib/perf/navigationStart";

/**
 * Measures when a page's main content is on screen: `contentReady()` marks
 * `content-ready` and sends `perf:content_ready` after the content's first
 * frame. Once per mount, and never for a load the tab spent hidden.
 *
 * @param {boolean} [loaderShown=false] a loader card was shown before
 * @returns {{ contentReady: () => void }} Call once the content has data
 */
export function useContentReady(loaderShown: boolean = false) {
	let hidden = document.visibilityState === "hidden";
	let sent = false;
	const onVisibility = () => {
		if (document.visibilityState === "hidden") hidden = true;
	};
	onMounted(() =>
		document.addEventListener("visibilitychange", onVisibility)
	);
	onBeforeUnmount(() =>
		document.removeEventListener("visibilitychange", onVisibility)
	);

	async function contentReady(): Promise<void> {
		if (sent) return;
		sent = true;
		await nextTick();
		requestAnimationFrame(() => {
			if (hidden) return;
			performance.mark("content-ready");
			trackEvent("perf:content_ready", {
				ms: Math.round(performance.now() - navigationStartedAt()),
				nav: navigationKind(),
				loader_shown: loaderShown,
			});
		});
	}

	return { contentReady };
}
