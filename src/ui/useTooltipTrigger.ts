import { onBeforeUnmount, type Ref, ref, useId, watch } from "vue";

/** controls that act on a tap themselves; a tap on them shows no tooltip */
const INTERACTIVE =
	'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="button"], [role="checkbox"], [role="combobox"], [role="link"], [role="switch"], [tabindex]:not([tabindex="-1"])';

// compatibility mouse events and focus follow a tap within this time
const TAP_WINDOW_MS = 800;

/**
 * Open and close rules for a tooltip, shared by PTooltip and the chart
 * building blocks' own SVG tooltips:
 * - hover opens, leaving trigger and panel closes after 150 ms;
 * - focus inside the trigger opens, focus leaving it closes;
 * - Esc closes, caught in the capture phase so a modal or drawer around it
 *   keeps its own Esc;
 * - touch: a tap on a non-interactive trigger toggles it and a tap
 *   elsewhere closes it; a tap on a control inside the trigger runs the
 *   control and shows nothing (the control has its own name).
 *
 * @author jplacht
 *
 * @param {Ref<HTMLElement | null>} trigger Trigger element
 * @param {Ref<HTMLElement | null>} panel Tooltip panel
 * @param {() => boolean} disabled Never opens while true
 * @returns {{ open, id, show, hide, scheduleHide, triggerEvents, panelEvents }}
 * the open state, the panel's id (for aria-describedby), the open and
 * close functions, and the listeners for the trigger and the panel
 */
export function useTooltipTrigger(
	trigger: Ref<HTMLElement | null>,
	panel: Ref<HTMLElement | null>,
	disabled: () => boolean = () => false
) {
	const open: Ref<boolean> = ref(false);
	const id = useId();
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let lastTouch = 0;
	const recentTouch = () => Date.now() - lastTouch < TAP_WINDOW_MS;

	function show(): void {
		if (disabled()) return;
		clearTimeout(hideTimer);
		open.value = true;
	}

	function hide(): void {
		clearTimeout(hideTimer);
		open.value = false;
	}

	function scheduleHide(): void {
		clearTimeout(hideTimer);
		hideTimer = setTimeout(hide, 150);
	}

	// a control inside the trigger, not the trigger itself
	function onControl(target: EventTarget | null): boolean {
		const el =
			target instanceof Element ? target.closest(INTERACTIVE) : null;
		return !!el && el !== trigger.value && !!trigger.value?.contains(el);
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key !== "Escape" || !open.value) return;
		// handled: the layer around it ignores a prevented Esc
		e.preventDefault();
		hide();
	}

	function onDocumentDown(e: Event): void {
		const target = e.target as Node;
		if (trigger.value?.contains(target) || panel.value?.contains(target))
			return;
		hide();
	}

	function unlisten(): void {
		document.removeEventListener("keydown", onKeydown, true);
		document.removeEventListener("pointerdown", onDocumentDown, true);
	}

	watch(open, (value) => {
		if (!value) return unlisten();
		document.addEventListener("keydown", onKeydown, true);
		document.addEventListener("pointerdown", onDocumentDown, true);
	});

	onBeforeUnmount(() => {
		clearTimeout(hideTimer);
		unlisten();
	});

	const triggerEvents = {
		touchstart: () => (lastTouch = Date.now()),
		mouseenter: () => {
			// a tap's compatibility mouseenter: the click decides
			if (!recentTouch()) show();
		},
		mouseleave: () => {
			if (!recentTouch()) scheduleHide();
		},
		focusin: (e: FocusEvent) => {
			if (recentTouch() && onControl(e.target)) return;
			if (!recentTouch()) show();
		},
		focusout: (e: FocusEvent) => {
			if (!trigger.value?.contains(e.relatedTarget as Node | null))
				hide();
		},
		click: (e: MouseEvent) => {
			if (!recentTouch() || onControl(e.target)) return;
			if (open.value) hide();
			else show();
		},
	};

	const panelEvents = {
		mouseenter: show,
		mouseleave: scheduleHide,
	};

	return { open, id, show, hide, scheduleHide, triggerEvents, panelEvents };
}
