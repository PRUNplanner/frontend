import { ref, type Ref } from "vue";

import type { PToastEntry, PToastHandle, PToastOptions } from "@/ui/ui.types";

// the open toasts, rendered by the one PToastHost in AppProvider
export const toasts: Ref<PToastEntry[]> = ref([]);

// hide timer and duration per toast that closes by itself
const timers = new Map<
	number,
	{ duration: number; timer?: ReturnType<typeof setTimeout> }
>();
let nextId = 0;

/**
 * Removes a toast and its timer
 *
 * @param {number} id Toast id
 */
export function closeToast(id: number): void {
	clearTimeout(timers.get(id)?.timer);
	timers.delete(id);
	toasts.value = toasts.value.filter((t) => t.id !== id);
}

/**
 * Hover keeps a toast: stops its timer
 *
 * @param {number} id Toast id
 */
export function pauseToast(id: number): void {
	const entry = timers.get(id);
	clearTimeout(entry?.timer);
	if (entry) entry.timer = undefined;
}

/**
 * Starts a toast's full duration again, e.g. after a hover
 *
 * @param {number} id Toast id
 */
export function resumeToast(id: number): void {
	const entry = timers.get(id);
	if (!entry || entry.timer) return;
	entry.timer = setTimeout(() => closeToast(id), entry.duration);
}

/**
 * Shows a toast bottom-right. Works outside components too (chunkReload).
 *
 * @author jplacht
 *
 * @param {string} text Message
 * @param {PToastOptions} options type, action, duration (0 stays), closable
 * @returns {PToastHandle} destroy() closes it early
 */
export function toast(
	text: string,
	{
		type = "info",
		action,
		duration = 6000,
		closable = false,
	}: PToastOptions = {}
): PToastHandle {
	const id = nextId++;
	toasts.value = [...toasts.value, { id, text, type, action, closable }];
	if (duration > 0) {
		timers.set(id, { duration });
		resumeToast(id);
	}
	return { destroy: () => closeToast(id) };
}

/**
 * Toasts in the kit's look
 *
 * @returns {Function} toast(text, options), returns a handle to close it early
 */
export function useToast() {
	return toast;
}
