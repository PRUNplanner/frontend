import {
	type MaybeRefOrGetter,
	nextTick,
	onBeforeUnmount,
	type Ref,
	ref,
	toValue,
	useId,
	watch,
} from "vue";

// Composables
import { layerOver } from "@/ui/useOverlayLayer";

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface IHoverCardOptions {
	/** rest on the trigger before the first card opens, ms */
	openDelay?: number;
	/** another card of the group is open: swap after, ms */
	swapDelay?: number;
	/** after leaving trigger and card, ms */
	closeDelay?: number;
	/** hover (and focus) opens it; click leaves opening to the caller (pin) */
	trigger?: "hover" | "click";
}

// no card opens this long after the last scroll
const SCROLL_QUIET_MS = 150;
// touch or a narrow window: a tap opens a bottom sheet instead
const SHEET_QUERY = "(pointer: coarse), (max-width: 559px)";

interface IGroupMember {
	hide: () => void;
	cancel: () => void;
	isPinned: () => boolean;
}

// one group for every hover card: the open one and the one waiting to open
let current: IGroupMember | null = null;
let pending: IGroupMember | null = null;
let lastScroll = -Infinity;
let scrollWatched = false;

function watchScroll(): void {
	if (scrollWatched) return;
	scrollWatched = true;
	// capture: scroll doesn't bubble, inner scroll areas count too
	window.addEventListener("scroll", () => (lastScroll = Date.now()), {
		capture: true,
		passive: true,
	});
}

const hasSelection = () => !!window.getSelection?.()?.toString();

/**
 * Hover intent for a card next to a trigger (PHoverCard):
 * - opens after the pointer rests openDelay on the trigger, or swapDelay
 *   when another card of the group is open; focus opens it at once;
 * - entering the card keeps it open, leaving both closes it after
 *   closeDelay;
 * - never opens while scrolling, with a mouse button down or text
 *   selected, while a modal, drawer or menu is open that doesn't hold the
 *   trigger, or while another card of the group is pinned;
 * - Esc closes it and it stays closed until the pointer (or focus) leaves
 *   the trigger;
 * - pin() keeps it open until unpinned, Esc, × or a click outside;
 * - on touch or a narrow window, openSheet() opens a bottom sheet instead;
 * - with trigger "click", hover and focus open nothing: the caller pins;
 * - Enter or Space on the trigger clicks it; a card that click pinned
 *   takes the focus, so its buttons are in reach.
 *
 * @author jplacht
 *
 * @param {Ref<HTMLElement | null>} trigger Trigger element
 * @param {Ref<HTMLElement | null>} panel Card element
 * @param {MaybeRefOrGetter<IHoverCardOptions>} options Timing and trigger;
 *   the trigger is read on every event, the timing once
 * @param {() => void} onOpen Called whenever the card or sheet opens
 * @returns open state, the card's id, the actions and the listeners for
 * trigger and card
 */
export function useHoverCard(
	trigger: Ref<HTMLElement | null>,
	panel: Ref<HTMLElement | null>,
	options: MaybeRefOrGetter<IHoverCardOptions> = {},
	onOpen: () => void = () => {}
) {
	const { openDelay = 300, swapDelay = 80, closeDelay = 300 } =
		toValue(options);
	const mode = () => toValue(options).trigger ?? "hover";

	const open = ref(false);
	const pinned = ref(false);
	const sheet = ref(false);
	const id = useId();

	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	// Esc closed it: no reopening until the pointer leaves the trigger
	let blocked = false;
	let lastPointer = "";
	// the next focus comes from a press on the trigger
	let pointerFocus = false;

	watchScroll();

	const self: IGroupMember = { hide, cancel, isPinned: () => pinned.value };

	// another card stays until it is unpinned
	const otherPinned = () => !!current && current !== self && current.isPinned();
	const blockedByLayer = () => layerOver(trigger.value);

	function cancel(): void {
		clearTimeout(openTimer);
		if (pending === self) pending = null;
	}

	function show(): void {
		cancel();
		clearTimeout(closeTimer);
		if (current && current !== self) current.hide();
		current = self;
		if (!open.value) onOpen();
		open.value = true;
	}

	function hide(): void {
		cancel();
		clearTimeout(closeTimer);
		// focus in the card goes back to the trigger, which opens nothing
		if (open.value && panel.value?.contains(document.activeElement)) {
			pointerFocus = true;
			trigger.value?.focus();
		}
		open.value = false;
		pinned.value = false;
		if (current === self) current = null;
	}

	function tryOpen(): void {
		const quiet = Date.now() - lastScroll;
		if (quiet < SCROLL_QUIET_MS) return schedule(SCROLL_QUIET_MS - quiet);
		if (blocked || otherPinned() || blockedByLayer() || hasSelection())
			return cancel();
		show();
	}

	function schedule(delay: number): void {
		if (pending && pending !== self) pending.cancel();
		clearTimeout(openTimer);
		pending = self;
		openTimer = setTimeout(tryOpen, delay);
	}

	function scheduleClose(): void {
		clearTimeout(closeTimer);
		closeTimer = setTimeout(hide, closeDelay);
	}

	function pin(): void {
		show();
		pinned.value = true;
	}

	function togglePin(): void {
		if (pinned.value) hide();
		else pin();
	}

	/** a tap on touch or in a narrow window wants the sheet */
	function wantsSheet(): boolean {
		return (
			lastPointer === "touch" ||
			!!window.matchMedia?.(SHEET_QUERY).matches
		);
	}

	function openSheet(): void {
		hide();
		onOpen();
		sheet.value = true;
	}

	/** the next focus on the trigger opens nothing, e.g. focus a layer returns */
	function ignoreFocus(): void {
		pointerFocus = true;
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key !== "Escape" || !open.value) return;
		// handled: the layer around it ignores a prevented Esc
		e.preventDefault();
		hide();
		blocked = true;
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

	// the sheet returns focus to the trigger when it closes
	watch(sheet, (value) => !value && ignoreFocus());

	watch(open, (value) => {
		if (!value) return unlisten();
		document.addEventListener("keydown", onKeydown, true);
		document.addEventListener("pointerdown", onDocumentDown, true);
	});

	onBeforeUnmount(() => {
		hide();
		unlisten();
	});

	const inside = (node: EventTarget | null) =>
		node instanceof Node &&
		(!!trigger.value?.contains(node) || !!panel.value?.contains(node));

	const triggerEvents = {
		keydown: (e: KeyboardEvent) => {
			const el = trigger.value;
			if (!el || e.target !== el || (e.key !== "Enter" && e.key !== " "))
				return;
			e.preventDefault();
			el.click();
			if (!pinned.value) return;
			nextTick(() =>
				panel.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
			);
		},
		pointerdown: (e: PointerEvent) => {
			lastPointer = e.pointerType;
			pointerFocus = true;
		},
		pointerenter: (e: PointerEvent) => {
			lastPointer = e.pointerType;
			if (mode() !== "hover" || e.pointerType === "touch" || e.buttons || wantsSheet())
				return;
			clearTimeout(closeTimer);
			if (open.value || otherPinned()) return;
			schedule(current && current !== self ? swapDelay : openDelay);
		},
		pointerleave: (e: PointerEvent) => {
			if (e.pointerType === "touch") return;
			blocked = false;
			cancel();
			if (open.value && !pinned.value) scheduleClose();
		},
		focusin: () => {
			// keyboard focus only; a click's focus leaves it to the click
			const byPointer = pointerFocus;
			pointerFocus = false;
			// no floating card where a tap opens the sheet
			if (byPointer || blocked || mode() !== "hover" || wantsSheet()) return;
			if (otherPinned() || blockedByLayer()) return;
			show();
		},
		focusout: (e: FocusEvent) => {
			if (inside(e.relatedTarget)) return;
			// keyboard users get the card back on their next visit
			blocked = false;
			pointerFocus = false;
			if (!pinned.value) hide();
		},
	};

	const panelEvents = {
		pointerenter: () => {
			clearTimeout(closeTimer);
			// crossing another trigger on the way to the card swaps nothing
			if (pending && pending !== self) pending.cancel();
		},
		pointerleave: () => {
			if (!pinned.value) scheduleClose();
		},
		focusout: (e: FocusEvent) => {
			if (!pinned.value && !inside(e.relatedTarget)) hide();
		},
	};

	return {
		open,
		pinned,
		sheet,
		id,
		show,
		hide,
		pin,
		togglePin,
		wantsSheet,
		openSheet,
		ignoreFocus,
		triggerEvents,
		panelEvents,
	};
}
