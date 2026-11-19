import { computed, type ComputedRef } from "vue";

// Util
import { transferAction } from "@/features/xit/xitAction.util";

// Types & Interfaces
import type { IXITTransferMaterial } from "@/features/xit/xitAction.types";

export function useXITAction() {
	/**
	 * Generates a XIT Transfer action with given materials and options
	 *
	 * @author jplacht
	 *
	 * @param {IXITTransferMaterial[]} materials Materials to Transfer
	 * @param options Transfer options: name, origin, destination, buy
	 * @returns {ComputedRef<string>} JSON string
	 */
	function transferJSON(
		materials: IXITTransferMaterial[],
		options?: {
			name?: string;
			origin?: string;
			destination?: string;
			buy?: boolean;
		}
	): ComputedRef<string> {
		const action = transferAction(materials, options);
		return computed(() => JSON.stringify(action));
	}

	return {
		transferJSON,
	};
}
