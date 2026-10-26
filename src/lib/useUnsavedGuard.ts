/**
 * Asks before a view with unsaved changes is left: in-app navigation
 * through a confirm, tab close or reload through the browser's own prompt.
 */

import { onUnmounted, shallowReactive, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";

// the mounted guards' checks, for hasUnsavedChanges()
const guards = shallowReactive(new Set<() => boolean>());

/** True while any mounted view has unsaved changes (reactive). */
export function hasUnsavedChanges(): boolean {
	return [...guards].some((unsaved) => unsaved());
}

export function useUnsavedGuard(
	unsaved: () => boolean,
	message: () => string,
	onAsk?: () => void
): void {
	// A redirect from a global guard ("/" to "/empire" when logged in) runs
	// the leave guards again for the same navigation: ask only once.
	let confirmedPath: string | undefined;

	guards.add(unsaved);

	onBeforeRouteLeave((to) => {
		if (!unsaved()) return;
		if (to.redirectedFrom && to.redirectedFrom.fullPath === confirmedPath)
			return;

		onAsk?.();
		if (!confirm(message())) return false;
		confirmedPath = to.fullPath;
	});

	function onBeforeUnload(e: BeforeUnloadEvent): void {
		e.preventDefault();
	}

	watch(
		unsaved,
		(isUnsaved) => {
			if (isUnsaved)
				window.addEventListener("beforeunload", onBeforeUnload);
			else window.removeEventListener("beforeunload", onBeforeUnload);
		},
		{ immediate: true }
	);

	onUnmounted(() => {
		guards.delete(unsaved);
		window.removeEventListener("beforeunload", onBeforeUnload);
	});
}
