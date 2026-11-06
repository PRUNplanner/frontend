import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { type DOMWrapper, flushPromises } from "@vue/test-utils";
import { h } from "vue";
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
import { cloneLayout } from "@/features/planning/layout/normaliseLayout";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import plan from "@/locales/en_US/plan.json";
import common from "@/locales/en_US/common.json";

// Types & Interfaces
import type { LayoutStore } from "@/features/planning/layout/layoutStore";
import type { StoredLayout } from "@/features/planning/layout/planLayout.schemas";
import type { GridLayout } from "@/features/planning/layout/planLayout.types";
import type { PDropdownOption } from "@/ui/ui.types";

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
beforeEach(() => {
	stageWidth = 1440;
	mocks.toast.mockReturnValue({ destroy: vi.fn() });
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
		function (this: HTMLElement) {
			return this.hasAttribute("data-layout-editor") ? 1440 : stageWidth;
		}
	);
});

const memoryStore = (initial: StoredLayout | null = null): LayoutStore => {
	let value = initial;
	return { load: () => value, save: (v) => (value = v) };
};

async function mountEditor(
	o: { stored?: StoredLayout | null; loggedIn?: boolean } = {}
) {
	const pref = usePlanLayoutPreference(memoryStore(o.stored ?? null));
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
/** An item of an item's ⋯ menu, by its key */
const option = (m: Mounted, id: string, k: string) =>
	(menuOf(m, id).props("options") as PDropdownOption[]).find(
		(o) => "key" in o && o.key === k
	);
const pick = async (m: Mounted, id: string, k: string) => {
	menuOf(m, id).vm.$emit("select", k);
	await flushPromises();
};
const button = (m: Mounted, selector: string) => m.wrapper.find(selector);

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
	it("shows the bar: name, where it started, the preview widths", async () => {
		const m = await mountEditor();
		const bar = m.wrapper.find("[data-editor-bar]");
		expect(bar.text()).toContain("Custom Layout");
		expect(bar.text()).toContain("starting from Today's");
		expect(bar.find("[data-zoom]").exists()).toBe(false);
		expect(
			bar
				.findComponent({ name: "PSegmented" })
				.props("options")
				.map((o: { label: string }) => o.label)
		).toEqual(["Full", "1600", "1440", "1280", "1024", "Phone"]);
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_move", {
				element: "material-io",
				how: "keys",
				to: "page",
			});

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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_resize", {
				element: "empire",
				how: "keys",
				what: "height",
				snapped: null,
			});
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_undo", {
				how: "keys",
			});
		});
	});

	describe("the ⋯ menu", () => {
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
				label: "Make it a tab of …",
			});
			await pick(m, "material-io", "page:tabs");
			expect(ioKey("tab:i-production")).toMatchObject({
				label: "Production + 7 tabs",
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_move", {
				element: "material-io",
				how: "menu",
				to: "tabs",
			});
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_move", {
				element: "material-io",
				how: "drag",
				to: "page",
			});
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

		it("resizes only with the main button, and not on a phone preview", async () => {
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_move", {
				element: "supply-cart",
				how: "drag",
				to: "page",
			});

			// onto another title bar: a tab there, the drop target says so
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
			).toBe("Drop to add Repair as a tab to Planet");
			window.dispatchEvent(new MouseEvent("pointerup"));
			await flushPromises();
			expect(draft(m, "planet").els).toEqual([
				"planet",
				"repair-analysis",
			]);
			expect(draft(m, "production").els).not.toContain("repair-analysis");
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_resize", {
				element: "empire",
				how: "drag",
				what: "height",
				snapped: "height",
			});
		});

		it("drops onto another item's title bar as a tab", async () => {
			const m = await mountEditor();
			await dragBy(handle(m, "material-io"), -600, 0, {
				target: handle(m, "production").element,
			});
			expect(draft(m, "production").els.at(-1)).toBe("material-io");
			expect(announce(m)).toBe("Material I/O is now a tab of Production");
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_move", {
				element: "material-io",
				how: "drag",
				to: "tabs",
			});
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_item_resize", {
				element: "empire",
				how: "drag",
				what: "width",
				snapped: null,
			});
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
			await dragBy(edge(), 0, -400, { alt: true });
			expect(draft(m, "production")).toMatchObject({ hm: "cap", h: 800 });
			expect(announce(m)).toBe(
				"Production + 7 tabs: fits its content up to 800 px, scrolls beyond"
			);
			// never below its 240 px minimum
			await dragBy(edge(), 0, -2000, { alt: true });
			expect(draft(m, "production").h).toBe(240);
		});

		it("keeps the stored width when only the height is dragged at an 'auto' width", async () => {
			const m = await mountEditor();
			const preview = m.wrapper
				.findAllComponents({ name: "PSegmented" })
				.find((s) => s.props("label") === "Preview width")!;
			preview.vm.$emit("update:value", 1024);
			await flushPromises();
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
			expect(option(m, "workforce", "view:cards")).toMatchObject({
				label: "Cards",
				checked: true,
			});
			expect(option(m, "workforce", "view:table")).toMatchObject({
				checked: false,
			});
			// only where a table exists
			expect(option(m, "planet", "view:table")).toBeUndefined();
			await pick(m, "workforce", "view:table");
			const layout = () =>
				m.wrapper
					.findComponent({ name: "PlanGrid" })
					.props("layout") as GridLayout;
			expect(layout().table).toEqual(["workforce"]);
			expect(option(m, "workforce", "view:table")).toMatchObject({
				checked: true,
			});
			expect(announce(m)).toBe("Workforce shown as a table");
			await button(m, "[data-save]").trigger("click");
			expect(m.pref.layout.value.table).toEqual(["workforce"]);
		});

		it("opens an element that hides parts, undoably, and saves it with the layout", async () => {
			const m = await mountEditor();
			const toggle = (id: string) =>
				m.wrapper.find(`[data-item="i-${id}"] [data-content-toggle]`);
			const layout = () =>
				m.wrapper
					.findComponent({ name: "PlanGrid" })
					.props("layout") as GridLayout;
			expect(toggle("production").exists()).toBe(false);
			// as on the page until switched
			expect(toggle("workforce").attributes("aria-pressed")).toBe(
				"false"
			);
			expect(toggle("workforce").attributes("aria-label")).toBe(
				"Workforce: everything open"
			);
			await toggle("workforce").trigger("click");
			await flushPromises();
			expect(layout().open).toEqual(["workforce"]);
			expect(toggle("workforce").attributes("aria-pressed")).toBe("true");
			expect(toggle("experts").attributes("aria-pressed")).toBe("false");
			expect(announce(m)).toBe("Workforce shows everything");
			// a change like any other: quiet, undoable
			expect(mocks.toast).not.toHaveBeenCalled();
			await button(m, "[data-undo]").trigger("click");
			expect(layout().open).toBeUndefined();

			await toggle("workforce").trigger("click");
			await button(m, "[data-save]").trigger("click");
			expect(m.pref.layout.value.open).toEqual(["workforce"]);
		});

		it("notes items rearranged at a narrow preview, and a phone preview", async () => {
			const m = await mountEditor();
			const preview = m.wrapper
				.findAllComponents({ name: "PSegmented" })
				.find((s) => s.props("label") === "Preview width")!;
			preview.vm.$emit("update:value", 1024);
			await flushPromises();
			expect(m.wrapper.find("[data-auto-note]").text()).toMatch(
				/items? (is|are) rearranged automatically/
			);
			expect(size(m, "material-io")).toMatch(/^auto \d+\/12 \(yours 3\)/);

			preview.vm.$emit("update:value", 390);
			await flushPromises();
			expect(m.wrapper.find("[data-phone-note]").exists()).toBe(true);
			expect(m.wrapper.find("[data-handle]").exists()).toBe(false);
		});
	});

	describe("Elements", () => {
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
				m.pref.custom.value!.items.find(
					(i) => i.id === "i-material-io"
				)!.x
			).toBe(8);
			expect(m.component.emitted("close")).toHaveLength(1);
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_save", {
				items: 13,
				tabs: 1,
				kept_in_view: 5,
				hidden: 0,
				cols: 12,
				gap: 16,
				replaced: false,
				store: "session",
			});
		});

		it("asks before replacing an existing Custom Layout", async () => {
			const custom = presetLayout("wide");
			const m = await mountEditor({
				stored: { v: 1, preset: "today", custom, folded: [] },
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
			expect(m.pref.custom.value).toEqual(presetLayout("today"));
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_save",
				expect.objectContaining({ replaced: true })
			);
		});

		it("saves Custom Layout over itself without asking", async () => {
			const m = await mountEditor({
				stored: {
					v: 1,
					preset: "custom",
					custom: presetLayout("wide"),
					folded: [],
				},
			});
			expect(m.wrapper.find("[data-editor-bar]").text()).not.toContain(
				"starting from"
			);
			await button(m, "[data-save]").trigger("click");
			expect(m.component.emitted("close")).toHaveLength(1);
		});

		it("cancels at once without changes, asks with changes", async () => {
			const m = await mountEditor();
			await button(m, "[data-cancel]").trigger("click");
			await flushPromises();
			expect(mocks.confirm).not.toHaveBeenCalled();
			expect(m.component.emitted("close")).toHaveLength(1);
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_cancel", {
				changes: 0,
			});

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
			expect(n.pref.choice.value).toBe("today");
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_cancel", {
				changes: 1,
			});
		});

		it("undoes with the button and the toast, resets to Today's", async () => {
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
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_undo", {
				how: "toast",
			});

			await pick(m, "empire", "full");
			await button(m, "[data-reset]").trigger("click");
			expect(draft(m, "empire").w).toBe(2);
			expect(announce(m)).toBe("Reset to Today's");
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
