import { describe, it, expect, vi, afterEach } from "vitest";
import { nextTick, ref } from "vue";

import { useIncrementalRows } from "@/features/planet_search/useIncrementalRows";

type IObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

describe("useIncrementalRows", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("grows while the sentinel is near and starts over on a new list", async () => {
		const callbacks: IObserverCallback[] = [];
		const disconnect = vi.fn();
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				constructor(cb: IObserverCallback) {
					callbacks.push(cb);
				}
				observe() {}
				disconnect = disconnect;
			}
		);

		const list = ref(Array.from({ length: 25 }, (_, i) => i));
		const { visible, sentinel } = useIncrementalRows(() => list.value, 10);
		expect(visible.value).toHaveLength(10);

		sentinel.value = document.createElement("div");
		await nextTick();
		callbacks.at(-1)!([{ isIntersecting: false }]);
		expect(visible.value).toHaveLength(10);
		callbacks.at(-1)!([{ isIntersecting: true }]);
		await nextTick();
		expect(visible.value).toHaveLength(20);
		// a new observer per step, the old one is gone
		expect(disconnect).toHaveBeenCalled();

		list.value = [1, 2, 3];
		await nextTick();
		expect(visible.value).toEqual([1, 2, 3]);
	});

	it("shows the first step without IntersectionObserver", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const { visible, sentinel } = useIncrementalRows(() => [1, 2, 3], 2);
		sentinel.value = document.createElement("div");
		await nextTick();
		expect(visible.value).toEqual([1, 2]);
	});
});
