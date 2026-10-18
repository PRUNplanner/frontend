import { onBeforeUnmount, ref, type Ref } from "vue";

const MIN_PX = 240;

/**
 * Height of a panel docked at the bottom of the page: about 40 % of the
 * viewport (60 % on a phone), dragged on its grip or stepped with the
 * arrow keys, kept between 25 % and 80 % of the viewport.
 *
 * @author jplacht
 *
 * @returns Height in px and the grip's pointer and key handlers
 */
export function useDockHeight() {
	const clampHeight = (px: number) =>
		Math.round(
			Math.min(
				Math.max(px, window.innerHeight * 0.25, MIN_PX),
				// a pane not sized yet (0 high) still gets the minimum
				Math.max(window.innerHeight * 0.8, MIN_PX)
			)
		);
	const height: Ref<number> = ref(
		clampHeight(window.innerHeight * (window.innerWidth < 640 ? 0.6 : 0.4))
	);

	let drag: { y: number; height: number } | null = null;
	function dragStart(e: PointerEvent): void {
		drag = { y: e.clientY, height: height.value };
		(e.currentTarget as Element).setPointerCapture?.(e.pointerId);
	}
	function dragMove(e: PointerEvent): void {
		if (drag) height.value = clampHeight(drag.height + drag.y - e.clientY);
	}
	function dragEnd(): void {
		drag = null;
	}
	function resizeKey(step: number): void {
		height.value = clampHeight(height.value + step);
	}
	onBeforeUnmount(dragEnd);

	return { height, dragStart, dragMove, dragEnd, resizeKey };
}
