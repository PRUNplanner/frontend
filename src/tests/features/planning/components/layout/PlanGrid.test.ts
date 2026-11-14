import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { h, inject } from "vue";

import PlanGrid from "@/features/planning/components/layout/PlanGrid.vue";
import PlanToolTabs from "@/features/planning/components/PlanToolTabs.vue";
import { mountComponent } from "@/tests/mountComponent";
import {
	planViewContext,
	provideContext,
} from "@/tests/features/planning/components/elements/planViewContext.fixtures";
import { presetLayout } from "@/features/planning/layout/presets";
import {
	stackedLayout,
	wideLayout,
} from "@/tests/features/planning/layout/layout.fixtures";
import { PRESET_KEYS } from "@/features/planning/layout/presets";
import { ELEMENTS } from "@/features/planning/layout/elements";
import { partRoomKey } from "@/features/planning/layout/planGrid.util";

// Types & Interfaces
import type {
	ElementId,
	GridLayout,
} from "@/features/planning/layout/planLayout.types";

// every element has its own test: a line of its id, and the room it's given
vi.mock("@/features/planning/layout/elementComponents", () => ({
	elementView: (id: string) => ({
		component: {
			name: `El-${id}`,
			setup() {
				const room = inject(partRoomKey, null);
				return () =>
					h(
						"p",
						{
							"data-el": id,
							"data-room": room?.value ?? undefined,
						},
						id
					);
			},
		},
		props: {},
	}),
}));

// a ResizeObserver the test drives, and frames that run on the next tick
const observers: { cb: ResizeObserverCallback; els: Element[] }[] = [];
beforeEach(() => {
	observers.length = 0;
	vi.stubGlobal(
		"ResizeObserver",
		class {
			els: Element[] = [];
			constructor(cb: ResizeObserverCallback) {
				observers.push({ cb, els: this.els });
			}
			observe(el: Element) {
				this.els.push(el);
			}
			unobserve() {}
			disconnect() {}
		}
	);
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		queueMicrotask(() => cb(0));
		return 1;
	});
	vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

async function mountGrid(
	props: {
		layout?: GridLayout;
		folded?: ElementId[];
		width?: number;
		summaries?: Partial<Record<ElementId, string>>;
	} = {}
) {
	return mountComponent(
		PlanGrid,
		{ layout: presetLayout("standard"), folded: [], width: 1440, ...props },
		{ setup: provideContext(planViewContext()) }
	);
}

const box = (
	wrapper: Awaited<ReturnType<typeof mountGrid>>["wrapper"],
	id: string
) => wrapper.find(`[data-item="${id}"]`);

describe("PlanGrid", () => {
	it.each(PRESET_KEYS)("renders %s: the band and the page", async (key) => {
		const layout = presetLayout(key);
		const { wrapper } = await mountGrid({ layout });
		const band = wrapper.find("[data-region='band']");
		const page = wrapper.find("[data-region='page']");
		expect(band.findAll("[data-item]")).toHaveLength(
			layout.items.filter((i) => i.pin).length
		);
		expect(page.findAll("[data-item]")).toHaveLength(
			layout.items.filter((i) => !i.pin).length
		);
		// moved with transform, never top/left
		for (const el of wrapper.findAll("[data-item]")) {
			expect(el.attributes("style")).toContain("transform: translate(");
			expect(el.attributes("style")).not.toMatch(/(^|;)\s*(top|left):/);
		}
	});

	it("keeps the band in view, cut at 40 % of the window and scrolling inside", async () => {
		vi.stubGlobal("innerHeight", 1000);
		// unmeasured items are 180 px: one row of results tiles
		const { wrapper } = await mountGrid();
		const band = () => wrapper.find("[data-region='band']");
		const scroll = () => wrapper.find("[data-band-scroll]");
		expect(band().classes()).toContain("sticky");
		expect(band().attributes("data-capped")).toBeUndefined();
		expect(scroll().attributes("style")).toBeUndefined();

		// a short window: still in view, cut at 160 px, scrolling inside
		vi.stubGlobal("innerHeight", 400);
		window.dispatchEvent(new Event("resize"));
		await flushPromises();
		expect(band().classes()).toContain("sticky");
		expect(band().attributes("data-capped")).toBe("true");
		expect(scroll().attributes("style")).toContain("max-height: 160px");
		expect(scroll().classes()).toContain("overflow-y-auto");
	});

	it("never cuts the band where the page leaves room, nor when it is the page", async () => {
		vi.stubGlobal("innerHeight", 1000);
		// everything kept in view: the band is the page, whole, not sticky
		const all = presetLayout("standard");
		all.items = all.items.map((i) => ({ ...i, pin: true }));
		const { wrapper, setProps } = await mountGrid({ layout: all });
		const band = () => wrapper.find("[data-region='band']");
		expect(band().classes()).not.toContain("sticky");
		expect(band().attributes("data-capped")).toBeUndefined();

		// one short part left on the page (180 px): the band may take the
		// rest of the window, 1000 − 180 − 16 px
		const one = presetLayout("standard");
		one.items = one.items.map((i) => ({
			...i,
			pin: i.id !== "i-material-io-totals",
		}));
		await setProps({ layout: one });
		expect(band().classes()).toContain("sticky");
		expect(band().attributes("data-capped")).toBe("true");
		expect(
			wrapper.find("[data-band-scroll]").attributes("style")
		).toContain("max-height: 804px");
	});

	it("has no band without items kept in view", async () => {
		const layout = presetLayout("standard");
		layout.items = layout.items.filter((i) => !i.pin);
		const { wrapper } = await mountGrid({ layout });
		expect(wrapper.find("[data-region='band']").exists()).toBe(false);
	});

	it("packs from measured content heights, once per frame", async () => {
		const height = vi
			.spyOn(HTMLElement.prototype, "offsetHeight", "get")
			.mockReturnValue(300);
		const { wrapper } = await mountGrid();
		// the grid's observer watches the most (tab strips have their own)
		const { cb, els } = [...observers].sort(
			(a, b) => b.els.length - a.els.length
		)[0];
		cb(
			els.map((target) => ({ target }) as ResizeObserverEntry),
			{} as ResizeObserver
		);
		await flushPromises();
		// title row 300 + content 300 + 2 px of border
		expect(box(wrapper, "i-empire").attributes("style")).toContain(
			"height: 602px"
		);
		// a results tile has no title row
		expect(box(wrapper, "i-kpi-profit").attributes("style")).toContain(
			"height: 302px"
		);

		// folded or hidden (0 px): the last height stays
		height.mockReturnValue(0);
		cb(
			els.map((target) => ({ target }) as ResizeObserverEntry),
			{} as ResizeObserver
		);
		await flushPromises();
		expect(box(wrapper, "i-empire").attributes("style")).toContain(
			"height: 602px"
		);
		height.mockRestore();
	});

	it("measures parts and the page's width before the first paint", async () => {
		// no animation frame ever runs: only what happens before paint counts
		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn(() => 1)
		);
		const height = vi
			.spyOn(HTMLElement.prototype, "offsetHeight", "get")
			.mockReturnValue(100);
		const width = vi
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(1000);
		const { wrapper } = await mountComponent(
			PlanGrid,
			{ layout: presetLayout("standard"), folded: [] },
			{ setup: provideContext(planViewContext()) }
		);
		await flushPromises();
		// the real heights, not the 180 px guess: the band is one tile high,
		// so the page below it never moves when a frame measures it
		expect(box(wrapper, "i-kpi-profit").attributes("style")).toContain(
			"height: 102px"
		);
		expect(
			wrapper.find("[data-grid='band']").attributes("style")
		).toContain("height: 102px");
		// laid out at the page's width, not the 1,280 px default
		const last = box(wrapper, "i-kpi-storage").attributes("style")!;
		const num = (re: RegExp) => Number(last.match(re)![1]);
		expect(
			num(/translate\(([\d.]+)px/) + num(/width: ([\d.]+)px/)
		).toBeCloseTo(1000);
		height.mockRestore();
		width.mockRestore();
	});

	it("measures the page's width without a preview width", async () => {
		const width = vi
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(700);
		const { wrapper, component } = await mountComponent(
			PlanGrid,
			{ layout: stackedLayout(), folded: [] },
			{ setup: provideContext(planViewContext()) }
		);
		await flushPromises();
		// below 760 px: a phone, everything stacked
		expect(box(wrapper, "i-production").attributes("style")).toContain(
			"width: 700px"
		);
		// and says so: the phone arrangement is the one to show
		expect(component.emitted("phone")).toEqual([[true]]);
		width.mockRestore();
	});

	it("says a wide page is no phone, and nothing at a set width", async () => {
		const width = vi
			.spyOn(HTMLElement.prototype, "clientWidth", "get")
			.mockReturnValue(1200);
		const { component } = await mountComponent(
			PlanGrid,
			{ layout: stackedLayout(), folded: [] },
			{ setup: provideContext(planViewContext()) }
		);
		await flushPromises();
		expect(component.emitted("phone")).toEqual([[false]]);
		const fixed = await mountGrid({ width: 390 });
		await flushPromises();
		expect(fixed.component.emitted("phone")).toBeUndefined();
		width.mockRestore();
	});

	it("tags parts new to Custom Layout", async () => {
		const { wrapper } = await mountComponent(
			PlanGrid,
			{
				layout: presetLayout("standard"),
				folded: [],
				width: 1440,
				fresh: ["experts"],
			},
			{ setup: provideContext(planViewContext()) }
		);
		expect(box(wrapper, "i-experts").find("[data-fresh]").exists()).toBe(
			true
		);
		expect(box(wrapper, "i-planet").find("[data-fresh]").exists()).toBe(
			false
		);
	});

	it("folds an item to its title row and emits it", async () => {
		const { wrapper, component } = await mountGrid({ folded: ["planet"] });
		const planet = box(wrapper, "i-planet");
		expect(planet.attributes("data-folded")).toBe("true");
		expect(planet.attributes("style")).toContain("height: 46px");
		expect(planet.find("[data-body]").attributes("style")).toContain(
			"display: none"
		);

		await planet.find("[data-fold]").trigger("click");
		await box(wrapper, "i-experts").find("[data-fold]").trigger("click");
		expect(component.emitted("fold")).toEqual([
			["planet", false],
			["experts", true],
		]);
		// results tiles don't fold
		expect(box(wrapper, "i-kpi-area").find("[data-fold]").exists()).toBe(
			false
		);
	});

	it("shows two parts in one tab below or beside each other, both lines folded", async () => {
		const today = presetLayout("standard");
		const pair = (side: "below" | "beside"): GridLayout => ({
			...today,
			items: today.items
				.filter((i) => i.els[0] !== "material-io-totals")
				.map((i) =>
					i.els[0] === "material-io"
						? {
								...i,
								els: ["material-io", "material-io-totals"],
								join: { "material-io-totals": side },
							}
						: i
				),
		});
		const below = await mountGrid({ layout: pair("below") });
		const tab = box(below.wrapper, "i-material-io").find(
			"[data-tab-body='material-io']"
		);
		expect(
			tab
				.findAll("[data-element]")
				.map((e) => e.attributes("data-element"))
		).toEqual(["material-io", "material-io-totals"]);
		expect(tab.classes()).toContain("flex-col");
		// one tab: a title, no tab strip
		expect(
			box(below.wrapper, "i-material-io")
				.findComponent(PlanToolTabs)
				.exists()
		).toBe(false);

		// beside in a box narrower than both minimums: below each other
		const narrow = await mountGrid({ layout: pair("beside") });
		expect(
			box(narrow.wrapper, "i-material-io")
				.find("[data-tab-body='material-io']")
				.attributes("data-pair")
		).toBe("col");
		// full width: side by side, a line between, shared by their
		// minimums on the nearest columns
		const wide = pair("beside");
		const io = wide.items.find((i) => i.els[0] === "material-io")!;
		io.x = 0;
		io.w = 12;
		const beside = await mountGrid({ layout: wide });
		const side = box(beside.wrapper, "i-material-io").find(
			"[data-tab-body='material-io']"
		);
		expect(side.attributes("data-pair")).toBe("row");
		expect(side.classes()).toContain("[&>*+*]:border-l");
		const flexes = (w: Awaited<ReturnType<typeof mountGrid>>["wrapper"]) =>
			box(w, "i-material-io")
				.findAll("[data-tab-body='material-io'] [data-element]")
				.map((e) => (e.element as HTMLElement).style.flex);
		const minA = ELEMENTS["material-io"].minW;
		const minB = ELEMENTS["material-io-totals"].minW;
		const col = (1440 - 11 * 16) / 12;
		const lineAt = (n: number) => n * col + (n - 1) * 16 + 8;
		const near = Math.round(
			((1440 * minA) / (minA + minB) + 8) / (col + 16)
		);
		const [line, rest] = flexes(beside.wrapper);
		expect(parseFloat(line.split(" ")[2])).toBeCloseTo(lineAt(near));
		expect(rest).toBe("1 1 0px");

		// set to 8 of 12 columns: the line where columns 8 and 9 meet
		const eight = await mountGrid({
			layout: {
				...wide,
				items: wide.items.map((i) =>
					i === io
						? { ...i, joinSize: { "material-io-totals": 8 } }
						: i
				),
			},
		});
		expect(parseFloat(flexes(eight.wrapper)[0].split(" ")[2])).toBeCloseTo(
			8 * col + 7 * 16 + 8
		);

		// below, 300 px high: the first part scrolls inside
		const tall = pair("below");
		const tallIo = tall.items.find((i) => i.els[0] === "material-io")!;
		tallIo.joinSize = { "material-io-totals": 300 };
		const held = await mountGrid({ layout: tall });
		const first = box(held.wrapper, "i-material-io").find(
			"[data-element='material-io']"
		).element as HTMLElement;
		expect([first.style.height, first.style.overflowY]).toEqual([
			"300px",
			"auto",
		]);

		const folded = await mountGrid({
			layout: pair("below"),
			folded: ["material-io"],
			summaries: {
				"material-io": "12 imports",
				"material-io-totals": "Profit / day 10.00",
			},
		});
		expect(
			box(folded.wrapper, "i-material-io")
				.find("[data-fold-summary]")
				.text()
		).toBe("12 imports · Profit / day 10.00");
	});

	it("shows three parts in one tab, each line on the columns, named first +2", async () => {
		const today = presetLayout("standard");
		const three = (
			side: "below" | "beside",
			joinSize?: GridLayout["items"][number]["joinSize"]
		): GridLayout => ({
			...today,
			items: today.items
				.filter(
					(i) => !["material-io-totals", "planet"].includes(i.els[0])
				)
				.map((i) =>
					i.els[0] === "material-io"
						? {
								...i,
								x: 0,
								w: 12,
								els: [
									"material-io",
									"material-io-totals",
									"planet",
								],
								join: {
									"material-io-totals": side,
									planet: side,
								},
								...(joinSize && { joinSize }),
							}
						: i
				),
		});
		const beside = await mountGrid({
			layout: three("beside", { "material-io-totals": 4, planet: 4 }),
		});
		const io = box(beside.wrapper, "i-material-io");
		// key-only i18n here: the "first +2" name, the full list on hover
		expect(io.find("h2").text()).toBe("plan.layout.more");
		expect(io.find("h2").attributes("title")).toBe("plan.layout.list");
		expect(
			io.find("[data-tab-body='material-io']").attributes("data-pair")
		).toBe("row");
		const col = (1440 - 11 * 16) / 12;
		const at = (n: number) => n * col + (n - 1) * 16 + 8;
		const flex = io
			.findAll("[data-tab-body='material-io'] [data-element]")
			.map((e) => (e.element as HTMLElement).style.flex);
		expect(parseFloat(flex[0].split(" ")[2])).toBeCloseTo(at(4));
		expect(parseFloat(flex[1].split(" ")[2])).toBeCloseTo(at(8) - at(4));
		expect(flex[2]).toBe("1 1 0px");

		// too narrow for all three: stacked, the column sizes no heights
		const narrow = await mountGrid({
			layout: three("beside", { "material-io-totals": 4, planet: 4 }),
			width: 600,
		});
		const stacked = box(narrow.wrapper, "i-material-io");
		expect(
			stacked
				.find("[data-tab-body='material-io']")
				.attributes("data-pair")
		).toBe("col");
		expect(
			stacked
				.findAll("[data-tab-body='material-io'] [data-element]")
				.map((e) => (e.element as HTMLElement).style.height)
		).toEqual(["", "", ""]);

		// below: each part's own height
		const below = await mountGrid({
			layout: three("below", { planet: 320 }),
		});
		const heights = box(below.wrapper, "i-material-io")
			.findAll("[data-tab-body='material-io'] [data-element]")
			.map((e) => (e.element as HTMLElement).style.height);
		expect(heights).toEqual(["", "320px", ""]);
	});

	it("says where a folded part stands after its title, only folded", async () => {
		const { wrapper } = await mountGrid({
			folded: ["planet"],
			summaries: {
				planet: "COGC METAL · 3 permits",
				experts: "Agri 1 · Chem 4",
			},
		});
		const line = box(wrapper, "i-planet").find("[data-fold-summary]");
		expect(line.text()).toBe("COGC METAL · 3 permits");
		// the whole line on hover, where it is cut short
		expect(line.attributes("title")).toBe("COGC METAL · 3 permits");
		expect(
			box(wrapper, "i-experts").find("[data-fold-summary]").exists()
		).toBe(false);
	});

	it("shows a tab group's tabs, mounts a tab when first shown and keeps it", async () => {
		const { wrapper, component, setProps } = await mountGrid();
		const prod = box(wrapper, "i-production");
		expect(prod.find("[data-el='production']").exists()).toBe(true);
		expect(prod.find("[data-el='supply-cart']").exists()).toBe(false);

		prod.findComponent(PlanToolTabs).vm.$emit("toggle", "supply-cart");
		expect(component.emitted("tab")).toEqual([
			["i-production", "supply-cart"],
		]);

		await setProps({ tabs: { "i-production": "supply-cart" } });
		expect(prod.find("[data-el='supply-cart']").exists()).toBe(true);
		await setProps({ tabs: {} });
		// kept mounted, hidden
		expect(
			(prod.find("[data-tab-body='supply-cart']").element as HTMLElement)
				.style.display
		).toBe("none");
	});

	it("shows the tabs of results tiles made into tabs, not a lone tile's title", async () => {
		// Payback, Profit / day and Area as one item, as a player saved it
		const today = presetLayout("standard");
		const grouped = ["kpi-profit", "kpi-area"];
		const layout: GridLayout = {
			...today,
			items: today.items
				.filter((i) => !grouped.includes(i.els[0]))
				.map((i) =>
					i.els[0] === "kpi-payback"
						? {
								...i,
								els: ["kpi-payback", ...grouped] as ElementId[],
							}
						: i
				),
		};
		const { wrapper } = await mountGrid({ layout });
		const group = box(wrapper, "i-kpi-payback");
		expect(
			group.findAll("[data-tab]").map((t) => t.attributes("data-tab"))
		).toEqual(["kpi-payback", "kpi-profit", "kpi-area"]);
		// no fold on results tiles, tabs or not
		expect(group.find("[data-fold]").exists()).toBe(false);
		const lone = box(wrapper, "i-kpi-storage");
		expect(lone.find("h2").exists()).toBe(false);
		expect(lone.findComponent(PlanToolTabs).exists()).toBe(false);
	});

	it("shows the stored tab when the one picked left the item", async () => {
		// Supply picked on Standard, then a layout where Production has no Supply
		const { wrapper, setProps } = await mountGrid({
			layout: wideLayout(),
		});
		await setProps({ tabs: { "i-production": "supply-cart" } });
		const prod = box(wrapper, "i-production");
		expect(prod.find("[data-el='production']").exists()).toBe(true);
		expect(prod.find("[data-el='supply-cart']").exists()).toBe(false);
	});

	it("makes the body inert while customising", async () => {
		const { wrapper } = await mountComponent(
			PlanGrid,
			{
				layout: presetLayout("standard"),
				folded: [],
				width: 1440,
				editing: true,
			},
			{ setup: provideContext(planViewContext()) }
		);
		// every part can't be used; the line between two parts stays live
		const parts = wrapper.findAll("[data-element]");
		expect(parts.length).toBeGreaterThan(0);
		expect(
			parts.every((p) => p.find(":scope > [inert]").exists() === true)
		).toBe(true);
		expect(
			wrapper.findAll("[data-body]").some((b) => b.attributes("inert"))
		).toBe(false);
		// no pair in Standard: no line to drag
		expect(wrapper.find("[data-split]").exists()).toBe(false);
	});

	it("offers the line between two parts to drag while customising", async () => {
		const g = presetLayout("standard");
		const io = g.items.find((i) => i.els[0] === "material-io")!;
		g.items = g.items.filter((i) => i.els[0] !== "material-io-totals");
		io.els = ["material-io", "material-io-totals"];
		io.join = { "material-io-totals": "below" };
		const { wrapper, component } = await mountComponent(
			PlanGrid,
			{ layout: g, folded: [], width: 1440, editing: true },
			{ setup: provideContext(planViewContext()) }
		);
		const line = wrapper.find("[data-split='material-io-totals']");
		expect(line.classes()).toContain("cursor-row-resize");
		await line.trigger("pointerdown");
		expect(component.emitted("split")?.[0]?.slice(0, 2)).toEqual([
			"i-material-io",
			"material-io-totals",
		]);
	});

	it("gives every item a title row while customising, without the fold", async () => {
		const { wrapper } = await mountComponent(
			PlanGrid,
			{
				layout: presetLayout("standard"),
				folded: [],
				width: 1440,
				editing: true,
			},
			{ setup: provideContext(planViewContext()) }
		);
		const kpi = box(wrapper, "i-kpi-profit");
		expect(kpi.find("[data-item-head='i-kpi-profit']").exists()).toBe(true);
		expect(wrapper.find("[data-fold]").exists()).toBe(false);
		expect(
			box(wrapper, "i-production")
				.find("[data-tab='supply-cart']")
				.exists()
		).toBe(true);
	});

	describe("a card without title bar", () => {
		// Material I/O bare at a fixed 480 px; Production keeps its tabs
		const bare = (): GridLayout => {
			const g = presetLayout("standard");
			g.items = g.items.map((i) =>
				i.id === "i-material-io"
					? { ...i, bare: true, hm: "fixed", h: 480 }
					: i
			);
			return g;
		};

		it("shows only its body, never folded, and its title row while customising", async () => {
			const { wrapper } = await mountGrid({
				layout: bare(),
				folded: ["material-io"],
			});
			const io = box(wrapper, "i-material-io");
			expect(io.find("[data-item-head]").exists()).toBe(false);
			expect(io.find("h2").exists()).toBe(false);
			expect(io.find("[data-fold]").exists()).toBe(false);
			expect(io.attributes("data-folded")).toBeUndefined();
			expect(io.find("[data-el='material-io']").isVisible()).toBe(true);
			// the others keep theirs
			expect(box(wrapper, "i-planet").find("h2").exists()).toBe(true);

			const editing = await mountComponent(
				PlanGrid,
				{ layout: bare(), folded: [], width: 1440, editing: true },
				{ setup: provideContext(planViewContext()) }
			);
			expect(
				box(editing.wrapper, "i-material-io")
					.find("[data-item-head='i-material-io']")
					.exists()
			).toBe(true);
		});

		it("measures a title row that comes back while it is on screen", async () => {
			// bare in one arrangement only, or a change from another tab
			const { wrapper, setProps } = await mountGrid({ layout: bare() });
			const titled = bare();
			delete titled.items.find((i) => i.id === "i-material-io")!.bare;
			await setProps({ layout: titled });
			await flushPromises();
			const head = box(wrapper, "i-material-io").find("h2");
			expect(head.exists()).toBe(true);
			const row = head.element.parentElement!;
			expect(observers.some((o) => o.els.includes(row))).toBe(true);
		});

		it("gives its body the whole box: no title row to take off", async () => {
			// every title row 40 px
			const height = vi
				.spyOn(HTMLElement.prototype, "offsetHeight", "get")
				.mockReturnValue(40);
			const room = (g: GridLayout) =>
				mountGrid({ layout: g }).then((m) =>
					box(m.wrapper, "i-material-io")
						.find("[data-el='material-io']")
						.attributes("data-room")
				);
			const titled = bare();
			delete titled.items.find((i) => i.id === "i-material-io")!.bare;
			expect(await room(bare())).toBe("480");
			expect(await room(titled)).toBe("440");
			height.mockRestore();
		});
	});

	it("scrolls only a box lower than its content, clips nothing else", async () => {
		// every title row and content 500 px: 1,002 px of content per item
		const height = vi
			.spyOn(HTMLElement.prototype, "offsetHeight", "get")
			.mockReturnValue(500);
		const { wrapper } = await mountGrid({ layout: wideLayout() });
		await flushPromises();
		// Plan check is at most 360 px: it scrolls inside
		expect(
			box(wrapper, "i-plan-check").find("[data-body]").classes()
		).toContain("overflow-y-auto");
		// the rest fit: no clipping, so hit areas near the edge stay whole
		expect(
			box(wrapper, "i-empire").find("[data-body]").classes()
		).toContain("overflow-visible");
		height.mockRestore();
	});

	describe("parts that follow while scrolling", () => {
		// Material I/O follows, Totals below it inside its columns: one stack
		const following = (pinned = true): GridLayout => {
			const g = presetLayout("standard");
			g.items = g.items
				.filter((i) => pinned || !i.pin)
				.map((i) =>
					i.id === "i-material-io" ? { ...i, follow: true } : i
				);
			return g;
		};
		const top = (
			wrapper: Awaited<ReturnType<typeof mountGrid>>["wrapper"],
			id: string
		) => (box(wrapper, id).element as HTMLElement).style.top;

		it("sticks the stack just below the band", async () => {
			vi.stubGlobal("innerHeight", 1000);
			const { wrapper } = await mountGrid({ layout: following() });
			expect(
				wrapper
					.findAll("[data-follow]")
					.map((f) => f.attributes("data-follow"))
			).toEqual(["i-material-io", "i-material-io-totals"]);
			expect(box(wrapper, "i-material-io").classes()).toContain("sticky");
			// band 180 px + its gap, then the page's gap; Totals 200 + 16 px lower
			expect(top(wrapper, "i-material-io")).toBe("212px");
			expect(top(wrapper, "i-material-io-totals")).toBe("428px");
			// the rest stays put
			expect(box(wrapper, "i-production").classes()).not.toContain(
				"sticky"
			);
		});

		it("sticks below a cut band where it is cut", async () => {
			vi.stubGlobal("innerHeight", 400);
			const { wrapper } = await mountGrid({ layout: following() });
			// cut at 160 px
			expect(top(wrapper, "i-material-io")).toBe("192px");
		});

		it("sticks at the window's top without a band", async () => {
			const { wrapper } = await mountGrid({ layout: following(false) });
			expect(top(wrapper, "i-material-io")).toBe("16px");
		});
	});

	it("still lays out without a ResizeObserver, at the unmeasured height", async () => {
		vi.stubGlobal("ResizeObserver", undefined);
		const { wrapper } = await mountGrid();
		expect(box(wrapper, "i-empire").attributes("style")).toContain(
			"height: 180px"
		);
	});

	it("measures the parts still there when one left before the frame", async () => {
		const frames: FrameRequestCallback[] = [];
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return 1;
		});
		const height = vi
			.spyOn(HTMLElement.prototype, "offsetHeight", "get")
			.mockReturnValue(300);
		const layout = presetLayout("standard");
		const { wrapper, setProps } = await mountGrid({ layout });
		// Planet removed while its measuring waits for the frame
		await setProps({
			layout: {
				...layout,
				items: layout.items.filter((i) => i.id !== "i-planet"),
			},
		});
		expect(box(wrapper, "i-planet").exists()).toBe(false);
		frames.splice(0).forEach((cb) => cb(0));
		await flushPromises();
		expect(box(wrapper, "i-empire").attributes("style")).toContain(
			"height: 602px"
		);
		height.mockRestore();
	});

	it("drops a waiting measurement when it unmounts", async () => {
		const { wrapper } = await mountGrid();
		window.dispatchEvent(new Event("resize"));
		wrapper.unmount();
		expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
		// the frame that still runs finds no grid and does nothing
		await flushPromises();
	});
});
