import type {
	APIEndpointFormat,
	APIEndpointParam,
	IAPIEndpoint,
} from "@/features/api_keys/apiEndpoints.types";

const FRESHNESS = "api_keys.builder.freshness";

function entry(
	id: string,
	group: IAPIEndpoint["group"],
	path: string,
	options: Partial<IAPIEndpoint> = {}
): IAPIEndpoint {
	return {
		id,
		labelKey: `api_keys.builder.endpoints.${id}.label`,
		descriptionKey: `api_keys.builder.endpoints.${id}.description`,
		path,
		needsKey: group !== "public",
		params: [...path.matchAll(/\{(\w+)\}/g)].map(
			(m) => m[1] as APIEndpointParam
		),
		group,
		...options,
	};
}

/**
 * The GET endpoints the URL builder offers, in the order of the select
 * (spec api-access-02). Paths are checked against the backend's OpenAPI
 * schema.
 */
export const API_ENDPOINTS: IAPIEndpoint[] = [
	entry("empire_material_io", "new", "planning/empire/{empire}/material_io/", {
		csvPath: "planning/empire/{empire}/material_io/csv/",
		freshnessKey: FRESHNESS,
	}),
	entry(
		"empire_plans_material_io",
		"new",
		"planning/empire/{empire}/plans/material_io/",
		{
			csvPath: "planning/empire/{empire}/plans/material_io/csv/",
			freshnessKey: FRESHNESS,
		}
	),
	entry("empire_plans", "new", "planning/empire/{empire}/plans/", {
		csvPath: "planning/empire/{empire}/plans/csv/",
	}),
	entry("fio_storage", "new", "data/storage/rows/", {
		csvPath: "data/storage/csv/",
	}),
	entry("exchanges", "new", "data/exchanges/", {
		csvPath: "data/exchanges/csv/",
		needsKey: false,
	}),
	entry("plans", "planning", "planning/plan/"),
	entry("plan", "planning", "planning/plan/{plan}/"),
	entry("empires", "planning", "planning/empire/"),
	entry("empire", "planning", "planning/empire/{empire}/"),
	entry("cxs", "planning", "planning/cx/"),
	entry("cx", "planning", "planning/cx/{cx}/"),
	entry("materials", "public", "data/materials/"),
	entry("recipes", "public", "data/recipes/"),
	entry("buildings", "public", "data/buildings/"),
	entry("planet", "public", "data/planet/{planet}/"),
	entry("planet_popr", "public", "data/planet/{planet}/popr/"),
	entry("market_history", "public", "data/cxpc/{ticker}/{exchange}/"),
];

export const API_EXCHANGES = ["AI1", "CI1", "IC1", "NC1", "UNIVERSE"];

/**
 * The formats an endpoint serves, CSV first
 */
export function endpointFormats(endpoint: IAPIEndpoint): APIEndpointFormat[] {
	return endpoint.csvPath ? ["csv", "json"] : ["json"];
}

/**
 * Fills a path template, or null while a value is missing
 *
 * @param {string} template Path with {param} placeholders
 * @param {Partial<Record<APIEndpointParam, string | null>>} values Picked values
 * @returns {string | null} The path
 */
export function resolvePath(
	template: string,
	values: Partial<Record<APIEndpointParam, string | null>>
): string | null {
	let missing = false;
	const path = template.replace(/\{(\w+)\}/g, (_, name: string) => {
		const value = values[name as APIEndpointParam]?.trim();
		if (!value) missing = true;
		return encodeURIComponent(value ?? "");
	});
	return missing ? null : path;
}
