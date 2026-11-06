import {
	computed,
	nextTick,
	onBeforeUnmount,
	ref,
	type Ref,
	shallowRef,
} from "vue";
import { useI18n } from "vue-i18n";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useConfirm, useToast } from "@/ui";

// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
	HeightMode,
	ILayoutChange,
	IPackResult,
} from "@/features/planning/layout/planLayout.types";
import type { PDropdownOption, PToastHandle } from "@/ui/ui.types";
import type { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
import type { ISnap, SnapKind } from "@/features/planning/layout/snapping";

// Util
import * as ops from "@/features/planning/layout/layoutOps";
import {
	ELEMENT_IDS,
	ELEMENTS,
	minHeightOf,
	minWidthOf,
	OPENABLE,
	TABLE_VIEW,
} from "@/features/planning/layout/elements";
import { packLayout } from "@/features/planning/layout/packLayout";
import { cloneLayout } from "@/features/planning/layout/normaliseLayout";
import { presetLayout } from "@/features/planning/layout/presets";
import { snapHeightTo, snapTopTo } from "@/features/planning/layout/snapping";
import { visibleLayout } from "@/features/planning/layout/usePlanGrid";

/** Preview widths of the editor; 0 is the page's own, 390 a phone */
export const PREVIEW_WIDTHS = [0, 1600, 1440, 1280, 1024, 390] as const;
export const PHONE_PREVIEW = 390;
// a pointer moves this far before a press becomes a drag
const DRAG_START = 6;
// changes that get a toast with Undo (their announcement keys)
const TOASTED = new Set(["hidden", "tab", "taken_out", "split", "reset"]);

type How = "drag" | "menu" | "keys";
type Region = "band" | "page";

/** What the editor reads of its grid */
export interface IEditorGrid {
	pack: IPackResult;
	content: Record<string, number>;
	gridWidth: number;
}

/**
 * A move in progress: an item, a tab out of its group, or an element from
 * the Elements panel
 */
export interface IEditorDrag {
	id: string | null;
	el: ElementId;
	// the group a tab is dragged out of
	from: string | null;
	x: number;
	w: number;
	// where the box follows the pointer, grid px
	left: number;
	top: number;
	region: Region;
	snap: ISnap | null;
	// dropped on this item's title bar: a tab there
	tabTo: string | null;
}

/** A resize in progress */
export interface IEditorResize {
	id: string;
	kind: "w" | "h" | "wh";
	w: number;
	h: number;
	snap: ISnap | null;
	atMin: boolean;
	wMin: boolean;
}

/**
 * Customise mode: a draft of the layout changed by the ops, with undo,
 * announcements and toasts; dragging and resizing with the pointer, the
 * same with the keyboard and the ⋯ menu; saving into Custom Layout
 * @author jplacht
 *
 * @param {ReturnType<typeof usePlanLayoutPreference>} pref The player's layout
 * @param {{ loggedIn: () => boolean; grid: () => IEditorGrid | null; zoom: () => number; root: () => HTMLElement | null; close: () => void }} env Its surroundings
 */
export function usePlanLayoutEditor(
	pref: ReturnType<typeof usePlanLayoutPreference>,
	env: {
		loggedIn: () => boolean;
		grid: () => IEditorGrid | null;
		zoom: () => number;
		root: () => HTMLElement | null;
		close: () => void;
	}
) {
	const { t } = useI18n();
	const toast = useToast();
	const confirm = useConfirm();

	const startChoice = pref.choice.value;
	// customising a preset starts from a copy of it
	const startFrom = startChoice === "custom" ? null : startChoice;
	const draft: Ref<GridLayout> = ref(cloneLayout(pref.layout.value));
	const history: Ref<GridLayout[]> = ref([]);
	const refPreview: Ref<number> = ref(0);
	const refPanel: Ref<boolean> = ref(true);
	const refConfirmReplace: Ref<boolean> = ref(false);
	const refAnnounce: Ref<string> = ref("");
	const refMenu: Ref<string | null> = ref(null);
	// the ⋯ menu's page, while its menu is open
	const refMenuPage: Ref<"tabs" | null> = ref(null);
	/** Opens an item's ⋯ menu on its first page, or closes it (null) */
	function setMenu(id: string | null): void {
		if (id && id !== refMenu.value) refMenuPage.value = null;
		refMenu.value = id;
	}
	const refFlash: Ref<string | null> = ref(null);
	const drag = shallowRef<IEditorDrag | null>(null);
	const resize = shallowRef<IEditorResize | null>(null);

	const phone = computed(() => refPreview.value === PHONE_PREVIEW);
	const shown = computed(() => visibleLayout(draft.value, env.loggedIn()));

	const label = (el: ElementId): string => t(ELEMENTS[el].label);
	const title = (els: ElementId[]): string =>
		els.length > 1
			? t(
					"plan.layout.item_title",
					{ name: label(els[0]), n: els.length - 1 },
					els.length - 1
				)
			: label(els[0]);
	const ctx = (): ops.ILayoutOpsContext => ({
		width: env.grid()?.gridWidth ?? 1280,
		pack: env.grid()?.pack,
		title,
		label,
	});
	const itemOf = (id: string): GridItem | undefined =>
		draft.value.items.find((i) => i.id === id);

	/*
	 * Changes: every one undoable, announced and toasted with Undo
	 */
	let lastToast: PToastHandle | undefined;
	function announce(text: string): void {
		refAnnounce.value = text;
	}
	function focusHandle(id: string | undefined): void {
		if (!id) return;
		void nextTick(() =>
			env
				.root()
				?.querySelector<HTMLElement>(`[data-handle="${id}"]`)
				?.focus({ preventScroll: true })
		);
	}
	function apply(
		change: ILayoutChange,
		focus?: string,
		extra?: string
	): boolean {
		if (change.announcement.key.endsWith(".nothing")) return false;
		colsFrom = null;
		history.value = [...history.value, draft.value];
		draft.value = change.layout;
		const text = [
			t(change.announcement.key, change.announcement.params),
			extra,
		]
			.filter(Boolean)
			.join(" · ");
		announce(text);
		lastToast?.destroy();
		lastToast = undefined;
		// a toast only when an element leaves the page or its group; the
		// rest shows on the grid, and Undo is in the bar
		if (TOASTED.has(change.announcement.key.split(".").pop()!))
			lastToast = toast(text, {
				action: {
					label: t("plan.layout.undo"),
					onClick: () => undo("toast"),
				},
				duration: 5000,
			});
		refMenu.value = null;
		focusHandle(focus);
		return true;
	}

	function undo(how: "toast" | "button" | "keys"): void {
		const prev = history.value.at(-1);
		if (!prev) return;
		history.value = history.value.slice(0, -1);
		colsFrom = null;
		draft.value = prev;
		lastToast?.destroy();
		announce(t("plan.layout.announce.undone"));
		trackEvent("plan:layout_undo", { how });
	}

	const trackMove = (
		el: ElementId,
		how: How,
		to: "page" | "band" | "tabs" | "hidden"
	) => trackEvent("plan:layout_item_move", { element: el, how, to });
	const trackResize = (
		el: ElementId,
		how: How,
		what: "width" | "height",
		snapped: "bottom" | "height" | "content" | null = null
	) =>
		trackEvent("plan:layout_item_resize", {
			element: el,
			how,
			what,
			snapped,
		});

	/*
	 * The ops, as the menu, the keys and the drags use them: each on the
	 * item it names (one the menu or the keys come from), tracked when it
	 * changed something
	 */
	type Op = (g: GridLayout, c: ops.ILayoutOpsContext) => ILayoutChange;
	function run(id: string, op: Op, track: (it: GridItem) => void): void {
		const it = itemOf(id)!;
		if (apply(op(draft.value, ctx()), id)) track(it);
	}
	const regionOf = (it: GridItem) => (it.pin ? "band" : "page");
	const moveX = (id: string, dx: number, how: How) =>
		run(
			id,
			(g, c) => ops.moveX(g, id, dx, c),
			(it) => trackMove(it.els[0], how, regionOf(it))
		);
	const moveY = (id: string, dir: -1 | 1, how: How) =>
		run(
			id,
			(g, c) => ops.moveY(g, id, dir, c),
			(it) => trackMove(it.els[0], how, regionOf(it))
		);
	const setWidth = (id: string, w: number, how: How) =>
		run(
			id,
			(g, c) => ops.setWidth(g, id, w, c),
			(it) => trackResize(it.els[0], how, "width")
		);
	const fullWidth = (id: string) =>
		run(
			id,
			(g, c) => ops.fullWidth(g, id, c),
			(it) => trackResize(it.els[0], "menu", "width")
		);
	const setHeightMode = (id: string, hm: HeightMode) =>
		run(
			id,
			(g, c) => ops.setHeightMode(g, id, hm, c),
			(it) => trackResize(it.els[0], "menu", "height")
		);
	const stepHeight = (id: string, dir: -1 | 1, how: How) =>
		run(
			id,
			(g, c) => ops.stepHeight(g, id, dir, c),
			(it) => trackResize(it.els[0], how, "height")
		);
	// tracked where it goes: the band, or back to the page
	const togglePin = (id: string) =>
		run(
			id,
			(g, c) => ops.togglePin(g, id, c),
			(it) => trackMove(it.els[0], "menu", it.pin ? "page" : "band")
		);
	const takeOut = (id: string, el: ElementId) =>
		run(
			id,
			(g, c) => ops.takeOut(g, id, el, c),
			() => trackMove(el, "menu", "page")
		);
	const split = (id: string) =>
		run(
			id,
			(g, c) => ops.split(g, id, c),
			(it) => trackMove(it.els[0], "menu", "page")
		);
	function hide(id: string, el: ElementId): void {
		if (apply(ops.hide(draft.value, id, el, ctx())))
			trackMove(el, "menu", "hidden");
	}
	function add(el: ElementId): void {
		if (apply(ops.add(draft.value, el, ctx()))) {
			trackMove(el, "menu", "page");
			focusHandle(draft.value.items.find((i) => i.els.includes(el))?.id);
		}
	}
	// a run of column changes rescales from where it started, so rounding
	// never drifts an item wider step by step
	let colsFrom: GridLayout | null = null;
	function setCols(n: number): void {
		const from = colsFrom ?? draft.value;
		if (apply(ops.setCols(from, n, ctx()))) colsFrom = from;
	}
	function setGap(gap: number): void {
		apply(ops.setGap(draft.value, gap, ctx()));
	}
	function toggleOpen(el: ElementId): void {
		apply(ops.toggleOpen(draft.value, el, ctx()));
	}
	function setTab(id: string, el: ElementId): void {
		// switching a tab is no change worth an undo, but it is saved
		colsFrom = null;
		draft.value = ops.setActive(draft.value, id, el, ctx()).layout;
	}
	function reset(): void {
		apply({
			layout: presetLayout("today"),
			announcement: { key: "plan.layout.announce.reset", params: {} },
		});
	}

	/** Shows an element: switches its tab, scrolls to it, highlights it */
	function show(el: ElementId): void {
		// the panel shows only placed elements
		const it = draft.value.items.find((i) => i.els.includes(el))!;
		if (it.active !== el) setTab(it.id, el);
		refFlash.value = it.id;
		setTimeout(() => {
			if (refFlash.value === it.id) refFlash.value = null;
		}, 1500);
		void nextTick(() => {
			const box = env
				.root()
				?.querySelector<HTMLElement>(`[data-item="${it.id}"]`);
			box?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		});
		focusHandle(it.id);
	}

	/*
	 * Keyboard on an item's handle: arrows move, Shift+arrows resize,
	 * Enter or Space opens the menu
	 */
	function onHandleKey(e: KeyboardEvent, id: string): void {
		const it = itemOf(id)!;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setMenu(id);
			return;
		}
		if (phone.value || !e.key.startsWith("Arrow")) return;
		e.preventDefault();
		if (e.shiftKey) {
			if (e.key === "ArrowLeft") setWidth(id, it.w - 1, "keys");
			else if (e.key === "ArrowRight") setWidth(id, it.w + 1, "keys");
			else stepHeight(id, e.key === "ArrowDown" ? 1 : -1, "keys");
		} else if (e.key === "ArrowLeft" || e.key === "ArrowRight")
			moveX(id, e.key === "ArrowLeft" ? -1 : 1, "keys");
		else moveY(id, e.key === "ArrowUp" ? -1 : 1, "keys");
	}

	/*
	 * The ⋯ menu: every move as an item, a disabled one says why
	 */
	const minCols = (it: Pick<GridItem, "els">): number =>
		ops.minCols(it, draft.value, ctx());

	function menuOptions(id: string): PDropdownOption[] {
		const it = itemOf(id)!;
		const g = draft.value;
		const p = env.grid()?.pack.items[id];
		const name = title(it.els);
		const mc = minCols(it);
		const mh = minHeightOf(it);
		const hNow = it.hm === "fit" ? Math.round(p?.height ?? 0) : it.h;
		const capH = Math.max(
			mh,
			it.h || ops.snapHeight(Math.min(p?.content || 400, 480), mh)
		);
		const opts: PDropdownOption[] = [
			{
				type: "group",
				label: t("plan.layout.menu_width", { n: it.w, cols: g.cols }),
			},
			{
				key: "narrower",
				label: t("plan.layout.narrower"),
				disabled: it.w <= mc,
				hint:
					it.w <= mc
						? t("plan.layout.why.min_width", {
								name,
								px: minWidthOf(it),
								n: mc,
								cols: g.cols,
							})
						: undefined,
			},
			{
				key: "wider",
				label: t("plan.layout.wider"),
				disabled: it.x + it.w >= g.cols,
				hint:
					it.x + it.w >= g.cols
						? t("plan.layout.why.right_edge")
						: undefined,
			},
			{
				key: "full",
				label: t("plan.layout.full_width"),
				disabled: it.w === g.cols,
				hint:
					it.w === g.cols
						? t("plan.layout.why.full_width")
						: undefined,
			},
			{ type: "divider" },
			{
				type: "group",
				label:
					it.hm === "fit"
						? t("plan.layout.menu_height_fit", { h: hNow })
						: t(`plan.layout.menu_height_${it.hm}`, { h: it.h }),
			},
			{
				key: "hm-fit",
				label: t("plan.layout.height_fit"),
				checked: it.hm === "fit",
			},
			{
				key: "hm-cap",
				label: t("plan.layout.height_cap", { h: capH }),
				checked: it.hm === "cap",
			},
			{
				key: "hm-fixed",
				label: t("plan.layout.height_fixed", { h: capH }),
				checked: it.hm === "fixed",
			},
			{ key: "taller", label: t("plan.layout.taller") },
			{
				key: "shorter",
				label: t("plan.layout.shorter"),
				disabled: hNow <= mh,
				hint:
					hNow <= mh
						? t("plan.layout.why.min_height", { name, px: mh })
						: undefined,
			},
			{ type: "divider" },
			{
				key: "pin",
				label: t("plan.layout.keep_in_view"),
				hint: t("plan.layout.keep_in_view_hint"),
				checked: it.pin,
			},
			{
				key: "follow",
				label: t("plan.layout.follow"),
				hint: t("plan.layout.follow_hint"),
				checked: !!it.follow,
			},
			{ type: "divider" },
			// how the tab shown displays: cards or a table, everything open
			...(TABLE_VIEW.includes(it.active) || OPENABLE.includes(it.active)
				? ([
						{ type: "group", label: t("plan.layout.display") },
						...(TABLE_VIEW.includes(it.active)
							? (["cards", "table"] as const).map((v) => ({
									key: `view:${v}`,
									label: t(`plan.layout.view_${v}`),
									checked:
										!!g.table?.includes(it.active) ===
										(v === "table"),
								}))
							: []),
						...(OPENABLE.includes(it.active)
							? [
									{
										key: "open",
										label: t("plan.layout.content_open"),
										hint: t(
											"plan.layout.content_open_hint"
										),
										checked: !!g.open?.includes(it.active),
									},
								]
							: []),
						{ type: "divider" },
					] as PDropdownOption[])
				: []),
			{ type: "group", label: t("plan.layout.move") },
			{ key: "up", label: t("plan.layout.up") },
			{ key: "down", label: t("plan.layout.down") },
			{
				key: "left",
				label: t("plan.layout.left"),
				disabled: it.x === 0,
				hint: it.x === 0 ? t("plan.layout.why.left_edge") : undefined,
			},
			{
				key: "right",
				label: t("plan.layout.right"),
				disabled: it.x + it.w >= g.cols,
				hint:
					it.x + it.w >= g.cols
						? t("plan.layout.why.right_edge")
						: undefined,
			},
			{ type: "divider" },
		];
		// tabs on a page of their own: a group's list, or every item to join
		if (refMenuPage.value === "tabs" && refMenu.value === id)
			return tabPage(it);
		opts.push({
			key: "page:tabs",
			label:
				it.els.length > 1
					? t("plan.layout.tabs_more", { n: it.els.length })
					: t("plan.layout.make_tab_more"),
		});
		opts.push({ type: "divider" });
		const hideEl = it.els.length > 1 ? it.active : it.els[0];
		const blocked = ops.hideBlocked(hideEl);
		opts.push({
			key: "hide",
			label:
				it.els.length > 1
					? t("plan.layout.hide_tab", { name: label(hideEl) })
					: t("plan.layout.hide"),
			disabled: !!blocked,
			hint: blocked ? t(blocked) : undefined,
		});
		return opts;
	}

	/** The ⋯ menu's tabs page: Back, then take out and split, or join */
	function tabPage(it: GridItem): PDropdownOption[] {
		const g = draft.value;
		const opts: PDropdownOption[] = [
			{ key: "page:main", label: t("plan.layout.menu_back") },
			{ type: "divider" },
		];
		if (it.els.length > 1) {
			opts.push({ type: "group", label: t("plan.layout.tabs") });
			for (const el of it.els)
				opts.push({
					key: `out:${el}`,
					label: t("plan.layout.take_out", { name: label(el) }),
					disabled: el === it.els[0],
					hint:
						el === it.els[0]
							? t("plan.layout.why.first_tab")
							: undefined,
				});
			opts.push({ key: "split", label: t("plan.layout.split") });
		} else {
			// the menu's way to what dragging onto a title bar does
			opts.push({ type: "group", label: t("plan.layout.make_tab") });
			for (const o of g.items.filter((o) => o !== it))
				opts.push({
					key: `tab:${o.id}`,
					label: title(o.els),
				});
		}
		return opts;
	}

	function onMenu(id: string, key: string): void {
		const it = itemOf(id)!;
		// a page switch keeps the menu open
		if (key.startsWith("page:")) {
			refMenuPage.value = key === "page:tabs" ? "tabs" : null;
			refMenu.value = id;
			return;
		}
		if (key === "narrower") setWidth(id, it.w - 1, "menu");
		else if (key === "wider") setWidth(id, it.w + 1, "menu");
		else if (key === "full") fullWidth(id);
		else if (key.startsWith("hm-"))
			setHeightMode(id, key.slice(3) as HeightMode);
		else if (key === "taller") stepHeight(id, 1, "menu");
		else if (key === "shorter") stepHeight(id, -1, "menu");
		else if (key === "pin") togglePin(id);
		else if (key === "follow")
			apply(ops.toggleFollow(draft.value, id, ctx()), id);
		else if (key === "open") toggleOpen(it.active);
		else if (key.startsWith("view:"))
			apply(
				ops.setView(
					draft.value,
					it.active,
					key.slice(5) as "cards" | "table",
					ctx()
				),
				id
			);
		else if (key === "up") moveY(id, -1, "menu");
		else if (key === "down") moveY(id, 1, "menu");
		else if (key === "left") moveX(id, -1, "menu");
		else if (key === "right") moveX(id, 1, "menu");
		else if (key.startsWith("out:")) takeOut(id, key.slice(4) as ElementId);
		else if (key === "split") split(id);
		else if (key.startsWith("tab:")) {
			const to = key.slice(4);
			if (apply(ops.makeTab(draft.value, { item: id }, to, ctx()), to))
				trackMove(it.els[0], "menu", "tabs");
		} else if (key === "hide")
			hide(id, it.els.length > 1 ? it.active : it.els[0]);
	}

	/*
	 * Pointer: listeners on window while a press lasts, a drag after 6 px,
	 * Esc cancels; pointer maths divide by the page's zoom
	 */
	let press: {
		x: number;
		y: number;
		started: boolean;
		off: { x: number; y: number };
		id: string | null;
		el: ElementId;
		from: string | null;
	} | null = null;
	let rs: {
		id: string;
		kind: "w" | "h" | "wh";
		x: number;
		y: number;
		w0: number;
		h0: number;
		x0: number;
		minW: number;
		minH: number;
	} | null = null;

	// while customising the grid is there, a region only with its items
	const grid = (): IEditorGrid => env.grid()!;
	function gridPoint(
		e: PointerEvent,
		region: Region
	): { x: number; y: number } {
		const r = env
			.root()!
			.querySelector<HTMLElement>(`[data-grid="${region}"]`)!
			.getBoundingClientRect();
		const z = env.zoom();
		return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z };
	}

	function onKeyCancel(e: KeyboardEvent): void {
		if (e.key !== "Escape") return;
		e.stopPropagation();
		press = null;
		rs = null;
		drag.value = null;
		resize.value = null;
		stopListening();
	}
	function listen(): void {
		document.body.style.userSelect = "none";
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerCancel);
		window.addEventListener("keydown", onKeyCancel, true);
	}
	function stopListening(): void {
		document.body.style.userSelect = "";
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("pointercancel", onPointerCancel);
		window.removeEventListener("keydown", onKeyCancel, true);
	}
	onBeforeUnmount(stopListening);

	/**
	 * Press on an item's title bar, a tab, or an element in the Elements
	 * panel: a placed element moves its item, a tab after the first leaves
	 * its group
	 */
	function startMove(
		e: PointerEvent,
		from: { id: string } | { el: ElementId }
	): void {
		if (phone.value || e.button !== 0) return;
		const el = "el" in from ? from.el : itemOf(from.id)!.els[0];
		const placed =
			"el" in from
				? draft.value.items.find((i) => i.els.includes(el))
				: undefined;
		const tabOf = placed && placed.els[0] !== el ? placed.id : null;
		const id = "id" in from ? from.id : tabOf ? null : (placed?.id ?? null);
		// where on the item it was taken; one from Elements by its corner
		let off = { x: 20, y: 16 };
		const p = id ? grid().pack.items[id] : undefined;
		if (p) {
			const q = gridPoint(e, p.region);
			off = { x: q.x - p.left, y: q.y - p.top };
		}
		press = {
			x: e.clientX,
			y: e.clientY,
			started: false,
			off,
			id,
			el,
			from: tabOf,
		};
		listen();
	}

	/** Press on an item's right edge (w), bottom edge (h) or corner (wh) */
	function startResize(
		e: PointerEvent,
		id: string,
		kind: "w" | "h" | "wh"
	): void {
		if (phone.value || e.button !== 0) return;
		const p = grid().pack.items[id];
		const it = itemOf(id)!;
		e.stopPropagation();
		e.preventDefault();
		rs = {
			id,
			kind,
			x: e.clientX,
			y: e.clientY,
			w0: p.w,
			h0: p.height,
			x0: p.x,
			minW: minCols(it),
			minH: minHeightOf(it),
		};
		resize.value = {
			id,
			kind,
			w: p.w,
			h: p.height,
			snap: null,
			atMin: false,
			wMin: false,
		};
		refMenu.value = null;
		listen();
	}

	function onPointerMove(e: PointerEvent): void {
		if (rs) return resizeMove(e);
		// listening means a press or a resize
		const press0 = press!;
		if (!press0.started) {
			if (
				Math.abs(e.clientX - press0.x) +
					Math.abs(e.clientY - press0.y) <
				DRAG_START
			)
				return;
			press0.started = true;
			refMenu.value = null;
		}
		const { pack } = grid();
		const cur = press0.id ? itemOf(press0.id) : undefined;
		// over neither region: where it was
		let region: Region =
			drag.value?.region ?? (cur ? regionOf(cur) : "page");
		let tabTo: string | null = null;
		const hit = document.elementFromPoint?.(e.clientX, e.clientY) ?? null;
		const rg = hit?.closest?.("[data-region]")?.getAttribute("data-region");
		if (rg === "band" || rg === "page") region = rg;
		const head = hit
			?.closest?.("[data-item-head]")
			?.getAttribute("data-item-head");
		if (
			head &&
			head !== press0.id &&
			head !== press0.from &&
			(!cur || cur.els.length === 1)
		)
			tabTo = head;
		const q = gridPoint(e, region);
		const g = draft.value;
		const step = pack.page.colWidth + g.gap;
		const probe = cur ?? { els: [press0.el] };
		const w = Math.max(
			cur
				? pack.items[cur.id].w
				: Math.min(
						g.cols,
						Math.round((ELEMENTS[press0.el].defaultW * g.cols) / 12)
					),
			minCols(probe)
		);
		const x = Math.max(
			0,
			Math.min(g.cols - w, Math.round((q.x - press0.off.x) / step))
		);
		const top = q.y - press0.off.y;
		const snap = snapTopTo(pack, press0.id, {
			x,
			w,
			y: top,
			region,
			zoom: env.zoom(),
			off: e.altKey,
		});
		drag.value = {
			id: press0.id,
			el: press0.el,
			from: press0.from,
			x,
			w,
			left: q.x - press0.off.x,
			top,
			region,
			snap,
			tabTo,
		};
	}

	function resizeMove(e: PointerEvent): void {
		const r = rs!;
		const { pack } = grid();
		const z = env.zoom();
		const g = draft.value;
		const dx = (e.clientX - r.x) / z;
		const dy = (e.clientY - r.y) / z;
		const step = pack.page.colWidth + g.gap;
		const w =
			r.kind === "h"
				? r.w0
				: Math.max(
						r.minW,
						Math.min(g.cols - r.x0, r.w0 + Math.round(dx / step))
					);
		let h = r.h0;
		let snap: ISnap | null = null;
		let atMin = false;
		if (r.kind !== "w") {
			const raw = Math.max(r.minH, r.h0 + dy);
			h = ops.snapHeight(raw, r.minH);
			atMin = h === r.minH;
			snap = snapHeightTo(pack, r.id, raw, {
				w,
				min: r.minH,
				zoom: z,
				off: e.altKey,
			});
			if (snap) h = snap.value;
		}
		resize.value = {
			id: r.id,
			kind: r.kind,
			w,
			h,
			snap,
			atMin: atMin && !snap,
			wMin: r.kind !== "h" && w === r.minW,
		};
	}

	/** The text of a snap, for the badge, the line and the toast */
	function snapText(s: ISnap): string {
		const ref = s.ref ? itemOf(s.ref) : undefined;
		const name = ref ? title(ref.els) : "";
		if (s.kind === "content") return t("plan.layout.snap.content");
		if (s.kind === "bottom") return t("plan.layout.snap.bottom", { name });
		if (s.kind === "height")
			return t("plan.layout.snap.height", { name, h: s.value });
		return t("plan.layout.snap.top", { name });
	}

	function onPointerUp(): void {
		stopListening();
		if (rs) return resizeUp();
		const p = press;
		const d = drag.value;
		press = null;
		drag.value = null;
		if (!p?.started || !d) return;
		const g = draft.value;
		if (d.tabTo) {
			const change = d.from
				? ops.takeOutTo(g, d.from, d.el, { tab: d.tabTo }, ctx())
				: ops.makeTab(
						g,
						d.id ? { item: d.id } : { el: d.el },
						d.tabTo,
						ctx()
					);
			if (apply(change, d.tabTo)) trackMove(d.el, "drag", "tabs");
			return;
		}
		const to = {
			x: d.x,
			y: d.snap ? d.snap.value : d.top,
			band: d.region === "band",
		};
		const change = d.id
			? ops.moveTo(g, d.id, to, ctx())
			: d.from
				? ops.takeOutTo(g, d.from, d.el, to, ctx())
				: ops.addAt(g, d.el, to, ctx());
		if (
			apply(
				change,
				d.id ?? undefined,
				d.snap ? snapText(d.snap) : undefined
			)
		) {
			trackMove(d.el, "drag", to.band ? "band" : "page");
			if (!d.id)
				focusHandle(
					draft.value.items.find((i) => i.els.includes(d.el))?.id
				);
		}
	}

	function resizeUp(): void {
		const r = rs!;
		const z = resize.value;
		rs = null;
		resize.value = null;
		if (!z || (z.w === r.w0 && z.h === r.h0)) return;
		const el = itemOf(r.id)!.els[0];
		// a resize snaps to bottoms, heights and content, never to tops
		const snapped = (z.snap?.kind ?? null) as SnapKind | null;
		// the width only when it was dragged: the packed one may be "auto"
		const widened =
			z.w === r.w0 ? null : ops.setWidth(draft.value, r.id, z.w, ctx());
		const change =
			z.h === r.h0
				? widened!
				: ops.setHeight(
						widened?.layout ?? draft.value,
						r.id,
						z.h,
						ctx(),
						snapped
					);
		if (apply(change, r.id, z.snap ? snapText(z.snap) : undefined)) {
			if (z.w !== r.w0) trackResize(el, "drag", "width");
			if (z.h !== r.h0) trackResize(el, "drag", "height", snapped);
		}
	}

	function onPointerCancel(): void {
		stopListening();
		press = null;
		rs = null;
		drag.value = null;
		resize.value = null;
	}

	/** Where a dragged item would land, as the packing puts it */
	const landing = computed(() => {
		const d = drag.value;
		if (!d || d.tabTo) return null;
		const to = {
			x: d.x,
			y: d.snap ? d.snap.value : d.top,
			band: d.region === "band",
		};
		const g = d.id
			? ops.moveTo(draft.value, d.id, to, ctx()).layout
			: d.from
				? ops.takeOutTo(draft.value, d.from, d.el, to, ctx()).layout
				: ops.addAt(draft.value, d.el, to, ctx()).layout;
		const it = g.items.find((i) => i.els.includes(d.el))!;
		const { gridWidth, content } = grid();
		return packLayout(visibleLayout(g, env.loggedIn()), gridWidth, content)
			.items[it.id];
	});

	/*
	 * Leaving: save into Custom Layout (asking before replacing one),
	 * cancel (asking when there are changes)
	 */
	function save(force: boolean = false): void {
		const replaced = !!pref.custom.value;
		if (startFrom !== null && replaced && !force) {
			refConfirmReplace.value = true;
			announce(t("plan.layout.replace_question"));
			return;
		}
		const g = draft.value;
		pref.saveCustom(g);
		trackEvent("plan:layout_save", {
			items: g.items.length,
			tabs: g.items.filter((i) => i.els.length > 1).length,
			kept_in_view: g.items.filter((i) => i.pin).length,
			hidden: ELEMENT_IDS.filter(
				(e) => !g.items.some((i) => i.els.includes(e))
			).length,
			cols: g.cols,
			gap: g.gap,
			replaced,
			store: "session",
		});
		lastToast?.destroy();
		toast(t("plan.layout.saved"));
		env.close();
	}

	function cancel(): void {
		trackEvent("plan:layout_cancel", { changes: history.value.length });
		lastToast?.destroy();
		env.close();
	}

	async function requestCancel(): Promise<void> {
		if (
			!history.value.length ||
			(await confirm({
				title: t("plan.layout.leave_title"),
				content: t("plan.layout.leave_content"),
				positiveText: t("plan.layout.leave_discard"),
				negativeText: t("plan.layout.keep_editing"),
			}))
		)
			cancel();
	}

	/** Elements: where each one is, for the panel */
	const where = (el: ElementId): string => {
		const it = draft.value.items.find((i) => i.els.includes(el));
		if (!it) return t("plan.layout.where.hidden");
		if (it.els.length > 1 && it.els[0] !== el)
			return t("plan.layout.where.tab", { name: label(it.els[0]) });
		return it.pin
			? t("plan.layout.where.band")
			: t("plan.layout.where.page");
	};

	return {
		draft,
		shown,
		history,
		startFrom,
		refPreview,
		refPanel,
		refConfirmReplace,
		refAnnounce,
		refMenu,
		refFlash,
		drag,
		resize,
		landing,
		phone,
		title,
		label,
		minCols,
		where,
		undo,
		add,
		show,
		setCols,
		setGap,
		setTab,
		toggleOpen,
		reset,
		onHandleKey,
		menuOptions,
		onMenu,
		setMenu,
		startMove,
		startResize,
		snapText,
		save,
		requestCancel,
	};
}
