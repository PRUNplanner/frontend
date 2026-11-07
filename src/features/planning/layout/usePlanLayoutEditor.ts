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
import {
	AddSharp,
	ArrowBackSharp,
	ArrowDownwardSharp,
	ArrowForwardSharp,
	ArrowUpwardSharp,
	RemoveSharp,
	SyncAltSharp,
} from "@vicons/material";

// Types & Interfaces
import type {
	ElementId,
	GridItem,
	GridLayout,
	HeightMode,
	JoinSide,
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
import { besideSplit } from "@/features/planning/layout/planGrid.util";
import {
	H_MAX,
	H_MIN,
	H_STEP,
} from "@/features/planning/layout/planLayout.constants";
import {
	hostOf,
	partnerOf,
	tabEls,
	tabsOf,
} from "@/features/planning/layout/tabs";

/** Preview widths of the editor; 0 is the page's own, 390 a phone */
export const PREVIEW_WIDTHS = [0, 1600, 1440, 1280, 1024, 390] as const;
export const PHONE_PREVIEW = 390;
// a pointer moves this far before a press becomes a drag
const DRAG_START = 6;
// changes that get a toast with Undo (their announcement keys)
const TOASTED = new Set([
	"hidden",
	"tab",
	"joined_below",
	"joined_beside",
	"taken_out",
	"split",
	"reset",
]);

type How = "drag" | "menu" | "keys" | "button";
/** An edge that resizes: right (w), bottom (h), the corner (wh), left (l) */
type Edge = "w" | "h" | "wh" | "l";
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
	// the pointer itself, grid px
	pointer: { x: number; y: number };
	region: Region;
	snap: ISnap | null;
	// dropped on this item's title bar: a tab there
	tabTo: string | null;
	// whether it can join the tab that item shows, and where it would
	joinable: boolean;
	join: JoinSide | null;
	// over the Elements panel: a drop hides it
	hide: boolean;
}

/** A resize in progress */
export interface IEditorResize {
	id: string;
	kind: Edge;
	w: number;
	h: number;
	// px the left side moved out (left edge)
	shift: number;
	snap: ISnap | null;
	atMin: boolean;
	wMin: boolean;
	// the part beside it whose minimum stopped the edge
	by: string | null;
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
	/** A tab's name: its element, or "Material I/O & Material I/O totals" */
	const tabLabel = (
		it: Pick<GridItem, "els" | "join">,
		host: ElementId
	): string => {
		const partner = partnerOf(it, host);
		return partner
			? t("plan.layout.pair", { a: label(host), b: label(partner) })
			: label(host);
	};
	/** An item's name: its tab, or "Production + 7 tabs" */
	const title = (it: Pick<GridItem, "els" | "join">): string => {
		const tabs = tabsOf(it);
		return tabs.length > 1
			? t(
					"plan.layout.item_title",
					{ name: tabLabel(it, tabs[0]), n: tabs.length - 1 },
					tabs.length - 1
				)
			: tabLabel(it, tabs[0]);
	};
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
	let menuStays = false;
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
					onClick: () => undo(),
				},
				duration: 5000,
			});
		// a step from a row of the ⋯ menu keeps it open, and the focus in it
		if (!menuStays) {
			refMenu.value = null;
			focusHandle(focus);
		}
		return true;
	}

	let undos = 0;
	function undo(): void {
		const prev = history.value.at(-1);
		if (!prev) return;
		history.value = history.value.slice(0, -1);
		colsFrom = null;
		draft.value = prev;
		lastToast?.destroy();
		announce(t("plan.layout.announce.undone"));
		undos++;
	}

	/*
	 * What this round of customising changed, by how, sent once with save
	 * or cancel: one event per arrow press would say no more
	 */
	const tally = { drag: 0, menu: 0, keys: 0, button: 0, snapped: 0 };
	const count = (how: How, snapped: boolean = false) => {
		tally[how]++;
		if (snapped) tally.snapped++;
	};
	const summary = () => ({
		change_count: history.value.length,
		drag_count: tally.drag,
		menu_count: tally.menu,
		key_count: tally.keys,
		button_count: tally.button,
		snapped_count: tally.snapped,
		undo_count: undos,
	});

	/*
	 * The ops, as the menu, the keys and the drags use them: each on the
	 * item it names (one the menu or the keys come from), counted when it
	 * changed something
	 */
	type Op = (g: GridLayout, c: ops.ILayoutOpsContext) => ILayoutChange;
	function run(id: string, op: Op, how: How): void {
		if (apply(op(draft.value, ctx()), id)) count(how);
	}
	const moveX = (id: string, dx: number, how: How) =>
		run(id, (g, c) => ops.moveX(g, id, dx, c), how);
	const moveY = (id: string, dir: -1 | 1, how: How) =>
		run(id, (g, c) => ops.moveY(g, id, dir, c), how);
	const setWidth = (id: string, w: number, how: How) =>
		run(id, (g, c) => ops.setWidth(g, id, w, c), how);
	const fullWidth = (id: string) =>
		run(id, (g, c) => ops.fullWidth(g, id, c), "menu");
	const setHeightMode = (id: string, hm: HeightMode) =>
		run(id, (g, c) => ops.setHeightMode(g, id, hm, c), "menu");
	const stepHeight = (id: string, dir: -1 | 1, how: How) =>
		run(id, (g, c) => ops.stepHeight(g, id, dir, c), how);
	const togglePin = (id: string) =>
		run(id, (g, c) => ops.togglePin(g, id, c), "menu");
	const takeOut = (id: string, el: ElementId) =>
		run(id, (g, c) => ops.takeOut(g, id, el, c), "menu");
	const split = (id: string) =>
		run(id, (g, c) => ops.split(g, id, c), "menu");
	function hide(id: string, el: ElementId, how: How = "menu"): void {
		if (apply(ops.hide(draft.value, id, el, ctx()))) count(how);
	}
	/** What hiding an item hides: its tab on view (with the element shown with it); null when that stays */
	function hideTarget(it: GridItem): ElementId | null {
		return ops.hideTabBlocked(it, it.active) ? null : it.active;
	}
	/** The hide button on a title bar */
	function hideNow(id: string): void {
		const el = hideTarget(itemOf(id)!);
		if (el) hide(id, el, "button");
	}
	/** Over Elements: what a drop there hides, or why it can't */
	const hideDrop = computed(() => {
		const d = drag.value;
		if (!d?.hide) return null;
		// a whole item, or a tab (or an element shown with another) out of one
		const it = d.id ? itemOf(d.id) : undefined;
		const from = d.from ? itemOf(d.from) : undefined;
		const blocked = it
			? it.els.map((el) => ops.hideBlocked(el)).find(Boolean)
			: from
				? ops.hideTabBlocked(from, d.el)
				: ops.hideBlocked(d.el);
		const name = it
			? title(it)
			: from && !from.join?.[d.el]
				? tabLabel(from, d.el)
				: label(d.el);
		return blocked
			? { blocked: true, text: t(blocked) }
			: { blocked: false, text: t("plan.layout.drop_hide", { name }) };
	});
	function add(el: ElementId): void {
		if (apply(ops.add(draft.value, el, ctx()))) {
			count("menu");
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
			layout: presetLayout("standard"),
			announcement: { key: "plan.layout.announce.reset", params: {} },
		});
	}

	/** Shows an element: switches its tab, scrolls to it, highlights it */
	function show(el: ElementId): void {
		// the panel shows only placed elements
		const it = draft.value.items.find((i) => i.els.includes(el))!;
		if (it.active !== hostOf(it, el)) setTab(it.id, el);
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
		const name = title(it);
		const mc = minCols(it);
		const mh = minHeightOf(it);
		const room = ops.edgeRoom(g, id, "right", ctx());
		const hNow = it.hm === "fit" ? Math.round(p?.height ?? 0) : it.h;
		const capH = Math.max(
			mh,
			it.h || ops.snapHeight(Math.min(p?.content || 400, 480), mh)
		);
		// steps as rows of small buttons: the menu stays open for the next one
		const opts: PDropdownOption[] = [
			{
				type: "buttons",
				label: t("plan.layout.menu_width", { n: it.w, cols: g.cols }),
				buttons: [
					{
						key: "narrower",
						label: t("plan.layout.narrower"),
						icon: RemoveSharp,
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
						icon: AddSharp,
						disabled: it.x + it.w >= room.edge,
						hint:
							it.x + it.w >= g.cols
								? t("plan.layout.why.right_edge")
								: room.by && it.x + it.w >= room.edge
									? t("plan.layout.why.neighbour_min", {
											name: title(room.by),
										})
									: undefined,
					},
					{
						key: "full",
						label: t("plan.layout.full_width"),
						icon: SyncAltSharp,
						disabled: it.w === g.cols,
						hint:
							it.w === g.cols
								? t("plan.layout.why.full_width")
								: undefined,
					},
				],
			},
			{
				type: "buttons",
				label:
					it.hm === "fit"
						? t("plan.layout.menu_height_fit", { h: hNow })
						: t(`plan.layout.menu_height_${it.hm}`, { h: it.h }),
				buttons: [
					...(["fit", "cap", "fixed"] as const).map((hm) => ({
						key: `hm-${hm}`,
						label: t(`plan.layout.height_${hm}`, { h: capH }),
						text: t(`plan.layout.height_${hm}_short`, { h: capH }),
						checked: it.hm === hm,
					})),
					{
						key: "shorter",
						label: t("plan.layout.shorter"),
						icon: RemoveSharp,
						disabled: hNow <= mh,
						hint:
							hNow <= mh
								? t("plan.layout.why.min_height", {
										name,
										px: mh,
									})
								: undefined,
					},
					{
						key: "taller",
						label: t("plan.layout.taller"),
						icon: AddSharp,
					},
				],
			},
			{ type: "divider" },
			{
				key: "pin",
				label: t("plan.layout.keep_in_view"),
				tip: t("plan.layout.keep_in_view_hint"),
				checked: it.pin,
			},
			{
				key: "follow",
				label: t("plan.layout.follow"),
				tip: t("plan.layout.follow_hint"),
				checked: !!it.follow,
			},
			{ type: "divider" },
			// how the tab shown displays: cards or a table, everything open;
			// for each of its elements, named when it shows two
			...tabEls(it, it.active).flatMap((el, _, shownEls) =>
				TABLE_VIEW.includes(el) || OPENABLE.includes(el)
					? ([
							{
								type: "group",
								label:
									shownEls.length > 1
										? t("plan.layout.display_of", {
												name: label(el),
											})
										: t("plan.layout.display"),
							},
							...(TABLE_VIEW.includes(el)
								? (["cards", "table"] as const).map((v) => ({
										key: `view:${v}:${el}`,
										label: t(`plan.layout.view_${v}`),
										checked:
											!!g.table?.includes(el) ===
											(v === "table"),
									}))
								: []),
							...(OPENABLE.includes(el)
								? [
										{
											key: `open:${el}`,
											label: t(
												"plan.layout.content_open"
											),
											tip: t(
												"plan.layout.content_open_hint"
											),
											checked: !!g.open?.includes(el),
										},
									]
								: []),
							{ type: "divider" },
						] as PDropdownOption[])
					: []
			),
			{
				type: "buttons",
				label: t("plan.layout.move"),
				buttons: [
					{
						key: "left",
						label: t("plan.layout.left"),
						icon: ArrowBackSharp,
						disabled: it.x === 0,
						hint:
							it.x === 0
								? t("plan.layout.why.left_edge")
								: undefined,
					},
					{
						key: "up",
						label: t("plan.layout.up"),
						icon: ArrowUpwardSharp,
					},
					{
						key: "down",
						label: t("plan.layout.down"),
						icon: ArrowDownwardSharp,
					},
					{
						key: "right",
						label: t("plan.layout.right"),
						icon: ArrowForwardSharp,
						disabled: it.x + it.w >= g.cols,
						hint:
							it.x + it.w >= g.cols
								? t("plan.layout.why.right_edge")
								: undefined,
					},
				],
			},
			{ type: "divider" },
		];
		// tabs on a page of their own: a group's list, or every item to join
		if (refMenuPage.value === "tabs" && refMenu.value === id)
			return tabPage(it);
		const tabs = tabsOf(it);
		opts.push({
			key: "page:tabs",
			label:
				tabs.length > 1
					? t("plan.layout.tabs_more", { n: tabs.length })
					: t("plan.layout.make_tab_more"),
		});
		opts.push({ type: "divider" });
		const blocked = ops.hideTabBlocked(it, it.active);
		opts.push({
			key: "hide",
			label:
				tabs.length > 1
					? t("plan.layout.hide_tab", {
							name: tabLabel(it, it.active),
						})
					: t("plan.layout.hide"),
			disabled: !!blocked,
			hint: blocked ? t(blocked) : undefined,
		});
		return opts;
	}

	/**
	 * The ⋯ menu's row sizing a tab's two: less or more room for the first
	 * part (a column beside, 40 px below) and Auto; none while a pair set
	 * beside is stacked for want of width
	 */
	function splitRow(it: GridItem, el: ElementId): PDropdownOption | null {
		const host = hostOf(it, el);
		const name = label(host);
		const set = it.joinSize?.[el];
		const auto = {
			key: "share:auto",
			label: t("plan.layout.share.auto", { name, el: label(el) }),
			text: t("plan.layout.share.auto_text"),
			checked: set === undefined,
		};
		const step = (dir: "-" | "+", disabled: boolean) => ({
			key: `share:${dir}`,
			label: t(`plan.layout.share.${dir === "-" ? "less" : "more"}`, {
				name,
			}),
			icon: dir === "-" ? RemoveSharp : AddSharp,
			disabled,
		});
		if (it.join?.[el] === "beside") {
			const s = besideNow(it, el);
			if (!s?.range || s.cols === null) return null;
			const cols = env.grid()!.pack.items[it.id].w;
			return {
				type: "buttons",
				label: t("plan.layout.share.cols", { name, n: s.cols, cols }),
				buttons: [
					step("-", s.cols <= s.range[0]),
					step("+", s.cols >= s.range[1]),
					auto,
				],
			};
		}
		const min = Math.max(H_MIN, ELEMENTS[host].minH);
		return {
			type: "buttons",
			label:
				set === undefined
					? t("plan.layout.share.fit", { name })
					: t("plan.layout.share.height", { name, h: set }),
			buttons: [
				step("-", set !== undefined && set <= min),
				step("+", set !== undefined && set >= H_MAX),
				auto,
			],
		};
	}

	/**
	 * The ⋯ menu's tabs page: Back; the element shown with the tab on view
	 * (below or beside, out); the tabs to take out and split; for an item
	 * of one tab, every other item to join: as a tab, below or beside
	 */
	function tabPage(it: GridItem): PDropdownOption[] {
		const g = draft.value;
		const tabs = tabsOf(it);
		const opts: PDropdownOption[] = [
			{ key: "page:main", label: t("plan.layout.menu_back") },
			{ type: "divider" },
		];
		const partner = partnerOf(it, it.active);
		if (partner) {
			opts.push({
				type: "buttons",
				label: t("plan.layout.with", {
					el: label(partner),
					name: label(it.active),
				}),
				buttons: (["below", "beside"] as const).map((side) => ({
					key: `side:${side}`,
					label: t(`plan.layout.join_${side}`, {
						name: label(it.active),
					}),
					text: t(`plan.layout.zone.${side}`),
					checked: it.join?.[partner] === side,
				})),
			});
			const size = splitRow(it, partner);
			if (size) opts.push(size);
			opts.push({
				key: `out:${partner}`,
				label: t("plan.layout.take_out", { name: label(partner) }),
			});
			opts.push({ type: "divider" });
		}
		if (tabs.length > 1) {
			opts.push({ type: "group", label: t("plan.layout.tabs") });
			for (const el of tabs)
				opts.push({
					key: `out:${el}`,
					label: t("plan.layout.take_out", {
						name: tabLabel(it, el),
					}),
					disabled: el === it.els[0],
					hint:
						el === it.els[0]
							? t("plan.layout.why.first_tab")
							: undefined,
				});
			opts.push({ key: "split", label: t("plan.layout.split") });
			return opts;
		}
		// the menu's way to what dragging onto a title bar does: a tab of
		// another item, or with the tab it shows, below or beside it
		opts.push({ type: "group", label: t("plan.layout.make_tab") });
		for (const o of g.items.filter((o) => o !== it)) {
			const why = ops.joinBlocked(g, it.els, o.id);
			opts.push({
				type: "buttons",
				label: title(o),
				buttons: [
					{
						key: `tab:${o.id}`,
						label: t("plan.layout.drop_as_tab", {
							name: title(it),
						}),
						text: t("plan.layout.zone.tab"),
					},
					...(["below", "beside"] as const).map((side) => ({
						key: `${side}:${o.id}`,
						label: t(`plan.layout.join_${side}`, {
							name: label(o.active),
						}),
						text: t(`plan.layout.zone.${side}`),
						disabled: !!why,
						hint: why
							? t(why, { name: tabLabel(o, o.active) })
							: undefined,
					})),
				],
			});
		}
		return opts;
	}

	// the ⋯ menu's rows of buttons: steps, after which the menu stays open
	const MENU_STEPS = new Set([
		"narrower",
		"wider",
		"full",
		"hm-fit",
		"hm-cap",
		"hm-fixed",
		"shorter",
		"taller",
		"left",
		"up",
		"down",
		"right",
		"share:-",
		"share:+",
	]);
	function onMenu(id: string, key: string): void {
		menuStays = MENU_STEPS.has(key);
		try {
			menuChange(id, key);
		} finally {
			menuStays = false;
		}
	}

	function menuChange(id: string, key: string): void {
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
		else if (key.startsWith("open:")) toggleOpen(key.slice(5) as ElementId);
		else if (key.startsWith("view:")) {
			const [, view, el] = key.split(":");
			apply(
				ops.setView(
					draft.value,
					el as ElementId,
					view as "cards" | "table",
					ctx()
				),
				id
			);
		} else if (key === "up") moveY(id, -1, "menu");
		else if (key === "down") moveY(id, 1, "menu");
		else if (key === "left") moveX(id, -1, "menu");
		else if (key === "right") moveX(id, 1, "menu");
		else if (key.startsWith("out:")) takeOut(id, key.slice(4) as ElementId);
		else if (key === "split") split(id);
		else if (key.startsWith("tab:")) {
			const to = key.slice(4);
			if (apply(ops.makeTab(draft.value, { item: id }, to, ctx()), to))
				count("menu");
		} else if (key.startsWith("below:") || key.startsWith("beside:")) {
			const [side, to] = key.split(":") as [JoinSide, string];
			if (
				apply(
					ops.joinTab(draft.value, { item: id }, to, side, ctx()),
					to
				)
			)
				count("menu");
		} else if (key.startsWith("share:")) {
			const partner = partnerOf(it, it.active);
			if (partner) stepSplit(id, partner, key.slice(6));
		} else if (key.startsWith("side:")) {
			const partner = partnerOf(it, it.active);
			if (partner)
				apply(
					ops.setSide(
						draft.value,
						id,
						partner,
						key.slice(5) as JoinSide,
						ctx()
					),
					id
				);
		} else if (key === "hide") hide(id, it.active);
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
		kind: Edge;
		x: number;
		y: number;
		w0: number;
		h0: number;
		x0: number;
		minW: number;
		minH: number;
		// the widest it gets before a part beside it is at its minimum
		maxW: number;
		by: string | null;
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
		if (sp) draft.value = sp.before;
		sp = null;
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

	/** Press on an item's edge or corner */
	function startResize(e: PointerEvent, id: string, kind: Edge): void {
		if (phone.value || e.button !== 0) return;
		const p = grid().pack.items[id];
		const it = itemOf(id)!;
		e.stopPropagation();
		e.preventDefault();
		const side = kind === "l" ? "left" : "right";
		const room = ops.edgeRoom(draft.value, id, side, ctx());
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
			maxW: Math.max(
				p.w,
				side === "right" ? room.edge - it.x : it.x + it.w - room.edge
			),
			by: room.by ? title(room.by) : null,
		};
		resize.value = {
			id,
			kind,
			w: p.w,
			h: p.height,
			shift: 0,
			snap: null,
			atMin: false,
			wMin: false,
			by: null,
		};
		refMenu.value = null;
		listen();
	}

	/*
	 * The line between a tab's two parts, dragged: beside, the first
	 * part's columns (held to where both keep their minimums); below, its
	 * height in 8 px steps. The parts follow as it moves; Esc puts it back.
	 */
	let sp: {
		id: string;
		el: ElementId;
		side: JoinSide;
		before: GridLayout;
		x: number;
		y: number;
		// the first part's width (beside) or height (below) when pressed
		px0: number;
		value: number | null;
	} | null = null;

	/** The first part of a tab's two as drawn, in grid px */
	function hostBox(id: string, host: ElementId): DOMRect | undefined {
		return env
			.root()
			?.querySelector<HTMLElement>(
				`[data-item="${id}"] [data-element="${host}"]`
			)
			?.getBoundingClientRect();
	}

	/** Press on the line between a tab's two parts, `el` the second */
	function startSplit(id: string, el: ElementId, e: PointerEvent): void {
		const it = itemOf(id);
		const side = it?.join?.[el];
		if (phone.value || e.button !== 0 || !it || !side) return;
		e.stopPropagation();
		e.preventDefault();
		const box = hostBox(id, hostOf(it, el));
		sp = {
			id,
			el,
			side,
			before: draft.value,
			x: e.clientX,
			y: e.clientY,
			px0:
				(side === "beside" ? (box?.width ?? 0) : (box?.height ?? 0)) /
				env.zoom(),
			value: null,
		};
		refMenu.value = null;
		listen();
	}

	function splitMove(e: PointerEvent): void {
		const s = sp!;
		const z = env.zoom();
		const it = s.before.items.find((i) => i.id === s.id)!;
		const host = hostOf(it, s.el);
		let value: number | null;
		if (s.side === "beside") {
			const p = grid().pack.items[s.id];
			const gap = s.before.gap;
			const col = (p.width - (p.w - 1) * gap) / p.w;
			const px = s.px0 + (e.clientX - s.x) / z;
			value =
				besideSplit(
					p.width,
					p.w,
					gap,
					Math.round((px + gap / 2) / (col + gap)),
					ELEMENTS[host].minW,
					ELEMENTS[s.el].minW
				)?.cols ?? null;
		} else
			value = ops.snapHeight(
				s.px0 + (e.clientY - s.y) / z,
				Math.max(H_MIN, ELEMENTS[host].minH)
			);
		if (value === null || value === s.value) return;
		s.value = value;
		draft.value = ops.setJoinSize(
			s.before,
			s.id,
			s.el,
			value,
			ctx()
		).layout;
	}

	function splitUp(): void {
		const s = sp!;
		sp = null;
		draft.value = s.before;
		if (s.value === null) return;
		if (apply(ops.setJoinSize(s.before, s.id, s.el, s.value, ctx()), s.id))
			count("drag");
	}

	/** A step of the ⋯ menu's split row: less or more room for the first, or auto */
	function stepSplit(id: string, el: ElementId, step: string): void {
		const it = itemOf(id)!;
		const host = hostOf(it, el);
		let value: number | null = null;
		if (step !== "auto") {
			const dir = step === "+" ? 1 : -1;
			if (it.join?.[el] === "beside") {
				const s = besideNow(it, el);
				if (!s?.cols) return;
				value = s.cols + dir;
			} else {
				const now =
					it.joinSize?.[el] ??
					Math.round((hostBox(id, host)?.height ?? 0) / env.zoom()) ??
					0;
				value = ops.snapHeight(
					Math.max(now, ELEMENTS[host].minH) + dir * H_STEP,
					Math.max(H_MIN, ELEMENTS[host].minH)
				);
			}
		}
		if (apply(ops.setJoinSize(draft.value, id, el, value, ctx()), id))
			count("menu");
	}

	/** Where a tab's two beside each other split now, as the page draws it */
	function besideNow(it: GridItem, el: ElementId) {
		const p = env.grid()?.pack.items[it.id];
		if (!p) return null;
		return besideSplit(
			p.width,
			p.w,
			draft.value.gap,
			it.joinSize?.[el],
			ELEMENTS[hostOf(it, el)].minW,
			ELEMENTS[el].minW
		);
	}

	function onPointerMove(e: PointerEvent): void {
		if (sp) return splitMove(e);
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
		let region: Region = drag.value?.region ?? (cur?.pin ? "band" : "page");
		let tabTo: string | null = null;
		const hit = document.elementFromPoint?.(e.clientX, e.clientY) ?? null;
		// a part of the page dropped on Elements is hidden
		const hide =
			!!(press0.id || press0.from) &&
			!!hit?.closest?.("[data-elements-panel]");
		const rg = hit?.closest?.("[data-region]")?.getAttribute("data-region");
		if (rg === "band" || rg === "page") region = rg;
		const headEl = hit?.closest?.<HTMLElement>("[data-item-head]");
		const head = headEl?.getAttribute("data-item-head");
		if (
			head &&
			head !== press0.id &&
			head !== press0.from &&
			(!cur || tabsOf(cur).length === 1)
		)
			tabTo = head;
		const q = gridPoint(e, region);
		const g = draft.value;
		// on a title bar: its left third makes a tab, the middle puts it
		// below the tab shown there, the right beside it, where it can join
		const from = press0.from ? itemOf(press0.from) : undefined;
		const els = cur
			? cur.els
			: from && !from.join?.[press0.el]
				? tabEls(from, press0.el)
				: [press0.el];
		const joinable = !!tabTo && !ops.joinBlocked(g, els, tabTo);
		let join: JoinSide | null = null;
		const r = joinable ? headEl?.getBoundingClientRect() : undefined;
		if (r?.width) {
			const f = (e.clientX - r.left) / r.width;
			join = f < 1 / 3 ? null : f < 2 / 3 ? "below" : "beside";
		}
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
			pointer: { x: q.x, y: q.y },
			region,
			snap,
			tabTo: hide ? null : tabTo,
			joinable: !hide && joinable,
			join: hide ? null : join,
			hide,
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
		const want =
			r.kind === "h"
				? r.w0
				: r.w0 + Math.round((r.kind === "l" ? -dx : dx) / step);
		const w = Math.max(r.minW, Math.min(r.maxW, want));
		let h = r.h0;
		let snap: ISnap | null = null;
		let atMin = false;
		if (r.kind === "h" || r.kind === "wh") {
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
			shift: r.kind === "l" ? (w - r.w0) * step : 0,
			snap,
			atMin: atMin && !snap,
			wMin: r.kind !== "h" && w === r.minW,
			by: want > w && w === r.maxW ? r.by : null,
		};
	}

	/** The text of a snap, for the badge, the line and the toast */
	function snapText(s: ISnap): string {
		const ref = s.ref ? itemOf(s.ref) : undefined;
		const name = ref ? title(ref) : "";
		if (s.kind === "content") return t("plan.layout.snap.content");
		if (s.kind === "bottom") return t("plan.layout.snap.bottom", { name });
		if (s.kind === "height")
			return t("plan.layout.snap.height", { name, h: s.value });
		return t("plan.layout.snap.top", { name });
	}

	function onPointerUp(): void {
		stopListening();
		if (sp) return splitUp();
		if (rs) return resizeUp();
		const p = press;
		const d = drag.value;
		press = null;
		drag.value = null;
		if (!p?.started || !d) return;
		const g = draft.value;
		if (d.hide) {
			const change = d.id
				? ops.hideItem(g, d.id, ctx())
				: ops.hide(g, d.from!, d.el, ctx());
			if (apply(change)) count("drag");
			return;
		}
		if (d.tabTo) {
			const src = d.id ? { item: d.id } : { el: d.el };
			const change = d.from
				? ops.takeOutTo(
						g,
						d.from,
						d.el,
						{ tab: d.tabTo, ...(d.join && { side: d.join }) },
						ctx()
					)
				: d.join
					? ops.joinTab(g, src, d.tabTo, d.join, ctx())
					: ops.makeTab(g, src, d.tabTo, ctx());
			if (apply(change, d.tabTo)) count("drag");
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
			count("drag");
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
		// a resize snaps to bottoms, heights and content, never to tops
		const snapped = (z.snap?.kind ?? null) as SnapKind | null;
		// the width only when it was dragged: the packed one may be "auto"
		const it = itemOf(r.id)!;
		const widened =
			z.w === r.w0
				? null
				: r.kind === "l"
					? ops.setLeft(draft.value, r.id, it.x + it.w - z.w, ctx())
					: ops.setWidth(draft.value, r.id, z.w, ctx());
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
			count("drag", !!snapped && z.h !== r.h0);
		}
	}

	function onPointerCancel(): void {
		stopListening();
		press = null;
		rs = null;
		if (sp) draft.value = sp.before;
		sp = null;
		drag.value = null;
		resize.value = null;
	}

	/** Where a dragged item would land, as the packing puts it */
	const landing = computed(() => {
		const d = drag.value;
		if (!d || d.tabTo || d.hide) return null;
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
		const hidden = ELEMENT_IDS.filter(
			(e) => !g.items.some((i) => i.els.includes(e))
		);
		trackEvent("plan:layout_save", {
			item_count: g.items.length,
			tab_group_count: g.items.filter((i) => tabsOf(i).length > 1).length,
			joined_count: g.items.filter((i) => i.join).length,
			joined_sized_count: g.items.filter((i) => i.joinSize).length,
			kept_in_view_count: g.items.filter((i) => i.pin).length,
			hidden_count: hidden.length,
			hidden_elements: hidden,
			column_count: g.cols,
			gap_px: g.gap,
			is_replacing: replaced,
			store: "session",
			...summary(),
		});
		lastToast?.destroy();
		toast(t("plan.layout.saved"));
		env.close();
	}

	function cancel(): void {
		trackEvent("plan:layout_cancel", summary());
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
		const side = it.join?.[el];
		if (side)
			return t(`plan.layout.where.${side}`, {
				name: label(hostOf(it, el)),
			});
		if (it.els[0] !== el)
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
		tabLabel,
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
		startSplit,
		hideNow,
		hideTarget,
		hideDrop,
		snapText,
		save,
		requestCancel,
	};
}
