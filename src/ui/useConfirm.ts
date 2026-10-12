import { shallowRef } from "vue";

import type { PConfirmOptions } from "@/ui/ui.types";

// the open confirm, rendered by the one PConfirmHost in AppProvider
export const pendingConfirm = shallowRef<{
	options: PConfirmOptions;
	resolve: (confirmed: boolean) => void;
} | null>(null);

/**
 * Settles the open confirm and closes it
 *
 * @param {boolean} confirmed Positive button chosen
 */
export function settleConfirm(confirmed: boolean): void {
	pendingConfirm.value?.resolve(confirmed);
	pendingConfirm.value = null;
}

/**
 * Asks before something destructive, in the kit's modal
 *
 * @author jplacht
 *
 * @returns {Function} confirm(options), resolves true on the positive
 * button and false on cancel, Esc, mask or X
 */
export function useConfirm() {
	return function confirm(options: PConfirmOptions): Promise<boolean> {
		// a newer question replaces an unanswered one
		settleConfirm(false);
		return new Promise((resolve) => {
			pendingConfirm.value = { options, resolve };
		});
	};
}
