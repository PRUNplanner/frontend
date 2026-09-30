/**
 * In-memory `Storage` for `vi.stubGlobal("localStorage", memoryStorage())`.
 * Node >= 25 shadows jsdom's storage with its own (undefined) global.
 */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
	const data = new Map<string, string>(Object.entries(initial));
	return {
		get length() {
			return data.size;
		},
		key: (index: number) => [...data.keys()][index] ?? null,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
		removeItem: (key: string) => void data.delete(key),
		clear: () => data.clear(),
	};
}
