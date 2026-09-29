import { onUnmounted, ref, type Ref } from "vue";

/**
 * Turns true after a delay, so fast loads skip their loading screen
 * @author jplacht
 *
 * @param {number} ms Delay in milliseconds
 * @returns {Ref<boolean>} true once the delay has passed
 */
export function useDelay(ms: number): Ref<boolean> {
	const elapsed: Ref<boolean> = ref(false);
	const timer = setTimeout(() => (elapsed.value = true), ms);
	onUnmounted(() => clearTimeout(timer));
	return elapsed;
}
