import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { type DOMWrapper, flushPromises } from "@vue/test-utils";
import { h, ref } from "vue";
import axe from "axe-core";

import PlanLayoutEditor from "@/features/planning/components/layout/PlanLayoutEditor.vue";
import PDropdown from "@/ui/components/PDropdown.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	planViewContext,
	provideContext,
} from "@/tests/features/planning/components/elements/planViewContext.fixtures";
import { usePlanLayoutPreference } from "@/features/planning/layout/usePlanLayoutPreference";
import { presetLayout } from "@/features/planning/layout/presets";
import { wideLayout } from "@/tests/features/planning/layout/layout.fixtures";
import { cloneLayout } from "@/features/planning/layout/normaliseLayout";
import { ELEMENT_IDS, ELEMENTS } from "@/features/planning/layout/elements";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import plan from "@/locales/en_US/plan.json";
import common from "@/locales/en_US/common.json";

// Types & Interfaces
import type { LayoutStore } from "@/features/planning/layout/layoutStore";
import type { StoredLayout } from "@/features/planning/layout/planLayout.schemas";
import type { GridLayout } from "@/features/planning/layout/planLayout.types";
import type { PDropdownButton, PDropdownOption } from "@/ui/ui.types";

vi.mock("@/features/planning/layout/elementComponents", () => ({
	elementView: (id: string) => ({
		component: { name: `El-${id}`, render: () => h("p", id) },
		props: {},
	}),
}));
const mocks = vi.hoisted(() => ({ toast: vi.fn(), confirm: vi.fn() }));
vi.mock("@/ui/useToast", () => ({
	useToast: () => mocks.toast,
	toast: mocks.toast,
}));
vi.mock("@/ui/useConfirm", () => ({ useConfirm: () => mocks.confirm }));
vi.mock("@/lib/analytics/useAnalytics", async (original) => ({
	...(await original<typeof import("@/lib/analytics/useAnalytics")>()),
	trackEvent: vi.fn(),
}));

// the page is 1440 px wide; the stage beside the Elements panel too,
// unless a test narrows it
let stageWidth = 1440;
let pageWidth = 1440;
beforeEach(() => {
	stageWidth = 1440;
	pageWidth = 1440;
	mocks.toast.mockReturnValue({ destroy: vi.fn() });
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
		function (this: HTMLElement) {
			return this.hasAttribute("data-layout-editor")
				? pageWidth
				: stageWidth;
		}
	);
});

const none = { wide: [], phone: [] };

const memoryStore = (initial: StoredLayout | null = null): LayoutStore => {
	let value = initial;
	return { load: () => value, save: (v) => (value = v) };
};

async function mountEditor(
	o: {
		stored?: StoredLayout | null;
		store?: LayoutStore;
		loggedIn?: boolean;
	} = {}
) {
	const pref = usePlanLayoutPreference(
		o.store ?? memoryStore(o.stored ?? null)
	);
	const mounted = await mountComponent(
		PlanLayoutEditor,
		{ pref, loggedIn: o.loggedIn ?? true },
		{
			messages: { plan, common },
			attach: true,
			setup: provideContext(planViewContext()),
		}
	);
	await flushPromises();
	return { ...mounted, pref };
}
type Mounted = Awaited<ReturnType<typeof mountEditor>>;

const handle = (m: Mounted, id: string) =>
	m.wrapper.find(`[data-handle="i-${id}"]`);
const size = (m: Mounted, id: string) =>
	m.wrapper.find(`[data-item="i-${id}"] [data-size]`).text();
const announce = (m: Mounted) => m.wrapper.find("[data-announce]").text();
const draft = (m: Mounted, id: string) =>
	(
		m.wrapper
			.findComponent({ name: "PlanGrid" })
			.props("layout") as GridLayout
	).items.find((i) => i.id === `i-${id}`)!;
const key = async (m: Mounted, id: string, k: string, shift = false) => {
	await handle(m, id).trigger("keydown", { key: k, shiftKey: shift });
	await flushPromises();
};
const menuOf = (m: Mounted, id: string) =>
	m.wrapper.find(`[data-item="i-${id}"]`).findComponent(PDropdown);
/** An item of an item's ⋯ menu, or a button of one of its rows, by key */
const option = (m: Mounted, id: string, k: string) =>
	(menuOf(m, id).props("options") as PDropdownOption[])
		.flatMap<PDropdownOption | PDropdownButton>((o) =>
			"buttons" in o ? o.buttons : [o]
		)
		.find((o) => "key" in o && o.key === k);
const pick = async (m: Mounted, id: string, k: string) => {
	menuOf(m, id).vm.$emit("select", k);
	await flushPromises();
};
const button = (m: Mounted, selector: string) => m.wrapper.find(selector);
/** Saves and returns what plan:layout_save sent */
async function savedCounts(m: Mounted) {
	await button(m, "[data-save]").trigger("click");
	return vi
		.mocked(trackEvent)
		.mock.calls.findLast(([e]) => e === "plan:layout_save")?.[1];
}

/** A pointer press: VTU can't set clientX on the events it makes */
async function pointerdown(
	el: DOMWrapper<Element>,
	clientX: number,
	clientY: number,
	button = 0
) {
	el.element.dispatchEvent(
		new MouseEvent("pointerdown", {
			clientX,
			clientY,
			button,
			bubbles: true,
		})
	);
	await flushPromises();
}

/** A pointer press on `el`, moved by dx/dy, released */
async function dragBy(
	el: DOMWrapper<Element>,
	dx: number,
	dy: number,
	o: { alt?: boolean; target?: Element | null } = {}
) {
	hitAt(
		"target" in o
			? (o.target ?? null)
			: document.querySelector("[data-region='page']")
	);
	await pointerdown(el, 100, 100, 0);
	const move = (x: number, y: number) =>
		window.dispatchEvent(
			new MouseEvent("pointermove", {
				clientX: x,
				clientY: y,
				altKey: !!o.alt,
			})
		);
	move(100 + dx / 2, 100 + dy / 2);
	move(100 + dx, 100 + dy);
	await flushPromises();
	window.dispatchEvent(new MouseEvent("pointerup"));
	await flushPromises();
}

/** What sits under the pointer: jsdom has no elementFromPoint */
function hitAt(el: Element | null): void {
	Object.defineProperty(document, "elementFromPoint", {
		value: () => el,
		configurable: true,
	});
}

// one step of the 12-column grid at 1440 px: (1440 + 16) / 12
const STEP = (1440 + 16) / 12;

describe("PlanLayoutEditor", () => {
	it("shows the bar: name, where it started, Wide and Phone", async () => {
		const m = await mountEditor();
		const bar = m.wrapper.find("[data-editor-bar]");
		expect(bar.text()).toContain("Custom Layout");
		expect(bar.text()).toContain("starting from Standard");
		expect(bar.find("[data-zoom]").exists()).toBe(false);
		expect(
			bar
				.findComponent({ name: "PSegmented" })
				.props("options")
				.map((o: { label: string }) => o.label)
		).toEqual(["Wide", "Phone"]);
		expect(button(m, "[data-undo]").attributes("disabled")).toBeDefined();
	});

	it("scales a page wider than the room beside the panel", async () => {
		stageWidth = 1152;
		const m = await mountEditor();
		expect(m.wrapper.find("[data-zoom]").text()).toBe("Shown at 80 %");
		expect(
			m.wrapper.findComponent({ name: "PlanGrid" }).props("width")
		).toBe(1440);
	});

	it("measures the page once where there is no ResizeObserver", async () => {
		vi.stubGlobal("ResizeObserver", undefined);
		stageWidth = 1152;
		const m = await mountEditor();
		expect(m.wrapper.find("[data-zoom]").text()).toBe("Shown at 80 %");
	});

	describe("keyboard on a handle", () => {
		it("moves with arrows, announces it and keeps the focus", async () => {
			const m = await mountEditor();
			expect(draft(m, "material-io").x).toBe(9);
			await key(m, "material-io", "ArrowLeft");
			expect(draft(m, "material-io").x).toBe(8);
			expect(announce(m)).toBe("Material I/O: column 9");
			// a move shows on the grid: no toast
			expect(mocks.toast).not.toHaveBeenCalled();
			expect(document.activeElement).toBe(
				handle(m, "material-io").element
			);

			await key(m, "planet", "ArrowUp");
			expect(announce(m)).toBe("Planet moved up");
			await key(m, "planet", "ArrowDown");
			expect(announce(m)).toBe("Planet moved down");
		});

		it("resizes with Shift+arrows, stopping at the minimum", async () => {
			const m = await mountEditor();
			await key(m, "empire", "ArrowRight", true);
			expect(draft(m, "empire").w).toBe(3);
			expect(size(m, "empire")).toBe("3/12");
			// 190 px at 1440: 2 columns
			await key(m, "empire", "ArrowLeft", true);
			await key(m, "empire", "ArrowLeft", true);
			expect(draft(m, "empire").w).toBe(2);
			expect(announce(m)).toBe(
				"Empire & prices: 2 of 12 columns wide (its minimum at this width)"
			);

			// unmeasured 180 px, +40 snaps to 224, taller than the content: fixed
			await key(m, "empire", "ArrowDown", true);
			expect(draft(m, "empire")).toMatchObject({ hm: "fixed", h: 224 });
			expect(size(m, "empire")).toBe("2/12 · 224 px");
			await key(m, "empire", "ArrowUp", true);
			expect(draft(m, "empire").h).toBe(184);
			expect(await savedCounts(m)).toMatchObject({ key_count: 5 });
		});

		it("opens the menu with Enter or Space, ignores other keys", async () => {
			const m = await mountEditor();
			await key(m, "planet", "Enter");
			expect(menuOf(m, "planet").props("show")).toBe(true);
			await key(m, "experts", " ");
			expect(menuOf(m, "experts").props("show")).toBe(true);
			expect(menuOf(m, "planet").props("show")).toBe(false);
			const before = draft(m, "planet");
			await key(m, "planet", "a");
			expect(draft(m, "planet")).toEqual(before);
		});

		it("undoes with Ctrl/Cmd+Z through the exposed undo", async () => {
			const m = await mountEditor();
			await key(m, "material-io", "ArrowLeft");
			(m.component.vm as unknown as { undo: (h: string) => void }).undo(
				"keys"
			);
			await flushPromises();
			expect(draft(m, "material-io").x).toBe(9);
			expect(announce(m)).toBe("Undone");
			expect(await savedCounts(m)).toMatchObject({ undo_count: 1 });
		});

		it("says nothing when there is nothing to undo", async () => {
			const m = await mountEditor();
			(m.component.vm as unknown as { undo: () => void }).undo();
			await flushPromises();
			expect(announce(m)).toBe("");
			expect(await savedCounts(m)).toMatchObject({ undo_count: 0 });
		});
	});

	describe("the ⋯ menu", () => {
		it("stays open after a step from its rows, closes after an item", async () => {
			const m = await mountEditor();
			menuOf(m, "experts").vm.$emit("update:show", true);
			await flushPromises();
			await pick(m, "experts", "hm-cap");
			expect(draft(m, "experts").hm).toBe("cap");
			// a step changes the limit of "at most", the mode stays
			await pick(m, "experts", "taller");
			expect(draft(m, "experts").hm).toBe("cap");
			expect(menuOf(m, "experts").props("show")).toBe(true);
			// the steps are rows of buttons, not a line each
			const rows = (
				menuOf(m, "experts").props("options") as PDropdownOption[]
			).filter((o) => "type" in o && o.type === "buttons");
			expect(rows.map((r) => "label" in r && r.label)).toEqual([
				"Width · 2 of 12 columns",
				expect.stringContaining("Height · at most"),
				"Move",
			]);

			await pick(m, "experts", "pin");
			expect(menuOf(m, "experts").props("show")).toBe(false);
		});

		it("says why an item can't be made narrower, wider or moved", async () => {
			const m = await mountEditor();
			const byKey = (k: string) => option(m, "production", k);
			// 540 px at 1440: 5 of 12 columns; it has 7
			expect(byKey("narrower")).toMatchObject({
				disabled: false,
				hint: undefined,
			});
			expect(byKey("hide")).toMatchObject({
				disabled: true,
				hint: "Production always stays on the page",
			});
			expect(byKey("hm-fit")).toMatchObject({ checked: true });
			expect(byKey("pin")).toMatchObject({ checked: false });
			// tabs are a page of their own, opened from one entry
			expect(byKey("page:tabs")).toMatchObject({ label: "Tabs (8) …" });
			expect(byKey("out:supply-cart")).toBeUndefined();
			await pick(m, "production", "page:tabs");
			expect(menuOf(m, "production").props("show")).toBe(true);
			expect(byKey("page:main")).toMatchObject({ label: "Back" });
			expect(byKey("narrower")).toBeUndefined();
			expect(byKey("out:production")).toMatchObject({
				disabled: true,
				hint: "The first tab stays; take the others out",
			});
			await pick(m, "production", "page:main");
			expect(byKey("narrower")).toBeDefined();

			const ioKey = (k: string) => option(m, "material-io", k);
			expect(ioKey("wider")).toMatchObject({
				disabled: true,
				hint: "Reaches the right edge; move it left first",
			});
			expect(ioKey("right")).toMatchObject({ disabled: true });
			// the menu's way to make a tab: each other item, on its page
			expect(ioKey("page:tabs")).toMatchObject({
				label: "Tab, below or beside …",
			});
			await pick(m, "material-io", "page:tabs");
			// a row per other item: a tab of it, below or beside the tab it shows
			expect(
				(
					menuOf(m, "material-io").props(
						"options"
					) as PDropdownOption[]
				).find(
					(o) => "buttons" in o && o.label === "Production + 7 tabs"
				)
			).toBeDefined();
			expect(ioKey("tab:i-production")).toMatchObject({ text: "Tab" });
			expect(ioKey("below:i-production")).toMatchObject({
				text: "Below",
				label: "Below Production",
				disabled: false,
			});
			expect(ioKey("tab:i-material-io")).toBeUndefined();
			// a menu opens on its first page again
			menuOf(m, "material-io").vm.$emit("update:show", false);
			await flushPromises();
			expect(ioKey("tab:i-production")).toBeUndefined();

			const eKey = (k: string) => option(m, "empire", k);
			expect(eKey("narrower")).toMatchObject({
				disabled: true,
				hint: "Empire & prices needs at least 190 px: 2 of 12 columns at this width",
			});
			expect(eKey("left")).toMatchObject({
				disabled: true,
				hint: "Already at the left edge",
			});
		});

		it("does every change it lists", async () => {
			const m = await mountEditor();
			const steps: [string, string, (m: Mounted) => unknown, unknown][] =
				[
					["empire", "wider", (m) => draft(m, "empire").w, 3],
					["empire", "narrower", (m) => draft(m, "empire").w, 2],
					["empire", "full", (m) => draft(m, "empire").w, 12],
					["planet", "hm-cap", (m) => draft(m, "planet").hm, "cap"],
					[
						"planet",
						"hm-fixed",
						(m) => draft(m, "planet").hm,
						"fixed",
					],
					["planet", "taller", (m) => draft(m, "planet").h, 224],
					["planet", "shorter", (m) => draft(m, "planet").h, 184],
					["planet", "hm-fit", (m) => draft(m, "planet").hm, "fit"],
					["planet", "pin", (m) => draft(m, "planet").pin, true],
					[
						"material-io",
						"left",
						(m) => draft(m, "material-io").x,
						8,
					],
					[
						"material-io",
						"right",
						(m) => draft(m, "material-io").x,
						9,
					],
					[
						"housing",
						"up",
						(m) => announce(m),
						"Infrastructure moved up",
					],
					[
						"housing",
						"down",
						(m) => announce(m),
						"Infrastructure moved down",
					],
					[
						"production",
						"out:supply-cart",
						(m) => draft(m, "supply-cart").els,
						["supply-cart"],
					],
					[
						"production",
						"split",
						(m) => draft(m, "production").els,
						["production"],
					],
					[
						"experts",
						"hide",
						(m) => announce(m),
						"Experts hidden. It stays in Elements.",
					],
				];
			for (const [id, k, read, expected] of steps) {
				await pick(m, id, k);
				expect(read(m), `${id} ${k}`).toEqual(expected);
			}
			expect(m.wrapper.find("[data-item='i-experts']").exists()).toBe(
				false
			);
		});

		it("makes a tab from the menu, the same as dropping on a title bar", async () => {
			const m = await mountEditor();
			await pick(m, "material-io", "tab:i-production");
			expect(draft(m, "production").els.at(-1)).toBe("material-io");
			expect(announce(m)).toBe("Material I/O is now a tab of Production");
			expect(await savedCounts(m)).toMatchObject({ menu_count: 1 });
		});

		it("hides with one click on a title bar, the shown tab of a group", async () => {
			const m = await mountEditor();
			const hideBtn = (id: string) =>
				m.wrapper.find(`[data-item="i-${id}"] [data-item-hide]`);
			// Production always stays
			expect(hideBtn("production").exists()).toBe(false);
			expect(hideBtn("experts").attributes("aria-label")).toBe(
				"Hide Experts"
			);
			await hideBtn("experts").trigger("click");
			await flushPromises();
			expect(draft(m, "experts")).toBeUndefined();
			expect(announce(m)).toBe("Experts hidden. It stays in Elements.");
			m.wrapper
				.findComponent({ name: "PlanGrid" })
				.vm.$emit("tab", "i-production", "popr");
			await flushPromises();
			await hideBtn("production").trigger("click");
			await flushPromises();
			expect(draft(m, "production").els).not.toContain("popr");
		});

		it("hides the shown tab of a group", async () => {
			const m = await mountEditor();
			expect(option(m, "production", "hide")).toMatchObject({
				label: "Hide Production",
			});
			m.wrapper
				.findComponent({ name: "PlanGrid" })
				.vm.$emit("tab", "i-production", "popr");
			await flushPromises();
			await pick(m, "production", "hide");
			expect(draft(m, "production").els).not.toContain("popr");
		});

		it("changes nothing for a step it can't take", async () => {
			const m = await mountEditor();
			const layout = () =>
				m.wrapper
					.findComponent({ name: "PlanGrid" })
					.props("layout") as GridLayout;
			// Workforce shows two parts: Experts beside it
			await pick(m, "experts", "page:tabs");
			await pick(m, "experts", "beside:i-workforce");
			const before = cloneLayout(layout());
			const said = announce(m);
			for (const [id, k] of [
				// Production always stays
				["production", "hide"],
				// a group of 8 tabs makes no tab of another
				["production", "tab:i-planet"],
				["planet", "below:i-workforce"],
				// nothing is shown with Planet
				["planet", "share:+"],
				["planet", "side:beside"],
				// already at the left edge
				["empire", "left"],
				// a key the menu doesn't know
				["planet", "nonsense"],
			])
				await pick(m, id, k);
			expect(cloneLayout(layout())).toEqual(before);
			expect(announce(m)).toBe(said);
			expect(await savedCounts(m)).toMatchObject({
				change_count: 1,
				menu_count: 1,
			});
		});
	});

	describe("pointer", () => {
		beforeEach(() => {
			vi.spyOn(
				Element.prototype,
				"getBoundingClientRect"
			).mockReturnValue({
				left: 0,
				top: 0,
				right: 1440,
				bottom: 2000,
				width: 1440,
				height: 2000,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			});
		});

		it("moves an item by its title bar, showing where it lands", async () => {
			const m = await mountEditor();
			const h0 = handle(m, "material-io");
			hitAt(document.querySelector("[data-region='page']"));
			await pointerdown(h0, 1200, 20, 0);
			// under 6 px it is still a click
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 1203, clientY: 21 })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(false);
			window.dispatchEvent(
				new MouseEvent("pointermove", {
					clientX: 1200 - STEP,
					clientY: 20,
				})
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(true);
			expect(m.wrapper.find("[data-landing]").text()).toBe("Lands here");
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "material-io").x).toBe(8);
			expect(await savedCounts(m)).toMatchObject({ drag_count: 1 });
		});

		it("cancels a move with Esc, ignores other buttons and menu presses", async () => {
			const m = await mountEditor();
			const h0 = handle(m, "material-io");
			await pointerdown(h0, 1200, 20, 2);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 900, clientY: 20 })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(false);

			await pointerdown(
				m.wrapper.find("[data-item='i-material-io'] [data-item-menu]"),
				1200,
				20
			);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 900, clientY: 20 })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(false);

			hitAt(null);
			await pointerdown(h0, 1200, 20, 0);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 900, clientY: 20 })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(true);
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape" })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(false);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "material-io").x).toBe(9);
		});

		it("keeps a click a click, and only Esc cancels a drag", async () => {
			const m = await mountEditor();
			const h0 = handle(m, "material-io");
			hitAt(document.querySelector("[data-region='page']"));
			await pointerdown(h0, 1200, 20);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "material-io").x).toBe(9);
			expect(announce(m)).toBe("");

			await pointerdown(h0, 1200, 20);
			window.dispatchEvent(
				new MouseEvent("pointermove", {
					clientX: 1200 - STEP,
					clientY: 20,
				})
			);
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Shift" })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(true);
			window.dispatchEvent(new MouseEvent("pointercancel"));
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").exists()).toBe(false);
			expect(draft(m, "material-io").x).toBe(9);
		});

		it("resizes only with the main button", async () => {
			const m = await mountEditor();
			const edge = m.wrapper.find(
				"[data-item='i-empire'] [data-edge='w']"
			);
			await pointerdown(edge, 100, 100, 2);
			expect(m.wrapper.find("[data-resize-outline]").exists()).toBe(
				false
			);
		});

		it("keeps a tile kept in view in the band when dragged off both regions", async () => {
			const m = await mountEditor();
			await dragBy(handle(m, "kpi-area"), STEP, 0, { target: null });
			expect(draft(m, "kpi-area")).toMatchObject({ pin: true, x: 9 });
		});

		it("drops a hidden element from Elements onto a title bar as a tab", async () => {
			const m = await mountEditor();
			await pick(m, "experts", "hide");
			await dragBy(
				m.wrapper.find("[data-element-row='experts'] [data-drag]"),
				40,
				40,
				{ target: handle(m, "planet").element }
			);
			expect(draft(m, "planet").els).toEqual(["planet", "experts"]);
		});

		it("drags a tab out of its group, or onto another title bar", async () => {
			const m = await mountEditor();
			const tab = (el: string) =>
				m.wrapper.find(`[data-item="i-production"] [data-tab="${el}"]`);
			// a press without a move is a click: the tab shows
			await pointerdown(tab("supply-cart"), 100, 100);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await tab("supply-cart").trigger("click");
			await flushPromises();
			expect(draft(m, "production").active).toBe("supply-cart");
			expect(draft(m, "production").els).toContain("supply-cart");

			// dragged onto the page: its own item, where it drops
			await dragBy(tab("supply-cart"), -STEP * 4, 40);
			expect(draft(m, "production").els).not.toContain("supply-cart");
			const out = (
				m.wrapper
					.findComponent({ name: "PlanGrid" })
					.props("layout") as GridLayout
			).items.find((i) => i.els[0] === "supply-cart")!;
			expect(out.els).toEqual(["supply-cart"]);

			// onto another title bar: a tab there, or below or beside the tab it
			// shows; the drop target has the three, a tab where the bar has no width
			hitAt(
				m.wrapper.find("[data-item='i-planet'] [data-item-head]")
					.element
			);
			await pointerdown(tab("repair-analysis"), 100, 100);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 140, clientY: 140 })
			);
			await flushPromises();
			expect(
				m.wrapper
					.find("[data-item='i-planet'] [data-tab-target]")
					.text()
			).toBe("TabBelowBeside");
			expect(
				m.wrapper
					.find("[data-item='i-planet'] [data-zone='tab']")
					.classes()
			).toContain("text-link");
			expect(m.wrapper.find("[data-ghost]").text()).toBe(
				"Repair as a tab here"
			);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "planet").els).toEqual([
				"planet",
				"repair-analysis",
			]);
			expect(draft(m, "production").els).not.toContain("repair-analysis");
		});

		it("drops a part on the middle of a title bar below the tab shown there, on the right beside it", async () => {
			const m = await mountEditor();
			const head = m.wrapper.find(
				"[data-item='i-material-io'] [data-item-head]"
			).element;
			// a title bar 300 px wide from x 0: thirds at 100 and 200
			vi.spyOn(head, "getBoundingClientRect").mockReturnValue({
				left: 0,
				width: 300,
			} as DOMRect);
			hitAt(head);
			await pointerdown(
				m.wrapper.find(
					"[data-item='i-material-io-totals'] [data-item-head]"
				),
				100,
				100
			);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 150, clientY: 140 })
			);
			await flushPromises();
			const target = m.wrapper.find(
				"[data-item='i-material-io'] [data-tab-target]"
			);
			expect(target.find("[data-zone='below']").classes()).toContain(
				"text-link"
			);
			expect(m.wrapper.find("[data-ghost]").text()).toBe(
				"Material I/O totals below Material I/O"
			);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "material-io").els).toEqual([
				"material-io",
				"material-io-totals",
			]);
			expect(draft(m, "material-io").join).toEqual({
				"material-io-totals": "below",
			});
			expect(announce(m)).toBe(
				"Material I/O totals is below Material I/O now"
			);
			// Elements says where it is; the title names both
			expect(
				m.wrapper.find("[data-element-row='material-io-totals']").text()
			).toContain("Below Material I/O");
			expect(
				m.wrapper.find("[data-item='i-material-io'] h2").text()
			).toBe("Material I/O & Material I/O totals");

			// the menu: beside instead, then out again
			await pick(m, "material-io", "page:tabs");
			expect(option(m, "material-io", "side:below")).toMatchObject({
				checked: true,
			});
			await pick(m, "material-io", "side:beside");
			expect(draft(m, "material-io").join).toEqual({
				"material-io-totals": "beside",
			});
			await pick(m, "material-io", "page:tabs");
			await pick(m, "material-io", "out:material-io-totals");
			expect(draft(m, "material-io").els).toEqual(["material-io"]);
			expect(draft(m, "material-io-totals").els).toEqual([
				"material-io-totals",
			]);
		});

		it("joins from the menu; a tab holding two takes no third", async () => {
			const m = await mountEditor();
			await pick(m, "experts", "page:tabs");
			await pick(m, "experts", "beside:i-workforce");
			expect(draft(m, "workforce").join).toEqual({ experts: "beside" });
			await pick(m, "planet", "page:tabs");
			expect(option(m, "planet", "below:i-workforce")).toMatchObject({
				disabled: true,
				hint: "Workforce & Experts shows two parts already",
			});
			// hiding the tab hides both, as the eye button says
			expect(
				m.wrapper
					.find("[data-item='i-workforce'] [data-item-hide]")
					.attributes("aria-label")
			).toBe("Hide Workforce & Experts");

			// dragged onto its title bar: only a tab there
			hitAt(
				m.wrapper.find("[data-item='i-workforce'] [data-item-head]")
					.element
			);
			await pointerdown(handle(m, "planet"), 100, 100);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 140, clientY: 140 })
			);
			await flushPromises();
			expect(
				m.wrapper
					.find("[data-item='i-workforce'] [data-tab-target]")
					.text()
			).toBe("Drop to add Planet as a tab to Workforce & Experts");
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "workforce").els).toEqual([
				"workforce",
				"experts",
				"planet",
			]);
		});

		it("moves a placed element dragged from Elements; the first tab moves its group", async () => {
			const m = await mountEditor();
			const x0 = draft(m, "material-io").x;
			await dragBy(
				m.wrapper.find("[data-element-row='material-io'] [data-drag]"),
				-STEP * 2,
				0
			);
			expect(draft(m, "material-io").x).not.toBe(x0);
			await dragBy(
				m.wrapper.find(
					"[data-item='i-production'] [data-tab='production']"
				),
				0,
				0,
				{ target: handle(m, "planet").element }
			);
			// the group's own tab can't join another: nothing changes
			expect(draft(m, "planet").els).toEqual(["planet"]);
		});

		it("snaps a bottom edge to the same height as an item in its columns", async () => {
			const m = await mountEditor();
			// Planet below Empire: fixed 184, then 5 × 40 taller: 384 px
			await pick(m, "planet", "hm-fixed");
			for (let i = 0; i < 5; i++) await pick(m, "planet", "taller");
			expect(draft(m, "planet").h).toBe(384);
			await dragBy(
				m.wrapper.find("[data-item='i-empire'] [data-edge='h']"),
				0,
				200
			);
			expect(draft(m, "empire")).toMatchObject({ hm: "fixed", h: 384 });
			expect(announce(m)).toContain("Same height as Planet · 384 px");
			expect(await savedCounts(m)).toMatchObject({
				drag_count: 1,
				snapped_count: 1,
			});
		});

		it("drops onto another item's title bar as a tab", async () => {
			const m = await mountEditor();
			await dragBy(handle(m, "material-io"), -600, 0, {
				target: handle(m, "production").element,
			});
			expect(draft(m, "production").els.at(-1)).toBe("material-io");
			expect(announce(m)).toBe("Material I/O is now a tab of Production");
			expect(await savedCounts(m)).toMatchObject({ drag_count: 1 });
		});

		it("drops into the band to keep an item in view", async () => {
			const m = await mountEditor();
			await dragBy(handle(m, "empire"), 0, -50, {
				target: document.querySelector("[data-region='band']"),
			});
			expect(draft(m, "empire").pin).toBe(true);
		});

		it("lines the top up with an item beside it, not with Alt", async () => {
			const m = await mountEditor();
			// Material I/O starts at the top beside Production: dropped 10 px
			// lower, its top lines up with Production's again
			await dragBy(handle(m, "material-io"), 0, 10);
			expect(announce(m)).toContain("Lines up with the top of");
			await dragBy(handle(m, "material-io"), 0, 10, { alt: true });
			expect(announce(m)).not.toContain("Lines up");
		});

		it("resizes the width by the right edge, never below the minimum", async () => {
			const m = await mountEditor();
			const edge = m.wrapper.find(
				"[data-item='i-empire'] [data-edge='w']"
			);
			await dragBy(edge, STEP, 0);
			expect(draft(m, "empire").w).toBe(3);
			await dragBy(
				m.wrapper.find("[data-item='i-empire'] [data-edge='w']"),
				-3 * STEP,
				0
			);
			expect(draft(m, "empire").w).toBe(2);
			expect(await savedCounts(m)).toMatchObject({
				drag_count: 2,
				snapped_count: 0,
			});
		});

		it("takes columns from the part beside it, from either edge, down to its minimum", async () => {
			const m = await mountEditor();
			// Empire wider: Production beside it gives up a column
			await dragBy(
				m.wrapper.find("[data-item='i-empire'] [data-edge='w']"),
				STEP,
				0
			);
			expect(draft(m, "empire").w).toBe(3);
			expect(draft(m, "production")).toMatchObject({ x: 3, w: 6 });
			// Production's left edge takes it back
			await dragBy(
				m.wrapper.find("[data-item='i-production'] [data-edge='l']"),
				-STEP,
				0
			);
			expect(draft(m, "production")).toMatchObject({ x: 2, w: 7 });
			expect(draft(m, "empire").w).toBe(2);
			// further, Base's parts are at their minimum: it stops and says so
			const edge = m.wrapper.find(
				"[data-item='i-production'] [data-edge='l']"
			);
			hitAt(null);
			await pointerdown(edge, 300, 100, 0);
			window.dispatchEvent(
				new MouseEvent("pointermove", {
					clientX: 300 - 2 * STEP,
					clientY: 100,
				})
			);
			await flushPromises();
			// a side edge changes no height: the badge has none
			expect(m.wrapper.find("[data-resize-badge]").text()).toMatch(
				/^7 of 12 columns · \d+ px · Empire & prices at its minimum$/
			);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "production")).toMatchObject({ x: 2, w: 7 });
			// the menu's + says why too: Material I/O is at its 3 columns
			expect(option(m, "production", "wider")).toMatchObject({
				disabled: true,
				hint: "Material I/O beside it is at its minimum width",
			});
			expect(option(m, "empire", "wider")).toMatchObject({
				disabled: false,
			});
		});

		it("hides a part dropped on Elements, never Production", async () => {
			const m = await mountEditor();
			const panel = document.querySelector("[data-elements-panel]");
			const press = async (id: string) => {
				hitAt(panel);
				await pointerdown(handle(m, id), 100, 100, 0);
				window.dispatchEvent(
					new MouseEvent("pointermove", {
						clientX: 140,
						clientY: 140,
					})
				);
				await flushPromises();
			};
			await press("production");
			expect(m.wrapper.find("[data-drop-hide]").text()).toBe(
				"Production always stays on the page"
			);
			expect(m.wrapper.find("[data-landing]").exists()).toBe(false);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "production")).toBeDefined();

			await press("experts");
			expect(m.wrapper.find("[data-drop-hide]").text()).toBe(
				"Drop to hide Experts"
			);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "experts")).toBeUndefined();
			expect(m.wrapper.find("[data-drop-hide]").exists()).toBe(false);
			expect(await savedCounts(m)).toMatchObject({
				drag_count: 1,
				hidden_count: 1,
				hidden_elements: ["experts"],
			});
		});

		it("hides a tab or a part shown with another dropped on Elements, never Production", async () => {
			const m = await mountEditor();
			const panel = document.querySelector("[data-elements-panel]");
			const press = async (el: DOMWrapper<Element>) => {
				hitAt(panel);
				await pointerdown(el, 100, 100, 0);
				window.dispatchEvent(
					new MouseEvent("pointermove", {
						clientX: 140,
						clientY: 140,
					})
				);
				await flushPromises();
			};
			const drop = async () => {
				window.dispatchEvent(new MouseEvent("pointerup"));
				await flushPromises();
			};
			const tab = (id: string, el: string) =>
				m.wrapper.find(`[data-item="i-${id}"] [data-tab="${el}"]`);
			const dropText = () => m.wrapper.find("[data-drop-hide]").text();

			// a tab out of its group
			await press(tab("production", "supply-cart"));
			expect(dropText()).toBe("Drop to hide Supply");
			await drop();
			expect(draft(m, "production").els).not.toContain("supply-cart");

			// a part shown with another, from Elements: that part only
			await pick(m, "material-io-totals", "below:i-material-io");
			await press(
				m.wrapper.find(
					"[data-element-row='material-io-totals'] [data-drag]"
				)
			);
			expect(dropText()).toBe("Drop to hide Material I/O totals");
			await drop();
			expect(draft(m, "material-io").els).toEqual(["material-io"]);

			// Production, a tab of Planet now, stays
			await pick(m, "production", "split");
			await pick(m, "production", "tab:i-planet");
			await press(tab("planet", "production"));
			expect(dropText()).toBe("Production always stays on the page");
			await drop();
			expect(draft(m, "planet").els).toEqual(["planet", "production"]);
		});

		it("drops a tab out of its group on the right of a title bar beside the tab shown there", async () => {
			const m = await mountEditor();
			const head = m.wrapper.find(
				"[data-item='i-planet'] [data-item-head]"
			).element;
			// a title bar 300 px wide from x 0: its right third from 200
			vi.spyOn(head, "getBoundingClientRect").mockReturnValue({
				left: 0,
				width: 300,
			} as DOMRect);
			hitAt(head);
			await pointerdown(
				m.wrapper.find(
					"[data-item='i-production'] [data-tab='repair-analysis']"
				),
				100,
				100
			);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 250, clientY: 140 })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-ghost]").text()).toBe(
				"Repair beside Planet"
			);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "planet").join).toEqual({
				"repair-analysis": "beside",
			});
			expect(draft(m, "production").els).not.toContain("repair-analysis");
		});

		it("shows the outline, its badge and the snap line while resizing", async () => {
			const m = await mountEditor();
			const edge = m.wrapper.find(
				"[data-item='i-empire'] [data-edge='wh']"
			);
			hitAt(null);
			await pointerdown(edge, 100, 100, 0);
			// 180 px tall, all unmeasured: same height as the others
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 100, clientY: 105 })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-resize-badge]").text()).toContain(
				"2 of 12 columns"
			);
			// its own (unmeasured) content height: no other item to outline
			expect(m.wrapper.find("[data-snap-line]").text()).toBe(
				"Fits its content"
			);
			expect(m.wrapper.find("[data-snap-ref]").exists()).toBe(false);
			// near Production's bottom (240 px): its bottom, outlined
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 100, clientY: 158 })
			);
			await flushPromises();
			expect(m.wrapper.find("[data-snap-line]").text()).toBe(
				"Bottom of Production + 7 tabs"
			);
			expect(m.wrapper.find("[data-snap-ref]").exists()).toBe(true);
			// back to its own content before letting go
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 100, clientY: 102 })
			);
			await flushPromises();
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			// snapped back to the same height: nothing changed
			expect(draft(m, "empire").hm).toBe("fit");
		});

		it("makes a height fixed above the content, 'at most' below it", async () => {
			// every title row and content 500 px: each item 1,002 px of content
			const height = vi
				.spyOn(HTMLElement.prototype, "offsetHeight", "get")
				.mockReturnValue(500);
			onTestFinished(() => height.mockRestore());
			vi.stubGlobal(
				"requestAnimationFrame",
				(cb: FrameRequestCallback) => {
					queueMicrotask(() => cb(0));
					return 1;
				}
			);
			const m = await mountEditor();
			const edge = () =>
				m.wrapper.find("[data-item='i-production'] [data-edge='h']");
			await dragBy(edge(), 0, 200, { alt: true });
			expect(draft(m, "production")).toMatchObject({
				hm: "fixed",
				h: 1200,
			});
			expect(announce(m)).toBe(
				"Production + 7 tabs: fixed at 1200 px; taller content scrolls"
			);
			// below the content too: a height set by hand stays (owner,
			// 2026-11-07)
			await dragBy(edge(), 0, -400, { alt: true });
			expect(draft(m, "production")).toMatchObject({
				hm: "fixed",
				h: 800,
			});
			expect(announce(m)).toBe(
				"Production + 7 tabs: fixed at 800 px; taller content scrolls"
			);
			// never below its 240 px minimum
			await dragBy(edge(), 0, -2000, { alt: true });
			expect(draft(m, "production").h).toBe(240);
		});

		it("keeps the stored width when only the height is dragged at an 'auto' width", async () => {
			pageWidth = 1024;
			stageWidth = 1024;
			const m = await mountEditor();
			// Empire is rearranged wider at 1024
			expect(size(m, "empire")).toMatch(/^auto 3\/12 \(yours 2\)/);
			await dragBy(
				m.wrapper.find("[data-item='i-empire'] [data-edge='h']"),
				0,
				80,
				{ alt: true }
			);
			expect(draft(m, "empire")).toMatchObject({ w: 2, hm: "fixed" });
		});

		it("adds a hidden element by dragging it from Elements", async () => {
			const m = await mountEditor();
			await pick(m, "experts", "hide");
			await dragBy(
				m.wrapper.find("[data-element-row='experts'] [data-drag]"),
				50,
				50
			);
			expect(m.wrapper.find("[data-item='i-experts']").exists()).toBe(
				true
			);
			expect(announce(m)).toContain("Experts added");
		});
	});

	describe("the same change three ways", () => {
		beforeEach(() => {
			vi.spyOn(
				Element.prototype,
				"getBoundingClientRect"
			).mockReturnValue({
				left: 0,
				top: 0,
				right: 1440,
				bottom: 2000,
				width: 1440,
				height: 2000,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			});
		});
		const CASES: {
			name: string;
			id: string;
			keys: [string, boolean];
			menu: string;
			drag: [string, number, number];
		}[] = [
			{
				name: "one column right",
				id: "empire",
				keys: ["ArrowRight", false],
				menu: "right",
				drag: ["handle", STEP, 0],
			},
			{
				name: "one column wider",
				id: "empire",
				keys: ["ArrowRight", true],
				menu: "wider",
				drag: ["w", STEP, 0],
			},
			{
				name: "40 px taller",
				id: "empire",
				keys: ["ArrowDown", true],
				menu: "taller",
				drag: ["h", 0, 40],
			},
			{
				name: "one column narrower",
				id: "production",
				keys: ["ArrowLeft", true],
				menu: "narrower",
				drag: ["w", -STEP, 0],
			},
			{
				name: "40 px shorter",
				id: "empire",
				keys: ["ArrowUp", true],
				menu: "shorter",
				drag: ["h", 0, -40],
			},
			{
				name: "one column left",
				id: "material-io",
				keys: ["ArrowLeft", false],
				menu: "left",
				drag: ["handle", -STEP, 0],
			},
		];
		it.each(CASES)("$name gives the same layout", async (c) => {
			const results: GridLayout[] = [];
			for (const how of ["keys", "menu", "drag"] as const) {
				const m = await mountEditor();
				if (how === "keys") await key(m, c.id, ...c.keys);
				else if (how === "menu") await pick(m, c.id, c.menu);
				else
					await dragBy(
						c.drag[0] === "handle"
							? handle(m, c.id)
							: m.wrapper.find(
									`[data-item='i-${c.id}'] [data-edge='${c.drag[0]}']`
								),
						c.drag[1],
						c.drag[2],
						{ alt: true }
					);
				const g = m.wrapper
					.findComponent({ name: "PlanGrid" })
					.props("layout") as GridLayout;
				results.push(cloneLayout(g));
				m.wrapper.unmount();
			}
			expect(results[1]).toEqual(results[0]);
			expect(results[2]).toEqual(results[0]);
		});
	});

	describe("the grid bar", () => {
		it("rescales a run of column changes from where it started", async () => {
			const m = await mountEditor();
			for (let i = 0; i < 4; i++)
				await button(m, "[data-cols-plus]").trigger("click");
			// 12 → 16 in one go: Workforce 5..8 becomes 7..11, 4 wide, not 7
			expect(draft(m, "kpi-workforce")).toMatchObject({ x: 7, w: 4 });
		});

		it("sets columns within 4–24 and the gap", async () => {
			const m = await mountEditor();
			await button(m, "[data-cols-plus]").trigger("click");
			expect(m.wrapper.find("[data-cols]").text()).toBe("13");
			await button(m, "[data-cols-minus]").trigger("click");
			expect(m.wrapper.find("[data-cols]").text()).toBe("12");
			const gap = m.wrapper
				.findAllComponents({ name: "PSegmented" })
				.find((s) => s.props("label") === "Gap")!;
			gap.vm.$emit("update:value", 8);
			await flushPromises();
			expect(announce(m)).toBe("Gap 8 px");
		});

		it("shows Workforce as a table from its menu, undoably, saved with the layout", async () => {
			const m = await mountEditor();
			expect(
				option(m, "workforce", "view:cards:workforce")
			).toMatchObject({
				label: "As cards",
				checked: true,
			});
			expect(
				option(m, "workforce", "view:table:workforce")
			).toMatchObject({
				checked: false,
			});
			// only where a table exists
			expect(option(m, "planet", "view:table:planet")).toBeUndefined();
			await pick(m, "workforce", "view:table:workforce");
			const layout = () =>
				m.wrapper
					.findComponent({ name: "PlanGrid" })
					.props("layout") as GridLayout;
			expect(layout().table).toEqual(["workforce"]);
			expect(
				option(m, "workforce", "view:table:workforce")
			).toMatchObject({
				checked: true,
			});
			expect(announce(m)).toBe("Workforce shown as a table");
			await button(m, "[data-save]").trigger("click");
			expect(m.pref.layout.value.table).toEqual(["workforce"]);
		});

		it("opens an element that hides parts from its menu, undoably, saved with the layout", async () => {
			const m = await mountEditor();
			const layout = () =>
				m.wrapper
					.findComponent({ name: "PlanGrid" })
					.props("layout") as GridLayout;
			const state = (id: string, k: string) =>
				m.wrapper.find(`[data-item="i-${id}"] [data-state="${k}"]`);
			expect(option(m, "production", "open:production")).toBeUndefined();
			// as on the page until switched
			expect(option(m, "workforce", "open:workforce")).toMatchObject({
				label: "Everything open",
				tip: "Every tier, field and button, also on the page",
				checked: false,
			});
			expect(state("workforce", "open").exists()).toBe(false);
			await pick(m, "workforce", "open:workforce");
			expect(layout().open).toEqual(["workforce"]);
			expect(option(m, "workforce", "open:workforce")).toMatchObject({
				checked: true,
			});
			expect(option(m, "experts", "open:experts")).toMatchObject({
				checked: false,
			});
			// shown as an icon on the title row, named for screen readers
			expect(state("workforce", "open").attributes("aria-label")).toBe(
				"Everything open"
			);
			expect(announce(m)).toBe("Workforce shows everything");
			// a change like any other: quiet, undoable
			expect(mocks.toast).not.toHaveBeenCalled();
			await button(m, "[data-undo]").trigger("click");
			expect(layout().open).toBeUndefined();

			await pick(m, "workforce", "open:workforce");
			await button(m, "[data-save]").trigger("click");
			expect(m.pref.layout.value.open).toEqual(["workforce"]);
		});

		it("shows what is set as icons: pinned, following, as a table", async () => {
			const m = await mountEditor();
			const state = (id: string, k: string) =>
				m.wrapper.find(`[data-item="i-${id}"] [data-state="${k}"]`);
			// the results tiles are pinned in Standard; the words are gone
			expect(state("kpi-profit", "pinned").attributes("title")).toBe(
				"Pinned to top"
			);
			expect(size(m, "kpi-profit")).not.toContain("pinned");
			expect(option(m, "material-io", "follow")).toMatchObject({
				label: "Follow while scrolling",
				checked: false,
			});
			await pick(m, "material-io", "follow");
			expect(draft(m, "material-io").follow).toBe(true);
			expect(state("material-io", "follows").exists()).toBe(true);
			expect(announce(m)).toBe("Material I/O follows while scrolling");
			await pick(m, "workforce", "view:table:workforce");
			expect(state("workforce", "table").exists()).toBe(true);
			// pinning ends following, following unpins
			await pick(m, "material-io", "pin");
			expect(draft(m, "material-io")).toMatchObject({ pin: true });
			expect(draft(m, "material-io").follow).toBeUndefined();
			await pick(m, "material-io", "follow");
			expect(draft(m, "material-io")).toMatchObject({
				pin: false,
				follow: true,
			});
		});

		it("notes items rearranged at a narrow page", async () => {
			pageWidth = 1024;
			stageWidth = 1024;
			const m = await mountEditor();
			expect(m.wrapper.find("[data-auto-note]").text()).toMatch(
				/items? (is|are) rearranged automatically/
			);
			expect(size(m, "material-io")).toMatch(/^auto \d+\/12 \(yours 3\)/);
			// nothing narrower checked below 1024
			expect(m.wrapper.find("[data-narrower-note]").exists()).toBe(false);
		});

		it("notes what narrower screens rearrange", async () => {
			const m = await mountEditor();
			expect(m.wrapper.find("[data-auto-note]").exists()).toBe(false);
			// a count per width, each width that rearranges something
			expect(m.wrapper.find("[data-narrower-note]").text()).toMatch(
				/^Rearranged automatically on narrower screens, to keep their minimum width: \d+ items? at (1280|1024) px(, \d+ items? at 1024 px)?\.$/
			);
		});

		it("turns Tinted parts on at once, kept by Cancel too", async () => {
			const m = await mountEditor();
			const root = m.wrapper.find("[data-layout-editor]");
			expect(root.attributes("data-tinted")).toBeUndefined();
			await m.wrapper
				.find("[data-tint]")
				.findComponent({ name: "PCheckbox" })
				.vm.$emit("update:checked", true);
			await flushPromises();
			expect(m.pref.tinted.value).toBe(true);
			expect(root.attributes("data-tinted")).toBe("true");
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_tint_toggle", {
				is_active: true,
			});
			// no change to the layout: Cancel leaves at once, still tinted
			await button(m, "[data-cancel]").trigger("click");
			await flushPromises();
			expect(mocks.confirm).not.toHaveBeenCalled();
			expect(m.pref.tinted.value).toBe(true);
			expect(m.pref.choice.value).toBe("standard");
		});
	});

	describe("Wide and Phone", () => {
		const toPhone = async (m: Mounted) => {
			m.wrapper
				.find("[data-arrangement]")
				.findComponent({ name: "PSegmented" })
				.vm.$emit("update:value", "phone");
			await flushPromises();
		};
		const grid = (m: Mounted) =>
			m.wrapper.findComponent({ name: "PlanGrid" });

		it("shows Phone at a phone's width, two columns, automatic at first", async () => {
			const m = await mountEditor();
			await toPhone(m);
			expect(grid(m).props("width")).toBe(390);
			expect((grid(m).props("layout") as GridLayout).cols).toBe(2);
			expect(m.wrapper.find("[data-phone-note]").text()).toMatch(
				/^Automatic/
			);
			expect(m.wrapper.find("[data-back-to-auto]").exists()).toBe(false);
			// no columns to set; the parts can be moved and sized
			expect(m.wrapper.find("[data-cols]").exists()).toBe(false);
			expect(m.wrapper.find("[data-narrower-note]").exists()).toBe(false);
			expect(handle(m, "empire").exists()).toBe(true);
			expect(announce(m)).toMatch(/^Phone arrangement/);
		});

		it("arranges Phone on the first change, keeps Wide, goes back to automatic", async () => {
			const m = await mountEditor();
			const wideEmpire = { ...draft(m, "empire") };
			await toPhone(m);
			await key(m, "empire", "ArrowDown");
			expect(m.wrapper.find("[data-back-to-auto]").exists()).toBe(true);
			const phoneEmpire = { ...draft(m, "empire") };
			// Wide unchanged
			m.wrapper
				.find("[data-arrangement]")
				.findComponent({ name: "PSegmented" })
				.vm.$emit("update:value", "wide");
			await flushPromises();
			expect(draft(m, "empire")).toEqual(wideEmpire);
			await toPhone(m);
			expect(draft(m, "empire")).toEqual(phoneEmpire);

			await button(m, "[data-back-to-auto]").trigger("click");
			expect(m.wrapper.find("[data-back-to-auto]").exists()).toBe(false);
			expect(announce(m)).toBe("Phone follows Wide again");
			// undoable
			await button(m, "[data-undo]").trigger("click");
			expect(m.wrapper.find("[data-back-to-auto]").exists()).toBe(true);
		});

		it("undoes a Phone change from Wide, back in Phone", async () => {
			const m = await mountEditor();
			await toPhone(m);
			await key(m, "empire", "ArrowDown");
			m.wrapper
				.find("[data-arrangement]")
				.findComponent({ name: "PSegmented" })
				.vm.$emit("update:value", "wide");
			await flushPromises();
			await button(m, "[data-undo]").trigger("click");
			expect(grid(m).props("width")).toBe(390);
			expect(m.wrapper.find("[data-back-to-auto]").exists()).toBe(false);
		});

		it("saves both arrangements; Reset makes Phone automatic again", async () => {
			const m = await mountEditor();
			await toPhone(m);
			await key(m, "empire", "ArrowDown");
			const counts = await savedCounts(m);
			expect(counts).toMatchObject({ has_phone_layout: true });
			expect(m.pref.custom.value?.phone?.cols).toBe(2);

			const again = await mountEditor({
				stored: {
					v: 1,
					preset: "custom",
					custom: m.pref.custom.value,
					folded: none,
				},
			});
			await toPhone(again);
			expect(again.wrapper.find("[data-back-to-auto]").exists()).toBe(
				true
			);
			await button(again, "[data-reset]").trigger("click");
			expect(again.wrapper.find("[data-back-to-auto]").exists()).toBe(
				false
			);
			expect(await savedCounts(again)).toMatchObject({
				has_phone_layout: false,
			});
			expect(again.pref.custom.value?.phone).toBeUndefined();
		});

		it("starts Phone automatic when customising Standard", async () => {
			const m = await mountEditor({
				stored: {
					v: 1,
					preset: "standard",
					custom: {
						wide: wideLayout(),
						phone: { ...wideLayout(), cols: 2 },
					},
					folded: none,
				},
			});
			await toPhone(m);
			expect(m.wrapper.find("[data-back-to-auto]").exists()).toBe(false);
		});
	});

	describe("Elements", () => {
		it("counts the elements not placed on its button", async () => {
			const m = await mountEditor();
			expect(button(m, "[data-elements-toggle]").text()).toBe("Elements");
			await pick(m, "experts", "hide");
			expect(button(m, "[data-elements-toggle]").text()).toBe(
				"Elements · 1"
			);
		});

		it("tags elements new to Custom Layout", async () => {
			const m = await mountEditor({
				stored: {
					v: 1,
					preset: "custom",
					custom: {
						wide: presetLayout("standard"),
						known: ELEMENT_IDS.filter((e) => e !== "experts"),
					},
					folded: none,
				},
			});
			expect(
				m.wrapper
					.find("[data-element-row='experts'] [data-fresh]")
					.text()
			).toBe("New");
			expect(
				m.wrapper
					.find("[data-element-row='planet'] [data-fresh]")
					.exists()
			).toBe(false);
		});

		it("adds a hidden element at the bottom and shows a placed one", async () => {
			const m = await mountEditor();
			await pick(m, "experts", "hide");
			const row = () => m.wrapper.find("[data-element-row='experts']");
			expect(row().text()).toContain("Hidden");
			await row().find("button").trigger("click");
			expect(m.wrapper.find("[data-item='i-experts']").exists()).toBe(
				true
			);
			expect(row().text()).toContain("On the page");

			vi.useFakeTimers();
			await m.wrapper
				.find("[data-element-row='supply-cart'] button")
				.trigger("click");
			expect(draft(m, "production").active).toBe("supply-cart");
			expect(
				m.wrapper
					.find("[data-item='i-production'] .ring-warning")
					.exists()
			).toBe(true);
			vi.advanceTimersByTime(1500);
			await flushPromises();
			expect(
				m.wrapper
					.find("[data-item='i-production'] .ring-warning")
					.exists()
			).toBe(false);
			vi.useRealTimers();
			expect(
				m.wrapper.find("[data-element-row='supply-cart']").text()
			).toContain("A tab of Production");
		});

		it("shows a tab already on view, and keeps the newest highlight", async () => {
			const m = await mountEditor();
			const ring = (id: string) =>
				m.wrapper.find(`[data-item="i-${id}"] .ring-warning`).exists();
			const show = (el: string) =>
				m.wrapper
					.find(`[data-element-row='${el}'] button`)
					.trigger("click");
			vi.useFakeTimers();
			await show("planet");
			expect(draft(m, "planet").active).toBe("planet");
			expect(ring("planet")).toBe(true);
			vi.advanceTimersByTime(1000);
			await show("experts");
			expect(ring("planet")).toBe(false);
			// Planet's highlight runs out without ending Experts'
			vi.advanceTimersByTime(500);
			await flushPromises();
			expect(ring("experts")).toBe(true);
			vi.advanceTimersByTime(1000);
			await flushPromises();
			expect(ring("experts")).toBe(false);
			vi.useRealTimers();
		});

		it("adds nothing that is on the page already", async () => {
			const m = await mountEditor();
			m.wrapper
				.findComponent({ name: "PlanLayoutElementsPanel" })
				.vm.$emit("add", "planet");
			await flushPromises();
			expect(announce(m)).toBe("");
			expect(
				button(m, "[data-undo]").attributes("disabled")
			).toBeDefined();
		});

		it("toggles the panel", async () => {
			const m = await mountEditor();
			await button(m, "[data-elements-toggle]").trigger("click");
			expect(m.wrapper.find("[data-elements-panel]").exists()).toBe(
				false
			);
		});
	});

	describe("leaving", () => {
		it("saves into Custom Layout and closes", async () => {
			const m = await mountEditor();
			await key(m, "material-io", "ArrowLeft");
			await button(m, "[data-save]").trigger("click");
			expect(m.pref.choice.value).toBe("custom");
			expect(
				m.pref.custom.value!.wide.items.find(
					(i) => i.id === "i-material-io"
				)!.x
			).toBe(8);
			expect(m.component.emitted("close")).toHaveLength(1);
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_save", {
				item_count: 13,
				tab_group_count: 1,
				joined_count: 0,
				joined_sized_count: 0,
				kept_in_view_count: 5,
				hidden_count: 0,
				hidden_elements: [],
				column_count: 12,
				gap_px: 16,
				is_replacing: false,
				has_phone_layout: false,
				store: "account",
				change_count: 1,
				drag_count: 0,
				menu_count: 0,
				key_count: 1,
				button_count: 0,
				snapped_count: 0,
				undo_count: 0,
			});
			// one event for the round, none per change
			expect(
				vi
					.mocked(trackEvent)
					.mock.calls.filter(([e]) => e.startsWith("plan:layout"))
			).toHaveLength(1);
		});

		it("counts each change by how, undos too, and sends them with save", async () => {
			const m = await mountEditor();
			await key(m, "material-io", "ArrowLeft");
			await key(m, "material-io", "ArrowLeft");
			await pick(m, "empire", "full");
			await m.wrapper
				.find('[data-item="i-experts"] [data-item-hide]')
				.trigger("click");
			await flushPromises();
			await button(m, "[data-undo]").trigger("click");
			expect(await savedCounts(m)).toMatchObject({
				change_count: 3,
				key_count: 2,
				menu_count: 1,
				button_count: 1,
				drag_count: 0,
				undo_count: 1,
			});
		});

		it("names the hidden elements and counts the joined tabs", async () => {
			const m = await mountEditor();
			await pick(m, "experts", "hide");
			await pick(m, "material-io-totals", "below:i-material-io");
			expect(await savedCounts(m)).toMatchObject({
				hidden_count: 1,
				hidden_elements: ["experts"],
				joined_count: 1,
			});
		});

		it("sizes a tab's two from the menu and by the line between them", async () => {
			const m = await mountEditor();
			// every part drawn 300 px high (jsdom draws nothing)
			vi.spyOn(
				Element.prototype,
				"getBoundingClientRect"
			).mockReturnValue(DOMRect.fromRect({ width: 1440, height: 300 }));
			await pick(m, "material-io-totals", "below:i-material-io");
			// as high as its content until set
			await pick(m, "material-io", "page:tabs");
			expect(option(m, "material-io", "share:auto")).toMatchObject({
				checked: true,
			});
			const min = Math.max(64, ELEMENTS["material-io"].minH);
			await pick(m, "material-io", "share:+");
			expect(draft(m, "material-io").joinSize).toEqual({
				// 40 px more, on the 8 px grid
				"material-io-totals":
					Math.round((Math.max(300, min) + 40) / 8) * 8,
			});
			expect(option(m, "material-io", "share:-")).toMatchObject({
				disabled: false,
			});
			// the line, dragged down 400 px from 300: 700, on the 8 px grid
			await dragBy(
				m.wrapper.find("[data-split='material-io-totals']"),
				0,
				400,
				{ target: null }
			);
			expect(draft(m, "material-io").joinSize).toEqual({
				"material-io-totals": 704,
			});
			expect(announce(m)).toBe(
				"Material I/O is 704 px high, Material I/O totals below it"
			);
			// dragged again to the same height: nothing more
			await dragBy(
				m.wrapper.find("[data-split='material-io-totals']"),
				0,
				400,
				{ target: null }
			);
			expect(draft(m, "material-io").joinSize).toEqual({
				"material-io-totals": 704,
			});
			await pick(m, "material-io", "share:auto");
			expect(draft(m, "material-io")).not.toHaveProperty("joinSize");
			const said = announce(m);
			await pick(m, "material-io", "share:auto");
			expect(announce(m)).toBe(said);
			await pick(m, "material-io", "share:+");
			expect(await savedCounts(m)).toMatchObject({
				drag_count: 1,
				joined_sized_count: 1,
			});
		});

		it("sizes two beside each other in columns; Esc and a cancel put the line back", async () => {
			// Material I/O and its totals beside each other, all 12 columns
			const custom = cloneLayout(presetLayout("standard"));
			custom.items = custom.items.filter(
				(i) => i.els[0] !== "material-io-totals"
			);
			const io = custom.items.find((i) => i.els[0] === "material-io")!;
			Object.assign(io, {
				els: ["material-io", "material-io-totals"],
				join: { "material-io-totals": "beside" },
				x: 0,
				w: 12,
				y: 99,
			});
			const m = await mountEditor({
				stored: {
					v: 1,
					preset: "custom",
					custom: { wide: custom },
					folded: none,
				},
			});
			const cols = () =>
				draft(m, "material-io").joinSize?.["material-io-totals"];
			await pick(m, "material-io", "page:tabs");
			expect(option(m, "material-io", "share:auto")).toMatchObject({
				checked: true,
			});
			await pick(m, "material-io", "share:+");
			const n = cols()!;
			expect(n).toBeGreaterThan(0);
			await pick(m, "material-io", "share:-");
			expect(cols()).toBe(n - 1);
			await pick(m, "material-io", "share:auto");
			expect(cols()).toBeUndefined();

			const line = m.wrapper.find("[data-split='material-io-totals']");
			// only the main button presses the line
			await pointerdown(line, 100, 100, 2);
			window.dispatchEvent(
				new MouseEvent("pointermove", { clientX: 100 + 2 * STEP })
			);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(cols()).toBeUndefined();
			// a press without a move changes nothing
			await pointerdown(line, 100, 100);
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(cols()).toBeUndefined();

			// Esc mid-drag, then a cancel mid-drag: the line stays where it was
			for (const stop of [
				() =>
					window.dispatchEvent(
						new KeyboardEvent("keydown", { key: "Escape" })
					),
				() => window.dispatchEvent(new MouseEvent("pointercancel")),
			]) {
				await pointerdown(line, 100, 100);
				window.dispatchEvent(
					new MouseEvent("pointermove", { clientX: 100 - 2 * STEP })
				);
				await flushPromises();
				expect(cols()).toBeDefined();
				stop();
				await flushPromises();
				expect(cols()).toBeUndefined();
				window.dispatchEvent(new MouseEvent("pointerup"));
				await flushPromises();
				expect(cols()).toBeUndefined();
			}

			await dragBy(line, -2 * STEP, 0, { target: null });
			expect(cols()).toBeGreaterThan(0);
		});

		it("asks before replacing an existing Custom Layout", async () => {
			const custom = wideLayout();
			const m = await mountEditor({
				stored: {
					v: 1,
					preset: "standard",
					custom: { wide: custom },
					folded: none,
				},
			});
			await button(m, "[data-save]").trigger("click");
			expect(m.wrapper.find("[data-replace]").exists()).toBe(true);
			expect(announce(m)).toBe(
				"This replaces your current Custom Layout."
			);
			const [keep, replace] = m.wrapper
				.find("[data-replace]")
				.findAll("button");
			await keep.trigger("click");
			expect(m.wrapper.find("[data-replace]").exists()).toBe(false);
			expect(m.component.emitted("close")).toBeUndefined();

			await button(m, "[data-save]").trigger("click");
			await m.wrapper
				.find("[data-replace]")
				.findAll("button")[1]
				.trigger("click");
			void replace;
			expect(m.pref.custom.value).toEqual({
				wide: presetLayout("standard"),
				known: ELEMENT_IDS,
			});
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_save",
				expect.objectContaining({ is_replacing: true })
			);
		});

		it("saves Custom Layout over itself without asking", async () => {
			const m = await mountEditor({
				stored: {
					v: 1,
					preset: "custom",
					custom: { wide: wideLayout() },
					folded: none,
				},
			});
			expect(m.wrapper.find("[data-editor-bar]").text()).not.toContain(
				"starting from"
			);
			await button(m, "[data-save]").trigger("click");
			expect(m.component.emitted("close")).toHaveLength(1);
		});

		it("asks when the layout changed elsewhere: keep editing", async () => {
			const m = await mountEditor();
			expect(m.wrapper.find("[data-elsewhere]").exists()).toBe(false);
			m.pref.changedElsewhere.value = true;
			await flushPromises();
			expect(m.wrapper.find("[data-elsewhere]").text()).toContain(
				"Your layout was changed elsewhere"
			);
			await button(m, "[data-elsewhere-keep]").trigger("click");
			await flushPromises();
			expect(m.wrapper.find("[data-elsewhere]").exists()).toBe(false);
			expect(m.component.emitted("close")).toBeUndefined();
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_remote_update",
				{
					is_customising: true,
					choice: "keep",
				}
			);
		});

		it("doesn't ask when only the folds changed elsewhere", async () => {
			const value = ref<StoredLayout | null>({
				v: 1,
				preset: "standard",
				custom: null,
				folded: none,
			});
			const m = await mountEditor({
				store: {
					load: () => value.value,
					save: (v) => (value.value = v),
				},
			});
			value.value = {
				...value.value!,
				folded: { wide: ["planet"], phone: [] },
			};
			await flushPromises();
			expect(m.wrapper.find("[data-elsewhere]").exists()).toBe(false);
		});

		it("loads the layout changed elsewhere, asking first with changes", async () => {
			const m = await mountEditor();
			await key(m, "material-io", "ArrowLeft");
			m.pref.changedElsewhere.value = true;
			await flushPromises();
			mocks.confirm.mockResolvedValueOnce(false);
			await button(m, "[data-elsewhere-load]").trigger("click");
			await flushPromises();
			expect(m.component.emitted("close")).toBeUndefined();
			mocks.confirm.mockResolvedValueOnce(true);
			await button(m, "[data-elsewhere-load]").trigger("click");
			await flushPromises();
			expect(m.component.emitted("close")).toHaveLength(1);
			expect(m.pref.changedElsewhere.value).toBe(false);
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_remote_update",
				{
					is_customising: true,
					choice: "load",
				}
			);
		});

		it("cancels at once without changes, asks with changes", async () => {
			const m = await mountEditor();
			await button(m, "[data-cancel]").trigger("click");
			await flushPromises();
			expect(mocks.confirm).not.toHaveBeenCalled();
			expect(m.component.emitted("close")).toHaveLength(1);
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_cancel",
				expect.objectContaining({
					change_count: 0,
				})
			);

			const n = await mountEditor();
			await key(n, "material-io", "ArrowLeft");
			mocks.confirm.mockResolvedValueOnce(false);
			await n.wrapper
				.find("[data-layout-editor]")
				.trigger("keydown", { key: "Escape" });
			await flushPromises();
			expect(n.component.emitted("close")).toBeUndefined();
			mocks.confirm.mockResolvedValueOnce(true);
			await button(n, "[data-cancel]").trigger("click");
			await flushPromises();
			expect(n.component.emitted("close")).toHaveLength(1);
			// Cancel restores: nothing saved
			expect(n.pref.choice.value).toBe("standard");
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_cancel",
				expect.objectContaining({
					change_count: 1,
				})
			);
		});

		it("leaves Esc to an open menu", async () => {
			const m = await mountEditor();
			await key(m, "material-io", "ArrowLeft");
			await key(m, "planet", "Enter");
			await m.wrapper
				.find("[data-layout-editor]")
				.trigger("keydown", { key: "Escape" });
			await flushPromises();
			expect(mocks.confirm).not.toHaveBeenCalled();
			expect(m.component.emitted("close")).toBeUndefined();
		});

		it("undoes with the button and the toast, resets to Standard", async () => {
			const m = await mountEditor();
			await key(m, "material-io", "ArrowLeft");
			await key(m, "material-io", "ArrowLeft");
			await button(m, "[data-undo]").trigger("click");
			expect(draft(m, "material-io").x).toBe(8);
			// an element leaving the page gets a toast with Undo
			await pick(m, "experts", "hide");
			expect(mocks.toast).toHaveBeenCalledTimes(1);
			const [text, options] = mocks.toast.mock.calls[0];
			expect(text).toBe("Experts hidden. It stays in Elements.");
			expect(options.duration).toBe(5000);
			options.action.onClick();
			await flushPromises();
			expect(draft(m, "experts").els).toEqual(["experts"]);

			await pick(m, "empire", "full");
			await button(m, "[data-reset]").trigger("click");
			expect(draft(m, "empire").w).toBe(2);
			expect(announce(m)).toBe("Reset to Standard");
		});
	});

	it("has no axe violations, with a menu open", async () => {
		const m = await mountEditor();
		await key(m, "planet", "Enter");
		await flushPromises();
		for (const el of [
			m.wrapper.element,
			document.querySelector("[role=menu]"),
		]) {
			expect(el).not.toBeNull();
			const result = await axe.run(el!, {
				rules: { "color-contrast": { enabled: false } },
			});
			expect(
				result.violations.map(
					(v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`
				)
			).toEqual([]);
		}
	});
});
