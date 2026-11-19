// Types & Interfaces
import type {
	IXITJSON,
	IXITTransferMaterial,
	XITACTIONTYPE,
} from "@/features/xit/xitAction.types";

// the exchange a station warehouse buys from; pure, so the MCP server
// builds the same packages
export const XITSTATIONWAREHOUSESTOCX: { [key: string]: string | null } = {
	"Configure on Execution": null,
	"Antares Station Warehouse": "AI1",
	"Arclight Station Warehouse": "CI2",
	"Benten Station Warehouse": "CI1",
	"Hortus Station Warehouse": "IC1",
	"Hubur Station Warehouse": "NC2",
	"Moria Station Warehouse": "NC1",
};

/**
 * A XIT transfer package for Refined PrUn's XIT ACT: optionally a CX buy
 * on the origin station's exchange, then a transfer of the materials
 * @author jplacht
 *
 * @param {IXITTransferMaterial[]} materials Materials to transfer
 * @param options Name, origin and destination warehouse, buy first
 * @returns {IXITJSON} The package
 */
export function transferAction(
	materials: IXITTransferMaterial[],
	options?: {
		name?: string;
		origin?: string;
		destination?: string;
		buy?: boolean;
	}
): IXITJSON {
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
		// refined-prun opens an SFC step for packages it does not know
		noSfc: true,
	});
	// refined-prun XIT ACT only accepts names matching /^[ 0-9a-zA-Z.-]*$/
	const name = `PRUNplanner ${options?.name ?? ""}`
		.replace(/[^ 0-9a-zA-Z.-]/g, "")
		.replace(/ +/g, " ")
		.trim();
	return {
		actions,
		global: {
			name,
		},
		groups: [
			{
				type: "Manual",
				name: "A1",
				materials: materials.reduce(
					(acc, item) => ((acc[item.ticker] = item.value), acc),
					{} as Record<string, number>
				),
			},
		],
	};
}
