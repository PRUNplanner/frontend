/**
 * What a logout clears beyond the stores the app shell loads. Modules that
 * load later (the query cache) register their reset here, so the shell
 * doesn't have to import them; one that never loaded has nothing to clear.
 */
const resets = new Set<() => void>();

export function onSessionReset(reset: () => void): void {
	resets.add(reset);
}

export function resetLoadedModules(): void {
	resets.forEach((reset) => reset());
}
