const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const PLANET_NATURAL_ID = /^[a-z]{2}-\d{3}[a-z]$/i;
// the free-text planet search, not its fixed sibling endpoints
const PLANET_SEARCH =
	/^(\/data\/planets\/)(?!(?:multiple|search|search-index)\/)[^/]+/;
// schema field names: letters and underscores, not all upper case
const FIELD_NAME = /^(?=.*[a-z])[A-Za-z_]+$/;

/**
 * Turns an API path into its template, so errors of one endpoint group
 * together and no id or search text leaves the browser:
 * `/planning/plan/0b1e…/?x=1` becomes `/planning/plan/:uuid/`.
 *
 * @param {string} path API path, with or without a query string
 * @returns {string} Path template
 */
export function pathTemplate(path: string): string {
	return (
		path
			.split("?")[0]
			// free text typed by the user
			.replace(PLANET_SEARCH, "$1:search")
			.split("/")
			.map((segment) => {
				if (UUID.test(segment)) return ":uuid";
				if (/^\d+$/.test(segment)) return ":id";
				if (PLANET_NATURAL_ID.test(segment)) return ":planet";
				return segment;
			})
			.join("/")
	);
}

/**
 * Turns the path of a Zod issue into its template: array indices become
 * `[]` and record keys (ids, planets, tickers, which are response data)
 * become `:key`, so only schema field names are left.
 *
 * ponytail: a record key made of letters only (a ship named "Bessie")
 * passes as a field name; walk the schema instead if that ever matters.
 *
 * @param {PropertyKey[]} path Issue path
 * @returns {string} Path template, e.g. `plan_details.:key.deltas.:key.input`
 */
export function issuePathTemplate(path: PropertyKey[]): string {
	return path
		.map((segment) => {
			if (typeof segment === "number") return "[]";
			return typeof segment === "string" && FIELD_NAME.test(segment)
				? segment
				: ":key";
		})
		.join(".");
}
