/**
 * Workers a new base can hire: the free ones, less the jobs other bases
 * already have open
 * @author jplacht
 *
 * @param {number} free free workers of the tier
 * @param {number} openJobs open jobs of the tier
 * @returns {number} workers left, never below 0
 */
export function poprAvailable(free: number, openJobs: number): number {
	return Math.max(free - openJobs, 0);
}

/**
 * Whether the planet's free workers cover what the plan needs
 * @author jplacht
 *
 * @param {number} free free workers of the tier
 * @param {number} openJobs open jobs of the tier
 * @param {number} need workers the plan needs
 * @returns {boolean} true when nothing is needed or enough are left
 */
export function poprCovers(
	free: number,
	openJobs: number,
	need: number
): boolean {
	return need === 0 || free - openJobs >= need;
}
