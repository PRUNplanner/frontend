import type {
	PlanetCOGCProgramType,
	PlanetEnvironmentType,
} from "@/features/api/schemas/gameData.schemas";
import type {
	PlanetSearchExtra,
	PlanetSearchFilter,
	PlanetSearchInfrastructure,
	PlanetSearchMaterialGroup,
	PlanetSearchReference,
	PlanetSearchSurface,
	PlanetSearchView,
} from "@/features/planet_search/planetSearch.schemas";

export interface IPlanetSearchSort {
	key: string; // "name" | "fert" | "mat:<ticker>" | "ref:<refKey>"
	dir: "asc" | "desc";
}

/** Everything the URL carries: the filter plus sort, view and pins */
export interface IPlanetSearchState {
	filter: PlanetSearchFilter;
	/** sort chain, empty = the default sort */
	sort: IPlanetSearchSort[];
	view: PlanetSearchView;
	pins: string[];
}

export interface IPlanetEnvironmentBuckets {
	surface: boolean;
	gravity_type: PlanetEnvironmentType;
	pressure_type: PlanetEnvironmentType;
	temperature_type: PlanetEnvironmentType;
}

export type IPlanetEnvironmentReason =
	| "rocky"
	| "gaseous"
	| "low_gravity"
	| "high_gravity"
	| "low_pressure"
	| "high_pressure"
	| "low_temperature"
	| "high_temperature";

export interface IPlanetEnvironmentExtra {
	ticker: string;
	reason: IPlanetEnvironmentReason;
}

/** Engine inputs that aren't part of the filter */
export interface IPlanetSearchContext {
	now: number;
	/** jumps from a reference's system to every system; undefined = unknown reference, ignored */
	refJumps: (ref: PlanetSearchReference) => Map<string, number> | undefined;
}

/** Toggled-option result counts, keyed like the panel's options */
export interface IPlanetSearchFacets {
	/** per group index: ticker → count if added to that group */
	materials: Record<string, number>[];
	surface: Record<PlanetSearchSurface, number>;
	fertile: number;
	extras: Record<PlanetSearchExtra, number>;
	cogc: Record<string, number>;
	infrastructure: Record<PlanetSearchInfrastructure, number>;
	/** refKey → count */
	references: Record<string, number>;
}

/** An active constraint as a removable chip; the UI renders its label */
export type IPlanetSearchChip = (
	| { kind: "text"; text: string }
	| { kind: "groups_any"; groups: PlanetSearchMaterialGroup[] }
	| { kind: "group"; group: PlanetSearchMaterialGroup }
	| { kind: "cogc"; programs: PlanetCOGCProgramType[] }
	| { kind: "infrastructure"; value: PlanetSearchInfrastructure }
	| { kind: "fertile" }
	| { kind: "surface"; surface: PlanetSearchSurface[] }
	| { kind: "extras"; extras: PlanetSearchExtra[] }
	| {
			kind: "references";
			references: PlanetSearchReference[];
			maxJumps: number;
	  }
) & { key: string; remove: PlanetSearchFilter };

export type IPlanetSearchHint = (
	| { kind: "chip"; chip: IPlanetSearchChip }
	| { kind: "gaseous" }
	| { kind: "extras" }
	| { kind: "jumps"; maxJumps: number }
) & { filter: PlanetSearchFilter; count: number };
