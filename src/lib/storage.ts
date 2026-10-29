import { type Ref, ref, watch } from "vue";

type StorageArea = "local" | "session";

// reading the global throws when storage is blocked: call inside a try
const pick = (store: StorageArea): Storage =>
	store === "session" ? sessionStorage : localStorage;

/**
 * Reads a key of localStorage or sessionStorage. Storage can be blocked
 * (private mode, disabled cookies) and then throws on access, already when
 * the global is read, so it is picked here inside the try.
 *
 * @param {string} key Storage key
 * @param {StorageArea} [store] "local" (default) or "session"
 * @returns {string | null} Stored value, null if missing or blocked
 */
export function readStorage(
	key: string,
	store: StorageArea = "local"
): string | null {
	try {
		return pick(store).getItem(key);
	} catch {
		return null;
	}
}

/**
 * Writes a key of localStorage or sessionStorage, null removes it.
 * A blocked or full storage is ignored: the value stays in memory.
 *
 * @param {string} key Storage key
 * @param {string | null} value Value, null removes the key
 * @param {StorageArea} [store] "local" (default) or "session"
 */
export function writeStorage(
	key: string,
	value: string | null,
	store: StorageArea = "local"
): void {
	try {
		const s = pick(store);
		if (value === null) s.removeItem(key);
		else s.setItem(key, value);
	} catch {
		// blocked or full: keep it in memory
	}
}

/**
 * A boolean stored as "1" / "0" in localStorage, written on every change.
 *
 * @param {string} key Storage key
 * @param {boolean} fallback Value when nothing (or something else) is stored
 * @returns {Ref<boolean>} Flag
 */
export function useStoredFlag(key: string, fallback: boolean): Ref<boolean> {
	const stored = readStorage(key);
	const flag = ref(stored === "1" ? true : stored === "0" ? false : fallback);
	watch(flag, (v) => writeStorage(key, v ? "1" : "0"), { flush: "sync" });
	return flag;
}
