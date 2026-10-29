/**
 * Gives the browser a turn between chunks of work: scheduler.yield where
 * it exists, a macrotask otherwise.
 *
 * @returns {Promise<void>} Resolves on the next turn
 */
export function yieldToBrowser(): Promise<void> {
	const s = (
		globalThis as { scheduler?: { yield?: () => Promise<void> } }
	).scheduler;
	if (s?.yield) return s.yield();
	return new Promise((resolve) => setTimeout(resolve, 0));
}
