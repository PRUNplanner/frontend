// Engine
import { parseRefKey } from "@/features/planet_search/planetSearch.engine";

// Types & Interfaces
import type {
	PlanetSearchMaterialGroup,
	PlanetSearchReference,
} from "@/features/planet_search/planetSearch.schemas";
import type {
	IPlanetSearchChip,
	IPlanetSearchHint,
} from "@/features/planet_search/planetSearch.types";

type ITranslate = (key: string, params?: Record<string, unknown>) => string;

function groupLabel(
	group: PlanetSearchMaterialGroup,
	minDaily: Record<string, number>,
	t: ITranslate
): string {
	const parts = group.materials.map((m) =>
		minDaily[m] ? t("planet_search.chips.min", { material: m, n: minDaily[m] }) : m
	);
	const joined = parts.join(
		t(group.op === "all" ? "planet_search.chips.and" : "planet_search.chips.or")
	);
	return parts.length > 1 ? `(${joined})` : joined;
}

/**
 * Chip text with the actual values, e.g. "(FEO ≥15/d or MAG)"
 * @author jplacht
 *
 * @param refName Display name of a reference (plan name or CX code)
 */
export function chipLabel(
	chip: IPlanetSearchChip,
	minDaily: Record<string, number>,
	t: ITranslate,
	refName: (ref: PlanetSearchReference) => string
): string {
	switch (chip.kind) {
		case "text":
			return t("planet_search.chips.name", { text: chip.text });
		case "groups_any":
			return chip.groups
				.map((g) => groupLabel(g, minDaily, t))
				.join(t("planet_search.chips.groups_or"));
		case "group":
			return groupLabel(chip.group, minDaily, t);
		case "cogc":
			return t("planet_search.chips.cogc", {
				programs: chip.programs
					.map((p) => t(`game.cogc_program.${p}`))
					.join(t("planet_search.chips.or")),
			});
		case "infrastructure":
			return chip.value;
		case "fertile":
			return t("planet_search.chips.fertile");
		case "surface":
			return t("planet_search.chips.surface", {
				surfaces: chip.surface
					.map((s) => t(`planet_search.conditions.${s}`))
					.join(" + "),
			});
		case "extras":
			return t("planet_search.chips.extras", {
				extras: chip.extras.join(", "),
			});
		case "references":
			return t("planet_search.chips.references", {
				n: chip.maxJumps,
				refs: chip.references
					.map(refName)
					.join(t("planet_search.chips.and")),
			});
	}
}

/** Hint button text, e.g. "Include gaseous planets → 12 planets" */
export function hintLabel(
	hint: IPlanetSearchHint,
	minDaily: Record<string, number>,
	t: ITranslate,
	refName: (ref: PlanetSearchReference) => string
): string {
	let label: string;
	switch (hint.kind) {
		case "chip":
			label = t("planet_search.hints.chip", {
				label: chipLabel(hint.chip, minDaily, t, refName),
			});
			break;
		case "jumps":
			label = t("planet_search.hints.jumps", { n: hint.maxJumps });
			break;
		default:
			label = t(`planet_search.hints.${hint.kind}`);
	}
	return t("planet_search.hints.result", { label, n: hint.count });
}

/** Column name of a sort key, e.g. "FEO", "NC1", a plan's name */
export function sortLabel(
	key: string,
	t: ITranslate,
	refName: (ref: PlanetSearchReference) => string
): string {
	if (key === "name") return t("planet_search.results.planet");
	if (key === "fert") return t("planet_search.columns.fert");
	if (key.startsWith("mat:")) return key.slice(4);
	const ref = parseRefKey(key.slice(4));
	return ref ? refName(ref) : key;
}
