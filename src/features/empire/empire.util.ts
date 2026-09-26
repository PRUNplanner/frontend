/**
 * Builds the cache key for a plan result calculated in empire context.
 * Results depend on the empire (faction, permits) and the CX.
 * @author jplacht
 *
 * @param {string} planUuid Plan Uuid
 * @param {string | undefined} empireUuid Empire Uuid
 * @param {string | undefined} cxUuid CX Uuid
 * @returns {string} Cache key
 */
export function planResultCacheKey(
	planUuid: string,
	empireUuid: string | undefined,
	cxUuid: string | undefined
): string {
	return `${planUuid}#${empireUuid}#${cxUuid}`;
}
