import {
	describe,
	it,
	expect,
	beforeEach,
	vi,
	beforeAll,
	afterAll,
} from "vitest";
import { ref, reactive, isReactive, toRaw } from "vue";
import {
	copyToClipboard,
	deepClone,
	getObjectSize,
	inertClone as inertCloneDefault,
	redact,
} from "@/util/data";

describe("inertClone (structuredClone available)", () => {
	const inertClone = inertCloneDefault;

	it("returns primitives as-is", () => {
		expect(inertClone(42)).toBe(42);
		expect(inertClone("hello")).toBe("hello");
		expect(inertClone(true)).toBe(true);
		expect(inertClone(null)).toBe(null);
		expect(inertClone(undefined)).toBe(undefined);
	});

	it("returns functions as-is without throwing", () => {
		const fn = () => 123;
		expect(inertClone(fn)).toBe(fn);
	});

	it("deep-clones plain objects", () => {
		const obj = { a: 1, b: { c: 2 } };
		const clone = inertClone(obj);
		expect(clone).toEqual(obj);
		expect(clone).not.toBe(obj);
		expect(clone.b).not.toBe(obj.b);
	});

	it("deep-clones arrays", () => {
		const arr = [{ x: 1 }, { y: 2 }];
		const clone = inertClone(arr);
		expect(clone).toEqual(arr);
		expect(clone).not.toBe(arr);
		expect(clone[0]).not.toBe(arr[0]);
	});

	it("strips reactivity from reactive objects", () => {
		const react = reactive({ foo: { bar: "baz" } });
		const clone = inertClone(react);
		expect(clone).toEqual({ foo: { bar: "baz" } });
		expect(isReactive(clone)).toBe(false);
		expect(clone.foo).not.toBe(react.foo);
	});

	it("unwraps and clones refs", () => {
		const r = ref({ nested: [1, 2, 3] });
		const clone = inertClone(r);
		expect(clone).toEqual({ nested: [1, 2, 3] });
		expect(clone).not.toBe(r.value);
		// @ts-expect-error test data
		expect(Array.isArray(clone.nested)).toBe(true);
	});

	it("clones Date, Map, Set, ArrayBuffer, TypedArray correctly", () => {
		const originalDate = new Date();
		const originalMap = new Map([["a", 1]]);
		const originalSet = new Set([1, 2, 3]);
		const buf = new ArrayBuffer(8);
		const ta = new Uint8Array([10, 20, 30]);

		const input = { originalDate, originalMap, originalSet, buf, ta };
		const clone = inertClone(input);

		// Date
		expect(clone.originalDate).not.toBe(originalDate);
		expect(clone.originalDate.getTime()).toBe(originalDate.getTime());

		// Map
		expect(clone.originalMap).toBeInstanceOf(Map);
		expect(clone.originalMap).not.toBe(originalMap);
		expect(Array.from(clone.originalMap.entries())).toEqual([["a", 1]]);

		// Set
		expect(clone.originalSet).toBeInstanceOf(Set);
		expect(clone.originalSet).not.toBe(originalSet);
		expect(Array.from(clone.originalSet)).toEqual([1, 2, 3]);

		// ArrayBuffer
		expect(clone.buf).not.toBe(buf);
		expect(clone.buf.byteLength).toBe(buf.byteLength);

		// TypedArray
		expect(clone.ta).not.toBe(ta);
		expect(Array.from(clone.ta)).toEqual([10, 20, 30]);
	});
});

describe("inertClone fallback branch (no structuredClone)", () => {
	let inertClone: typeof inertCloneDefault;
	let originalStructuredClone: any;

	beforeAll(async () => {
		// remove structuredClone and reload module to hit fallback
		originalStructuredClone = globalThis.structuredClone;
		// @ts-expect-error
		delete globalThis.structuredClone;
		vi.resetModules();
		const mod = await import("@/util/data");
		inertClone = mod.inertClone;
	});

	afterAll(() => {
		// restore structuredClone
		globalThis.structuredClone = originalStructuredClone;
	});

	it("shallow-clones arrays via slice", () => {
		const nested = { foo: "bar" };
		const arr = [nested];
		const clone = inertClone(arr);
		expect(clone).toEqual(arr);
		expect(clone).not.toBe(arr);
		// shallow: nested reference is same
		expect(clone[0]).toBe(nested);
	});

	it("shallow-clones objects via spread", () => {
		const nested = { x: 1 };
		const obj = { nested };
		const clone = inertClone(obj);
		expect(clone).toEqual(obj);
		expect(clone).not.toBe(obj);
		// shallow: nested reference is same
		expect((clone as any).nested).toBe(nested);
	});

	it("returns primitives and functions as-is", () => {
		expect(inertClone(7)).toBe(7);
		const fn = () => 99;
		expect(inertClone(fn)).toBe(fn);
	});
});

describe("copyToClipboard", async () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("call navigator.clipboard.writeText with correct value", async () => {
		const mockWriteText = vi.fn(() => Promise.resolve());
		Object.assign(navigator, {
			clipboard: {
				writeText: mockWriteText,
			},
		});

		const testValue = "Foo";
		copyToClipboard(testValue);

		expect(mockWriteText).toHaveBeenCalledWith(testValue);
		expect(mockWriteText).toHaveBeenCalledTimes(1);
	});

	it("logs a denied clipboard write", async () => {
		const denied = new Error("test-denied");
		Object.assign(navigator, {
			clipboard: { writeText: vi.fn(() => Promise.reject(denied)) },
		});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		copyToClipboard("Foo");
		await vi.waitFor(() => expect(error).toHaveBeenCalledWith(denied));
		error.mockRestore();
	});
});

describe("redact", async () => {
	const keysToRedact: string[] = ["meow", "hello"];

	it("primitives as-is", async () => {
		const result = redact("foo", keysToRedact);
		expect(result).toStrictEqual("foo");
	});

	it("array, handle parts", async () => {
		const result = redact(["foo", { meow: "redact" }], keysToRedact);
		expect(result).toStrictEqual(["foo", { meow: "***" }]);
	});

	it("nested", async () => {
		const result = redact(
			{ foo: { meow: "redact" }, whoop: { foo: { hello: "redact" } } },
			keysToRedact
		);
		expect(result).toStrictEqual({
			foo: {
				meow: "***",
			},
			whoop: {
				foo: {
					hello: "***",
				},
			},
		});
	});
});

describe("deepClone: structured clone available", () => {
	it("clones plain objects deeply", () => {
		const obj = { a: 1, b: { c: 2 } };
		const clone = deepClone(obj);

		expect(clone).toEqual(obj);
		expect(clone).not.toBe(obj); // not same ref
		expect(clone.b).not.toBe(obj.b);
	});

	it("works with Vue ref", () => {
		const source = ref({ a: 1, b: { c: 2 } });
		const clone = deepClone(source.value);

		expect(clone).toEqual({ a: 1, b: { c: 2 } });
		expect(clone).not.toBe(source.value);
		expect(clone.b).not.toBe(source.value.b);
	});

	it("works with Vue reactive", () => {
		const source = reactive({ a: 1, nested: { b: 2 } });
		const clone = deepClone(source);

		expect(clone).toEqual({ a: 1, nested: { b: 2 } });
		expect(clone).not.toBe(source);
		expect(clone.nested).not.toBe(source.nested);
	});

	it("does not mutate the original", () => {
		const obj = { a: 1 };
		const clone = deepClone(obj);

		clone.a = 42;
		expect(obj.a).toBe(1);
		expect(clone.a).toBe(42);
	});
});

describe("deepClone (JSON fallback)", () => {
	let originalStructuredClone: typeof structuredClone;

	beforeAll(() => {
		originalStructuredClone = globalThis.structuredClone;

		// Remove it so fallback is triggered
		// @ts-expect-error override global
		delete globalThis.structuredClone;
	});

	afterAll(() => {
		// Restore original
		globalThis.structuredClone = originalStructuredClone;
	});

	it("clones using JSON.parse fallback", () => {
		const source = ref({ a: 1, b: { c: 2 } });
		const clone = deepClone(source.value);

		expect(clone).toEqual({ a: 1, b: { c: 2 } });
		expect(clone).not.toBe(source.value);
		expect(clone.b).not.toBe(source.value.b);
	});
});

describe("nested reactive proxies", () => {
	const helpers = { deepClone, inertClone: inertCloneDefault };

	describe.each(Object.entries(helpers))("%s", (_name, clone) => {
		it("clones an object holding a reactive value", () => {
			const result = clone({ nested: reactive({ a: [1, 2] }) });

			expect(result).toEqual({ nested: { a: [1, 2] } });
			expect(isReactive(result.nested)).toBe(false);
		});

		it("clones an array of reactive objects", () => {
			const result = clone([reactive({ a: 1 }), reactive({ a: 2 })]);

			expect(result).toEqual([{ a: 1 }, { a: 2 }]);
			expect(isReactive(result[0])).toBe(false);
		});

		it("clones a spread of reactive state", () => {
			const source = reactive({ list: [1, 2], deep: { b: { c: 3 } } });
			const result = clone({ ...source, x: 1 });

			expect(result).toEqual({
				list: [1, 2],
				deep: { b: { c: 3 } },
				x: 1,
			});
			expect(isReactive(result.deep)).toBe(false);
			expect(result.list).not.toBe(toRaw(source.list));
		});

		it("keeps Date and Map next to a reactive value", () => {
			const result = clone({
				nested: reactive({ a: 1 }),
				date: new Date(0),
				map: new Map([["k", 1]]),
			});

			expect(result.nested).toEqual({ a: 1 });
			expect(result.date).toBeInstanceOf(Date);
			expect(result.map.get("k")).toBe(1);
		});

		it("still throws for values that can't be cloned", () => {
			expect(() => clone({ fn: () => 1 })).toThrow();
		});

		it("rethrows errors other than DataCloneError", () => {
			const source = {
				get x(): number {
					throw new TypeError("boom");
				},
			};

			expect(() => clone(source)).toThrow(TypeError);
		});
	});
});

describe("getObjectSize", async () => {
	it("small file", async () => {
		const result = await getObjectSize({ foo: "moo", data: [1, 2, 3, 4] });
		expect(result).toBeGreaterThan(0);
	});
});
