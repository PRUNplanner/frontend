import { test } from "vitest";

import type { BenchFn, BenchRunOptions } from "vitest";

/**
 * Vitest 4's `bench(name, fn, options)` on top of Vitest 5, which only
 * hands `bench` to a test: one test per benchmark, run with `options`.
 */
export function bench(name: string, fn: BenchFn, options?: BenchRunOptions) {
	test(name, async ({ bench }) => {
		await bench(name, fn).run(options);
	});
}
