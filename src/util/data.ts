import { toRaw, isRef } from "vue";

/**
 * Unwraps reactive proxies at every level of plain objects and arrays.
 * Anything else (Date, Map, Set, typed arrays, primitives) is returned as is.
 * Unlike structuredClone it keeps neither cycles nor shared references.
 */
function toRawDeep<T>(value: T): T {
	const raw = toRaw(value);
	if (Array.isArray(raw)) return raw.map(toRawDeep) as T;
	if (
		raw !== null &&
		typeof raw === "object" &&
		Object.getPrototypeOf(raw) === Object.prototype
	) {
		return Object.fromEntries(
			Object.entries(raw).map(([key, v]) => [key, toRawDeep(v)])
		) as T;
	}
	return raw;
}

/**
 * structuredClone that survives reactive proxies below the top level, as
 * left behind by spreading reactive state (`{ ...props.filter }`). Only
 * values structuredClone rejects pay for the unwrapping walk.
 */
function cloneRaw<T>(raw: T): T {
	try {
		return structuredClone(raw);
	} catch (err) {
		if ((err as Error)?.name !== "DataCloneError") throw err;
		return structuredClone(toRawDeep(raw));
	}
}

/**
 * Deep-clones a ref/reactive value into a completely inert (non-proxy) copy
 * with structuredClone (handles Map/Set/Date/etc). Primitives, null and
 * functions (which can't be cloned) are returned as is.
 *
 * @author jplacht
 */
export function inertClone<T>(value: T): T {
	const raw = toRaw(isRef(value) ? value.value : value) as unknown;
	if (raw === null || typeof raw !== "object") return raw as T;
	return cloneRaw(raw) as T;
}

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
	return cloneRaw(toRaw(obj));
}

export async function getObjectSize(obj: unknown): Promise<number> {
	return new Blob([JSON.stringify(obj)]).size / 1024 / 1024;
}
