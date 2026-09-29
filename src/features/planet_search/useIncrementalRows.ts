import { computed, ref, watch, type ComputedRef, type Ref } from "vue";

/**
 * Renders a long list in steps: the first `step` rows, then `step` more
 * whenever the sentinel element below the list comes near the viewport.
 * One scrolling list without paging, without mounting every row at once.
 * @author jplacht
 *
 * @param source Getter of the full list; a new list starts over
 * @param step Rows added per step
 */
export function useIncrementalRows<T>(
	source: () => T[],
	step: number = 100
): { visible: ComputedRef<T[]>; sentinel: Ref<HTMLElement | null> } {
	const limit: Ref<number> = ref(step);
	const sentinel: Ref<HTMLElement | null> = ref(null);

	watch(source, () => (limit.value = step));

	// re-observe after each step: a sentinel still in view fires again
	watch([sentinel, limit], ([el], _, onCleanup) => {
		if (!el || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) limit.value += step;
			},
			{ rootMargin: "400px" }
		);
		observer.observe(el);
		onCleanup(() => observer.disconnect());
	});

	const visible = computed(() => source().slice(0, limit.value));

	return { visible, sentinel };
}
