import type { JSONObject, JSONValue } from "@/lib/query_cache/queryCache.types";

/**
 * Transforms any JSONValue cache key to its string representation
 * with sorted object keys
 *
 * @author jplacht
 *
 * @export
 * @param {JSONValue} key Input Cache Key
 * @returns {string} Cache Key string representation
 */
export function toCacheKey(key: JSONValue): string {
	return JSON.stringify(key, (_, val) => {
		if (val === null || typeof val !== "object" || Array.isArray(val)) {
			return val;
		}

		return Object.keys(val)
			.sort()
			.reduce(
				(result, key) => {
					result[key] = val[key];
					return result;
				},
				{} as Record<string, unknown>
			);
	});
}

/**
 * Checks if a given Value is the Subset of another Cache Value
 * including type checks, works with simple string-like keys as
 * well as arrays of natives or arrays of objects.
 *
 * @author jplacht
 *
 * @export
 * @param {JSONValue} subSet To check for set
 * @param {JSONValue} fullSet Check if includes, set
 * @returns {boolean}
 */
export function isSubset(subSet: JSONValue, fullSet: JSONValue): boolean {
	if (subSet === fullSet) return true;

	if (typeof subSet !== typeof fullSet) return false;

	if (Array.isArray(subSet) && Array.isArray(fullSet)) {
		if (subSet.length > fullSet.length) return false;
		for (let i = 0; i < subSet.length; i++) {
			if (!isSubset(subSet[i], fullSet[i])) return false;
		}
		return true;
	}

	if (
		typeof subSet === "object" &&
		typeof fullSet === "object" &&
		subSet !== null &&
		fullSet !== null
	) {
		const subKeys = Object.keys(subSet);
		for (const key of subKeys) {
			if (!(key in fullSet)) return false;
			if (
				!isSubset(
					(subSet as JSONObject)[key],
					(fullSet as JSONObject)[key]
				)
			) {
				return false;
			}
		}
		return true;
	}

	return false;
}
