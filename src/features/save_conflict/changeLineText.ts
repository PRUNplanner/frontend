// Util
import { cogcTextMapping } from "@/features/planning_data/usePlan";
import { factionOptions } from "@/features/empire/empire.constants";

// Types & Interfaces
import type { PlanCOGCProgram } from "@/features/api/schemas/planningData.schemas";
import type { IChangeLine } from "@/features/save_conflict/saveConflict.types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

// as the exchange selects name them, e.g. "UNIVERSE VWAP 30D"
function exchange(value: string | number): string {
	return String(value)
		.replace(/_(7D|30D)$/, " VWAP $1")
		.replace("_", " ");
}

function faction(value: string | number): string {
	return (
		factionOptions.find((f) => f.value === value)?.label ?? String(value)
	);
}

/**
 * A change line in words: tickers stay, planets, programs, factions,
 * experts and workforces as the app names them elsewhere
 *
 * @author jplacht
 *
 * @param {IChangeLine} line Line
 * @param {Translate} t i18n translate
 * @param {(id: string) => string} planetName Planet name of a natural id
 * @returns {string} Text
 */
export function changeLineText(
	line: IChangeLine,
	t: Translate,
	planetName: (id: string) => string = (id) => id
): string {
	const params: Record<string, string | number> = { ...line.params };

	if (line.key === "cogc") {
		params.from = t(cogcTextMapping[params.from as PlanCOGCProgram]);
		params.to = t(cogcTextMapping[params.to as PlanCOGCProgram]);
	} else if (line.key === "faction") {
		params.from = faction(params.from);
		params.to = faction(params.to);
	} else if (line.key === "experts") {
		params.label = t(`game.expertise.${String(params.label).toUpperCase()}`);
	} else if (line.key.startsWith("lux_")) {
		params.label = t(`game.workforce_type.${params.label}`);
	} else if (line.key.startsWith("exchange")) {
		params.from = exchange(params.from);
		params.to = exchange(params.to);
	}
	if (params.planet) params.planet = planetName(String(params.planet));
	if (params.type) params.type = t(`save_conflict.type.${params.type}`);

	return t(`save_conflict.change.${line.key}`, params);
}
