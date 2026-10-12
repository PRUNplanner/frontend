import { createPopper, type Placement } from "@popperjs/core";

/**
 * Positions a floating panel at its reference element: fixed, flipped and
 * kept 8 px inside the viewport, and updated when the panel resizes.
 * Shared by PTooltip and PPopover.
 *
 * @author jplacht
 *
 * @param {Element} reference Element the panel hangs from
 * @param {HTMLElement} floating The panel
 * @param {Placement} placement Popper placement
 * @param {number} offset Gap to the reference in px
 * @returns {{ destroy }} stops positioning
 */
export function createFloating(
	reference: Element,
	floating: HTMLElement,
	placement: Placement,
	offset: number
): { destroy: () => void } {
	const popper = createPopper(reference, floating, {
		placement,
		strategy: "fixed",
		modifiers: [
			{ name: "offset", options: { offset: [0, offset] } },
			{
				name: "flip",
				options: { boundary: "viewport", padding: 8, altAxis: false },
			},
			{
				name: "preventOverflow",
				options: { boundary: "viewport", padding: 8, tether: false },
			},
		],
	});

	requestAnimationFrame(() => popper.update());
	const ro = new ResizeObserver(() => popper.update());
	ro.observe(floating);

	return {
		destroy: () => {
			ro.disconnect();
			popper.destroy();
		},
	};
}
