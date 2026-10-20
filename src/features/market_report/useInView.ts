import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/**
 * True once the element is on screen, or within `margin` px of it after
 * the page was scrolled, and stays true: below-the-fold modules load their
 * code and data then, never before the first scroll.
 *
 * @param {Ref<HTMLElement | null>} el Watched element
 * @param {number} [margin=600] Distance in px before it is visible
 * @returns {Ref<boolean>} Seen
 */
export function useInView(
	el: Ref<HTMLElement | null>,
	margin: number = 600
): Ref<boolean> {
	const seen = ref(false);
	let near = false;
	let scrolled = false;
	let observer: IntersectionObserver | undefined;

	function check(): void {
		if (seen.value || !near || !el.value) return;
		const top = el.value.getBoundingClientRect().top;
		if (scrolled || top < window.innerHeight) stop(true);
	}

	function onScroll(): void {
		scrolled = true;
		check();
	}

	function stop(value: boolean): void {
		seen.value = value;
		observer?.disconnect();
		window.removeEventListener("scroll", onScroll);
	}

	onMounted(() => {
		if (typeof IntersectionObserver === "undefined" || !el.value)
			return stop(true);
		observer = new IntersectionObserver(
			(entries) => {
				near = entries.some((e) => e.isIntersecting);
				check();
			},
			{ rootMargin: `${margin}px 0px` }
		);
		observer.observe(el.value);
		window.addEventListener("scroll", onScroll, { passive: true });
	});
	onBeforeUnmount(() => stop(seen.value));

	return seen;
}
