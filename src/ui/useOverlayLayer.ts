import { onBeforeUnmount, onMounted, ref, type Ref, watch } from "vue";

import { Z_LAYER } from "@/ui/zIndex";

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';


// open layers, the last one is on top
const stack: { id: symbol; modal: boolean; panel: Ref<HTMLElement | null> }[] =
	[];
const anyModal = () => stack.some((l) => l.modal);
let pageOverflow = "";
let pageMarginRight = "";

// the scrollbar's width moves to a margin, so nothing shifts
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
 * Esc closes only the topmost layer, so an open PSelect list first.
 *
 * Non-modal layers (PPopover, PDropdown, PSelect lists) only stack and
 * close on Esc: no scroll lock, inert, focus move or trap. They return focus
 * to the opener only when it was inside them.
 *
 * @author jplacht
 *
 * @param {Ref<boolean>} show Layer open
 * @param {Ref<HTMLElement | null>} panel Dialog panel element
 * @param {Object} options autoFocus getter, close callback, modal (default true)
 * @returns {{ zIndex, maskDown, maskClick, inLayerAbove }} z-index, mask
 * handlers and whether an element is in a layer stacked above this one
 */
export function useOverlayLayer(
	show: Ref<boolean>,
	panel: Ref<HTMLElement | null>,
	options: { autoFocus: () => boolean; close: () => void; modal?: boolean }
) {
	const modal = options.modal ?? true;
	const id = Symbol();
	const zIndex: Ref<number> = ref(Z_LAYER);
	let opener: HTMLElement | null = null;
	let maskPressed = false;

	function onKeydown(e: KeyboardEvent): void {
		const el = panel.value;
		if (stack.at(-1)?.id !== id || e.defaultPrevented || !el) return;

		if (e.key === "Escape") {
			e.preventDefault();
			options.close();
		} else if (e.key === "Tab" && modal) {
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
		if (stack.some((l) => l.id === id)) return;
		opener =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		if (modal && !anyModal()) lockPage();
		stack.push({ id, modal, panel });
		zIndex.value = Z_LAYER + stack.length;
		document.addEventListener("keydown", onKeydown);

		const el = panel.value;
		if (!el || !modal) return;
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
		const index = stack.findIndex((l) => l.id === id);
		if (index === -1) return;
		stack.splice(index, 1);
		document.removeEventListener("keydown", onKeydown);
		if (modal && !anyModal()) unlockPage();
		if (modal && opener?.isConnected) opener.focus();
		opener = null;
	}

	// a non-modal layer returns focus before the render removes its panel,
	// and before a modal opened by its pick makes the page inert
	watch(show, (value) => {
		if (value || modal) return;
		if (panel.value?.contains(document.activeElement) && opener?.isConnected)
			opener.focus();
	});

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

	function inLayerAbove(target: Node): boolean {
		const index = stack.findIndex((l) => l.id === id);
		return (
			index !== -1 &&
			stack.slice(index + 1).some((l) => l.panel.value?.contains(target))
		);
	}

	return { zIndex, maskDown, maskClick, inLayerAbove };
}
