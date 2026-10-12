import { onBeforeUnmount, onMounted, ref, type Ref, watch } from "vue";

import { currentlyOpenId } from "@/ui/stateCurrentOpen";

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// above page content, below PSelect lists (5000) and PTooltip (9999)
const BASE_Z_INDEX = 2000;

// open layers, the last one is on top
const stack: symbol[] = [];
let pageOverflow = "";
let pageMarginRight = "";

// as naive-ui did: the scrollbar's width moves to a margin, so nothing shifts
function lockPage(): void {
	const html = document.documentElement;
	const scrollbarWidth = window.innerWidth - html.offsetWidth;
	pageOverflow = html.style.overflow;
	pageMarginRight = html.style.marginRight;
	if (scrollbarWidth > 0) html.style.marginRight = `${scrollbarWidth}px`;
	html.style.overflow = "hidden";
	document.getElementById("app")?.setAttribute("inert", "");
}

function unlockPage(): void {
	const html = document.documentElement;
	html.style.overflow = pageOverflow;
	html.style.marginRight = pageMarginRight;
	document.getElementById("app")?.removeAttribute("inert");
}

function focusables(panel: HTMLElement): HTMLElement[] {
	return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
}

/**
 * Shared behaviour of PModal and PDrawer: stacking, page scroll lock and
 * inert app root, focus moved in, trapped and returned, Esc and mask close.
 *
 * Esc closes only the topmost layer, and first closes an open PSelect list.
 *
 * @author jplacht
 *
 * @param {Ref<boolean>} show Layer open
 * @param {Ref<HTMLElement | null>} panel Dialog panel element
 * @param {Object} options autoFocus getter and close callback
 * @returns {{ zIndex, maskDown, maskClick }} z-index and mask handlers
 */
export function useOverlayLayer(
	show: Ref<boolean>,
	panel: Ref<HTMLElement | null>,
	options: { autoFocus: () => boolean; close: () => void }
) {
	const id = Symbol();
	const zIndex: Ref<number> = ref(BASE_Z_INDEX);
	let opener: HTMLElement | null = null;
	let maskPressed = false;

	function onKeydown(e: KeyboardEvent): void {
		const el = panel.value;
		if (stack.at(-1) !== id || e.defaultPrevented || !el) return;

		if (e.key === "Escape") {
			e.preventDefault();
			if (currentlyOpenId.value) currentlyOpenId.value = null;
			else options.close();
		} else if (e.key === "Tab") {
			const items = focusables(el);
			const first = items[0] ?? el;
			const last = items.at(-1) ?? el;
			const active = document.activeElement;

			let target: HTMLElement | null = null;
			if (!el.contains(active)) target = e.shiftKey ? last : first;
			else if (e.shiftKey && (active === first || active === el))
				target = last;
			else if (!e.shiftKey && active === last) target = first;

			if (target) {
				e.preventDefault();
				target.focus();
			}
		}
	}

	function open(): void {
		if (stack.includes(id)) return;
		opener =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		if (stack.length === 0) lockPage();
		stack.push(id);
		zIndex.value = BASE_Z_INDEX + stack.length;
		document.addEventListener("keydown", onKeydown);

		const el = panel.value;
		if (!el) return;
		if (!options.autoFocus()) return el.focus();
		// content first, the header's close button only as fallback
		const items = focusables(el);
		(
			items.find((i) => !i.closest("[data-layer-header]")) ??
			items[0] ??
			el
		).focus();
	}

	function release(): void {
		const index = stack.indexOf(id);
		if (index === -1) return;
		stack.splice(index, 1);
		document.removeEventListener("keydown", onKeydown);
		if (stack.length === 0) unlockPage();
		if (opener?.isConnected) opener.focus();
		opener = null;
	}

	// after the render, so the panel ref is set (an immediate watcher would
	// run in setup, before it is)
	watch(show, (value) => (value ? open() : release()), { flush: "post" });
	onMounted(() => {
		if (show.value) open();
	});
	onBeforeUnmount(release);

	// a drag from the panel that ends on the mask is no click on it
	function maskDown(e: MouseEvent): void {
		maskPressed = e.target === e.currentTarget;
	}

	function maskClick(e: MouseEvent): void {
		if (maskPressed && e.target === e.currentTarget) options.close();
		maskPressed = false;
	}

	return { zIndex, maskDown, maskClick };
}
