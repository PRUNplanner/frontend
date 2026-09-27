import { computed, type ComputedRef } from "vue";

// Types & Interfaces
import type {
	IXITJSON,
	IXITTransferMaterial,
	XITACTIONTYPE,
} from "@/features/xit/xitAction.types";

import { XITSTATIONWAREHOUSESTOCX } from "@/features/xit/xitConstants";

export function useXITAction() {
	/**
	 * Generates a XIT Transfer action with given materials and options
	 *
	 * @author jplacht
	 *
	 * @param {IXITTransferMaterial[]} materials Materials to Transfer
	 * @param {?{
	 * 			name?: string;
	 * 			origin?: string;
	 * 			destination?: string;
	 * 		}} [options] Transfer Optons
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
		const actions: XITACTIONTYPE[] = [];
		if (
			options &&
			options.buy &&
			options.origin &&
			XITSTATIONWAREHOUSESTOCX[options.origin]
		) {
			const cx = XITSTATIONWAREHOUSESTOCX[options.origin]!;

			actions.push({
				group: "A1",
				exchange: cx,
				priceLimits: {},
				buyPartial: false,
				useCXInv: true,
				name: "BuyItems",
				type: "CX Buy",
			});
		}
		actions.push({
			type: "MTRA",
			name: "TransferAction",
			group: "A1",
			origin:
				options && options.origin
					? options.origin
					: "Configure on Execution",
			dest:
				options && options.destination
					? options.destination
					: "Configure on Execution",
		});
		return computed(() => {
			const actionFormat: IXITJSON = {
				actions,
				global: {
					name:
						options && options.name
							? `PRUNplanner ${options.name}`
							: "PRUNplanner",
				},
				groups: [
					{
						type: "Manual",
						name: "A1",
						materials: materials.reduce(
							(acc, item) => (
								(acc[item.ticker] = item.value),
								acc
							),
							{} as Record<string, number>
						),
					},
				],
			};

			return JSON.stringify(actionFormat);
		});
	}

	return {
		transferJSON,
	};
}
