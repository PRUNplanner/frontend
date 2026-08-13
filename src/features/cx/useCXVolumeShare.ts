import { Ref, ref, watchEffect } from "vue";

// Stores
import { usePlanningStore } from "@/stores/planningStore";

// Composables
import { useExchangeData } from "@/database/services/useExchangeData";
import { usePreferences } from "@/features/preferences/usePreferences";

// Calculation Utils
import {
	CX_VOLUME_EXCHANGES,
	calculateCXVolumeShare,
} from "@/features/cx/cxVolumeShare";

// Types & Interfaces
import { EXCHANGES_TYPE } from "@/database/services/useExchangeData.types";
import { IExchange } from "@/features/api/gameData.types";
import { ICXData } from "@/stores/planningStore.types";
import {
	ICXVolumeRow,
	ICXVolumeShare,
	ICXVolumeThresholds,
} from "@/features/cx/cxVolumeShare.types";

/**
 * Resolves the exchange a CX configuration sells at from its empire
 * exchange preference. Anything unresolvable measures against the
 * universe, which is never wrong, only less specific
 * @author raukk
 *
 * @export
 * @param {string | undefined} cxUuid CX configuration uuid
 * @returns {EXCHANGES_TYPE} Exchange the surplus lands on
 */
export function resolveSellExchange(
	cxUuid: string | undefined
): EXCHANGES_TYPE {
	if (!cxUuid) return "UNIVERSE";

	try {
		const cxData: ICXData = usePlanningStore().getCX(cxUuid).cx_data;

		// a "BOTH" preference stands in for the missing "SELL" one, the
		// backend forbids holding both at once
		const preference = cxData.cx_empire.find(
			(entry) => entry.type === "SELL" || entry.type === "BOTH"
		);

		if (!preference) return "UNIVERSE";

		// preference codes are `<EXCHANGE>_<WINDOW>`, e.g. "AI1_30D"
		const code = preference.exchange.split("_")[0] as EXCHANGES_TYPE;

		return CX_VOLUME_EXCHANGES.includes(code) ? code : "UNIVERSE";
	} catch {
		return "UNIVERSE";
	}
}

/**
 * Keeps a ticker keyed map of volume shares in step with the material
 * rows handed in
 * @author raukk
 *
 * @export
 * @param {Ref<ICXVolumeRow[]>} rows Material rows and their daily sales
 * @param {Ref<string | undefined>} cxUuid CX configuration of the plan
 * @returns {{ volumeShares: Ref<Map<string, ICXVolumeShare>> }} Shares
 */
export function useCXVolumeShare(
	rows: Ref<ICXVolumeRow[]>,
	cxUuid: Ref<string | undefined>
): { volumeShares: Ref<Map<string, ICXVolumeShare>> } {
	const { cxVolumeYellowPercent, cxVolumeRedPercent } = usePreferences();

	const volumeShares: Ref<Map<string, ICXVolumeShare>> = ref(new Map());

	// guards against an earlier, slower run overwriting a later one
	let generation: number = 0;

	watchEffect(async () => {
		// every reactive read happens before the first await, a dependency
		// picked up after it would not be tracked
		const localRows: ICXVolumeRow[] = rows.value.filter(
			(row) => row.soldPerDay > 0
		);
		const exchange: EXCHANGES_TYPE = resolveSellExchange(cxUuid.value);
		const thresholds: ICXVolumeThresholds = {
			yellowPercent: cxVolumeYellowPercent.value,
			redPercent: cxVolumeRedPercent.value,
		};

		const run: number = ++generation;

		if (localRows.length === 0) {
			volumeShares.value = new Map();
			return;
		}

		const { getExchangeTicker } = await useExchangeData();

		const next: Map<string, ICXVolumeShare> = new Map();

		await Promise.all(
			localRows.map(async (row) => {
				try {
					const data: IExchange = await getExchangeTicker(
						`${row.ticker}.${exchange}`
					);

					next.set(
						row.ticker,
						calculateCXVolumeShare(
							row.ticker,
							exchange,
							row.soldPerDay,
							{
								sumTraded7d: data.sum_traded_7d,
								sumTraded30d: data.sum_traded_30d,
							},
							thresholds
						)
					);
				} catch {
					// no exchange record for the ticker, nothing to warn about
				}
			})
		);

		if (run === generation) volumeShares.value = next;
	});

	return { volumeShares };
}
