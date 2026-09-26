import { toRaw, isRef } from "vue";

/**
 * Deep-clones a ref/reactive value into a completely inert (non-proxy) copy.
 *
 * - Uses native structuredClone when available (fastest, handles Map/Set/Date/etc).
 * - Falls back to shallow slice/object-spread for arrays/objects if structuredClone is missing.
 * - Immediately returns primitives & nulls without overhead.
 *
 * @author jplacht
 *
 * @type {<T>(value: T) => T}
 */
export const inertClone = (() => {
	const canStructuredClone = typeof structuredClone === "function";

	// Fallback for non-structuredClone environments:
	function fallbackClone<T>(raw: T): T {
		if (Array.isArray(raw)) {
			return raw.slice() as T;
		}
		// You can tighten this check to only plain objects if you like:
		if (raw !== null && typeof raw === "object") {
			return { ...raw } as T;
		}
		return raw as T;
	}

	if (canStructuredClone) {
		// Fast branch: always structuredClone
		// structuredClone deep-copies EVERYTHING natively
		return function <T>(value: T): T {
			const unwrapped = isRef(value) ? value.value : value;
			const raw = toRaw(unwrapped) as unknown;

			// fallback, as functions can't be cloned
			if (
				raw === null ||
				typeof raw !== "object" ||
				typeof raw === "function"
			) {
				return raw as T;
			}

			return structuredClone(raw) as T;
		};
	} else {
		// Slower branch: primitives/arrays/objects only
		return function <T>(value: T): T {
			// Unwrap
			const unwrapped = isRef(value) ? value.value : value;
			// toRaw: drop proxy
			const raw = toRaw(unwrapped) as unknown;

			// Primitives & null → return immediately
			if (
				raw === null ||
				(typeof raw !== "object" && typeof raw !== "function")
			) {
				return raw as T;
			}

			// Fallback clone
			return fallbackClone<T>(raw as T);
		};
	}
})();

/**
 * Copies string value to users clipboard
 * @author jplacht
 *
 * @export
 * @param {string} value Text
 */
export function copyToClipboard(value: string): void {
	// denied without clipboard permission or focus
	navigator.clipboard.writeText(value).catch((err: unknown) => {
		console.error(err);
	});
}

/**
 * Recursively walk `obj` and replace any property whose key
 * is in `keysToRedact` with '***'.
 */
export function redact<T>(obj: T, keysToRedact: string[]): T {
	// array, redact all items
	if (Array.isArray(obj)) {
		return obj.map((item) => redact(item, keysToRedact)) as T;
	}

	if (obj !== null && typeof obj === "object") {
		return Object.entries(obj).reduce(
			(acc, [key, value]) => {
				if (keysToRedact.includes(key)) {
					// replace the field

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(acc as any)[key] = "***";
				} else {
					// recursive into nested objects/arrays
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(acc as any)[key] = redact(value, keysToRedact);
				}
				return acc;
			},
			Array.isArray(obj) ? [] : {}
		) as T;
	}

	// primitive value
	return obj;
}

export function deepClone<T>(obj: T): T {
	const raw = toRaw(obj);
	return typeof structuredClone === "function"
		? structuredClone(raw)
		: JSON.parse(JSON.stringify(raw));
}

export async function getObjectSize(obj: unknown): Promise<number> {
	return new Blob([JSON.stringify(obj)]).size / 1024 / 1024;
}
