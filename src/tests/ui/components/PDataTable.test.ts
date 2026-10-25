import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref, type Component, type Slots } from "vue";

import { createI18n } from "vue-i18n";

import PDataTable from "@/ui/components/PDataTable.vue";
import { sortRows } from "@/ui/dataTableSort";
// also unmounts after each test
import { tableRows } from "@/tests/mountComponent";
import type { PDataTableColumn } from "@/ui/ui.types";

interface Row {
	id: string;
	name: string;
	amount: number | null;
}

const DATA: Row[] = [
	{ id: "a", name: "beta", amount: 2 },
	{ id: "b", name: "alpha", amount: null },
	{ id: "c", name: "gamma", amount: 10 },
	{ id: "d", name: "Delta", amount: 1 },
];

const COLUMNS: PDataTableColumn<Row>[] = [
	{ key: "name", title: "Name", sorter: true },
	{ key: "amount", title: "Amount", align: "right", sorter: true },
	{ key: "id", title: "Id" },
];

function mountTable(
	props: Record<string, unknown> = {},
	slots: Slots | Record<string, unknown> = {}
) {
	const i18n = createI18n({
		legacy: false,
		locale: "en_US",
		missingWarn: false,
		fallbackWarn: false,
	});
	return mount(
		defineComponent({
			setup: () => () =>
				h(
					PDataTable as never,
					{
						columns: COLUMNS,
						data: DATA,
						rowKey: (r: Row) => r.id,
						...props,
					},
					slots
				),
		}),
		{ global: { plugins: [i18n] } }
	);
}

const ids = (w: ReturnType<typeof mountTable>) => tableRows(w).map((r) => r.id);
const header = (w: ReturnType<typeof mountTable>, key: string) =>
	w.find(`th[data-col-key="${key}"]`);

describe("PDataTable", () => {
	it("renders row[key] per column, with the row key and alignment", () => {
		const w = mountTable();
		expect(tableRows(w)).toEqual([
			{ name: "beta", amount: "2", id: "a" },
			{ name: "alpha", amount: "", id: "b" },
			{ name: "gamma", amount: "10", id: "c" },
			{ name: "Delta", amount: "1", id: "d" },
		]);
		expect(
			w.findAll("tbody tr").map((tr) => tr.attributes("data-row-key"))
		).toEqual(["a", "b", "c", "d"]);
		expect(w.find('td[data-col-key="amount"]').classes()).toContain(
			"numeric"
		);
		expect(header(w, "amount").classes()).toContain("numeric");
		expect(header(w, "id").find("button").exists()).toBe(false);
	});

	it("cycles descend → ascend → none on header clicks, with aria-sort", async () => {
		const w = mountTable();
		const button = header(w, "amount").find("button");
		expect(header(w, "amount").attributes("aria-sort")).toBe("none");

		await button.trigger("click");
		expect(ids(w)).toEqual(["c", "a", "d", "b"]);
		expect(header(w, "amount").attributes("aria-sort")).toBe("descending");

		await button.trigger("click");
		// empty values first when ascending
		expect(ids(w)).toEqual(["b", "d", "a", "c"]);
		expect(header(w, "amount").attributes("aria-sort")).toBe("ascending");

		await button.trigger("click");
		expect(ids(w)).toEqual(["a", "b", "c", "d"]);
		expect(header(w, "amount").attributes("aria-sort")).toBe("none");
	});

	it("v-model:sort lets a parent own the sort", async () => {
		const sort = ref({ key: "amount", order: "ascend" as const });
		const wrapper = mountTable({
			sort: sort.value,
			"onUpdate:sort": (v: typeof sort.value) => (sort.value = v),
		});
		expect(ids(wrapper)).toEqual(["b", "d", "a", "c"]);
		expect(header(wrapper, "amount").attributes("aria-sort")).toBe(
			"ascending"
		);

		await header(wrapper, "name").find("button").trigger("click");
		expect(sort.value).toEqual({ key: "name", order: "descend" });
	});

	it("sortRows sorts like the table, a copy, or the rows as they are", () => {
		const sorted = sortRows(DATA, COLUMNS, {
			key: "amount",
			order: "descend",
		});
		expect(sorted.map((r) => r.id)).toEqual(["c", "a", "d", "b"]);
		expect(sorted).not.toBe(DATA);
		expect(sortRows(DATA, COLUMNS, { key: null, order: false })).toBe(DATA);
		// a column without a sorter doesn't sort
		expect(sortRows(DATA, COLUMNS, { key: "id", order: "ascend" })).toBe(
			DATA
		);
	});

	it("starts another column at descend", async () => {
		const w = mountTable();
		await header(w, "amount").find("button").trigger("click");
		await header(w, "amount").find("button").trigger("click");
		await header(w, "name").find("button").trigger("click");
		// strings by localeCompare: case-insensitive order
		expect(ids(w)).toEqual(["c", "d", "a", "b"]);
		expect(header(w, "amount").attributes("aria-sort")).toBe("none");
		expect(header(w, "name").attributes("aria-sort")).toBe("descending");
	});

	it("sorts by keyboard: the header is a button", async () => {
		const w = mountTable({}, {});
		const button = header(w, "name").find("button");
		expect(button.attributes("type")).toBe("button");
		// Enter and Space on a native button fire click
		await button.trigger("click");
		expect(header(w, "name").attributes("aria-sort")).toBe("descending");
	});

	it("applies defaultSortOrder and a custom sorter", async () => {
		const byAmount = vi.fn(
			(a: Row, b: Row) => (a.amount ?? 0) - (b.amount ?? 0)
		);
		const w = mountTable({
			columns: [
				{
					key: "name",
					title: "Name",
					sorter: byAmount,
					defaultSortOrder: "ascend",
				},
				{ key: "id", title: "Id" },
			],
		});
		expect(ids(w)).toEqual(["b", "d", "a", "c"]);
		expect(header(w, "name").attributes("aria-sort")).toBe("ascending");
		expect(byAmount).toHaveBeenCalled();
		// ascend → none
		await header(w, "name").find("button").trigger("click");
		expect(ids(w)).toEqual(["a", "b", "c", "d"]);
	});

	it("paginates and keeps the page within bounds", async () => {
		const data = Array.from({ length: 120 }, (_, i) => ({
			id: `r${i}`,
			name: `n${i}`,
			amount: i,
		}));
		const w = mountTable({ data, pageSize: 50 });
		expect(tableRows(w)).toHaveLength(50);
		const pages = w.findAll("nav button");
		// previous, 1, 2, 3, next
		expect(pages).toHaveLength(5);
		expect(pages[0].attributes("disabled")).toBeDefined();
		await pages[3].trigger("click");
		expect(ids(w)[0]).toBe("r100");
		expect(tableRows(w)).toHaveLength(20);
		expect(w.findAll("nav button")[4].attributes("disabled")).toBeDefined();
	});

	it("toggles expanded rows through the expand button and v-model", async () => {
		const expanded = ref<(string | number)[]>([]);
		const w = mountTable(
			{
				get expandedRowKeys() {
					return expanded.value;
				},
				"onUpdate:expandedRowKeys": (k: (string | number)[]) =>
					(expanded.value = k),
				expandLabel: (r: Row) => `Details ${r.name}`,
			},
			{
				expand: ({ row }: { row: Row }) =>
					h("p", { class: "detail" }, `detail ${row.id}`),
			}
		);
		const buttons = w.findAll("tbody button[aria-expanded]");
		expect(buttons).toHaveLength(4);
		expect(buttons[1].attributes("aria-label")).toBe("Details alpha");
		await buttons[1].trigger("click");
		expect(expanded.value).toEqual(["b"]);
		await flushPromises();
		expect(w.find(".detail").text()).toBe("detail b");
		expect(
			w.find(".detail").element.closest("td")!.getAttribute("colspan")
		).toBe("4");
		// detail rows are not data rows
		expect(tableRows(w)).toHaveLength(4);
	});

	it("renders cell and header slots, summary and empty", async () => {
		const w = mountTable(
			{},
			{
				"cell-name": ({ row }: { row: Row }) =>
					h("b", row.name.toUpperCase()),
				"header-id": () => h("i", "#"),
				summary: () => h("span", { class: "sum" }, "total"),
			}
		);
		expect(w.find('td[data-col-key="name"] b').text()).toBe("BETA");
		expect(header(w, "id").text()).toBe("#");
		expect(w.find("tfoot .sum").text()).toBe("total");
		expect(w.find("tfoot td").attributes("colspan")).toBe("3");

		const empty = mountTable(
			{ data: [] },
			{ empty: () => h("p", { class: "none" }, "nothing") }
		);
		expect(empty.find(".none").text()).toBe("nothing");
		expect(empty.find("tfoot").exists()).toBe(false);
		expect(mountTable({ data: [] }).text()).toContain(
			"common.ui.table.no_data"
		);
	});

	it("groups headers and spans titles", () => {
		const w = mountTable({
			columns: [
				{ key: "id", title: "Id" },
				{
					key: "group",
					title: "Group",
					children: [
						{ key: "name", title: "Name", sorter: true },
						{ key: "amount", title: "Amount" },
					],
				},
			],
		});
		const rows = w.findAll("thead tr");
		expect(rows).toHaveLength(2);
		expect(header(w, "id").attributes("rowspan")).toBe("2");
		expect(header(w, "group").attributes("colspan")).toBe("2");
		expect(
			rows[1].findAll("th").map((th) => th.attributes("data-col-key"))
		).toEqual(["name", "amount"]);
		expect(Object.keys(tableRows(w)[0])).toEqual(["id", "name", "amount"]);

		const spanned = mountTable({
			columns: [
				{ key: "name", title: "Flow", titleColSpan: 2 },
				{ key: "amount" },
				{ key: "id", title: "Id" },
			],
		});
		expect(
			spanned
				.findAll("thead th")
				.map((th) => th.attributes("data-col-key"))
		).toEqual(["name", "id"]);
		expect(header(spanned, "name").attributes("colspan")).toBe("2");
	});

	it("makes rows clickable by mouse and keyboard with rowClick", async () => {
		const rowClick = vi.fn();
		const w = mountTable({ rowClick });
		const tr = w.findAll("tbody tr")[2];
		expect(tr.attributes("tabindex")).toBe("0");
		await tr.trigger("click");
		await tr.trigger("keydown", { key: "Enter" });
		await tr.trigger("keydown", { key: " " });
		expect(rowClick.mock.calls.map((c) => c[0].id)).toEqual([
			"c",
			"c",
			"c",
		]);
		// keys inside a cell's own control stay with it
		await tr.find("td").trigger("keydown", { key: "Enter" });
		expect(rowClick).toHaveBeenCalledTimes(3);
		expect(
			mountTable().find("tbody tr").attributes("tabindex")
		).toBeUndefined();
	});

	it("stripes odd rows and sets the box height", () => {
		const w = mountTable({ striped: true, maxHeight: 300 });
		expect(
			w
				.findAll("tbody tr")
				.map((tr) => tr.classes().includes("p-data-table-striped"))
		).toEqual([false, true, false, true]);
		// 300 px body + the header (no layout in jsdom: 0) + the border
		expect(w.find(".p-data-table-box").attributes("style")).toContain(
			"max-height: calc(302px)"
		);
	});

	it("renders only the rows in view when virtual, in sort order", async () => {
		const data = Array.from({ length: 1000 }, (_, i) => ({
			id: `r${i}`,
			name: `n${i}`,
			amount: i,
		}));
		const w = mountTable({
			data,
			virtual: true,
			maxHeight: 400,
			striped: true,
		});
		const rendered = () => w.findAll("tbody tr[data-row-key]");
		const spacers = () =>
			w
				.findAll("tbody tr.p-data-table-spacer td")
				.map((td) => td.attributes("style"));

		// jsdom has no layout: an 800 px view of 34 px rows, plus a margin
		expect(rendered().length).toBeGreaterThan(20);
		expect(rendered().length).toBeLessThan(40);
		expect(ids(w)[0]).toBe("r0");
		expect(spacers()).toEqual([expect.stringMatching(/^height: \d+px;$/)]);

		const box = w.find(".p-data-table-box");
		(box.element as HTMLElement).scrollTop = 34 * 500;
		await box.trigger("scroll");
		const first = Number(ids(w)[0].slice(1));
		expect(first).toBeGreaterThan(490);
		expect(first).toBeLessThan(500);
		// stripes follow the row's place in the data, not in the window
		expect(rendered()[0].classes().includes("p-data-table-striped")).toBe(
			first % 2 === 1
		);
		expect(spacers()).toHaveLength(2);

		// sorting applies to all rows, not just the window
		await header(w, "amount").find("button").trigger("click");
		expect(Number(ids(w)[0].slice(1))).toBe(999 - first);
		expect(tableRows(w).length).toBe(rendered().length);
	});

	it("doesn't re-render on a scroll inside the window when virtual", async () => {
		const data = Array.from({ length: 1000 }, (_, i) => ({
			id: `r${i}`,
			name: `n${i}`,
			amount: i,
		}));
		let renders = 0;
		const w = mountTable(
			{ data, virtual: true, maxHeight: 400 },
			{ "cell-name": ({ row }: { row: Row }) => (renders++, row.name) }
		);
		const box = w.find(".p-data-table-box");
		const scrollTo = async (top: number) => {
			(box.element as HTMLElement).scrollTop = top;
			await box.trigger("scroll");
		};

		const before = renders;
		await scrollTo(5);
		expect(renders).toBe(before);
		expect(ids(w)[0]).toBe("r0");

		// a scroll to other rows still renders them
		await scrollTo(34 * 500);
		expect(renders).toBeGreaterThan(before);
	});

	it("renders every row without a height limit, even when virtual", () => {
		const data = Array.from({ length: 200 }, (_, i) => ({
			id: `r${i}`,
			name: `n${i}`,
			amount: i,
		}));
		expect(
			mountTable({ data, virtual: true }).findAll(
				"tbody tr[data-row-key]"
			)
		).toHaveLength(200);
	});

	it("narrows the cell padding with dense", () => {
		expect(mountTable().classes()).not.toContain("p-data-table-dense");
		expect(mountTable({ dense: true }).classes()).toContain(
			"p-data-table-dense"
		);
	});

	it("pins the expand column and the first column with stickyFirst", () => {
		const sticky = (w: ReturnType<typeof mountTable>) =>
			w.findAll(".p-data-table-sticky");
		expect(sticky(mountTable())).toHaveLength(0);

		const plain = mountTable({ stickyFirst: true });
		// header and four rows, the first column only
		expect(sticky(plain)).toHaveLength(5);
		expect(header(plain, "name").attributes("style")).toContain("left: 0px");

		const expandable = mountTable(
			{ stickyFirst: true },
			{ expand: () => h("p", "detail") }
		);
		// the expand cell and the first column, in the header and four rows
		expect(sticky(expandable)).toHaveLength(10);
		expect(header(expandable, "name").attributes("style")).toContain(
			"left: 48px"
		);
		expect(
			expandable.find("td[data-col-key='name']").attributes("style")
		).toContain("left: 48px");
	});

	it("sets pixel widths on the header, keeps percentages on the col", () => {
		const w = mountTable({
			columns: [
				{ key: "name", title: "Name", width: 120 },
				{ key: "amount", title: "Amount", width: "30%" },
				{ key: "id", title: "Id" },
			],
		});

		expect(header(w, "name").attributes("style")).toContain("width: 120px");
		expect(header(w, "amount").attributes("style") ?? "").not.toContain(
			"width: 30%"
		);
		const cols = w.findAll("col").map((c) => c.attributes("style"));
		expect(cols[1]).toContain("width: 30%");
	});

	it("aligns cells and titles to the centre or independently", () => {
		const w = mountTable({
			columns: [
				{ key: "name", title: "Name", align: "center" },
				{
					key: "amount",
					title: "Amount",
					align: "right",
					titleAlign: "center",
				},
				{ key: "id", title: "Id", align: "left" },
			],
		});

		expect(header(w, "name").classes()).toContain("text-center");
		expect(w.find('td[data-col-key="name"]').classes()).toContain(
			"text-center"
		);
		expect(header(w, "amount").classes()).toContain("text-center");
		expect(w.find('td[data-col-key="amount"]').classes()).toContain(
			"numeric"
		);
		expect(header(w, "id").classes()).not.toContain("numeric");
		expect(header(w, "id").classes()).not.toContain("text-center");
	});

	it("keeps empty values together and mixed types in place when sorting", async () => {
		const data = [
			{ id: "a", name: "x", amount: null },
			{ id: "b", name: "y", amount: undefined },
			{ id: "c", name: "z", amount: 3 },
			{ id: "d", name: "w", amount: "text" },
		] as unknown as Row[];
		const w = mountTable({ data });
		const button = header(w, "amount").find("button");

		await button.trigger("click");
		// descend: a number against a string compares equal, empties last
		const descending = ids(w);
		expect(descending.slice(-2).sort()).toEqual(["a", "b"]);
		// the two empties keep their order
		expect(descending.slice(-2)).toEqual(["a", "b"]);

		await button.trigger("click");
		expect(ids(w).slice(0, 2)).toEqual(["a", "b"]);
	});

	it("falls back to the row index as key without rowKey", () => {
		const w = mountTable({ rowKey: undefined });

		expect(
			w.findAll("tbody tr").map((tr) => tr.attributes("data-row-key"))
		).toEqual(["0", "1", "2", "3"]);
	});

	it("applies a row class string or function to every row", () => {
		const text = mountTable({ rowClass: "marked" });
		expect(text.findAll("tbody tr.marked")).toHaveLength(4);

		const fn = mountTable({
			rowClass: (row: Row, index: number) => `row-${row.id}-${index}`,
		});
		expect(
			fn.findAll("tbody tr").map((tr) => tr.classes().join(" "))
		).toEqual(["row-a-0", "row-b-1", "row-c-2", "row-d-3"]);
	});

	it("sets the layout classes for fill, popover and a windowed table", () => {
		const fill = mountTable({ fill: true, popover: true });
		expect(fill.classes()).toEqual(
			expect.arrayContaining(["h-full", "flex", "p-data-table-popover"])
		);
		expect(fill.find(".p-data-table-box").classes()).toContain("basis-0");
		expect(fill.find("table").classes()).toContain("table-fixed");

		const plain = mountTable();
		expect(plain.classes()).not.toContain("h-full");
		expect(plain.find(".p-data-table-box").classes()).not.toContain(
			"basis-0"
		);

		// a windowed table under a max height drops the row borders
		const limited = mountTable({ virtual: true, maxHeight: 300 });
		expect(limited.classes()).toContain("p-data-table-borderless");
		const filled = mountTable({ virtual: true, fill: true });
		expect(filled.classes()).not.toContain("p-data-table-borderless");
	});

	it("collapses an expanded row and names the button by default", async () => {
		const expanded = ref<(string | number)[]>(["a", "c"]);
		const w = mountTable(
			{
				striped: true,
				get expandedRowKeys() {
					return expanded.value;
				},
				"onUpdate:expandedRowKeys": (k: (string | number)[]) =>
					(expanded.value = k),
			},
			{
				expand: ({ row }: { row: Row }) =>
					h("p", { class: "detail" }, `detail ${row.id}`),
			}
		);

		expect(
			w.find("tbody button[aria-expanded]").attributes("aria-label")
		).toBe("common.ui.table.expand_row");
		expect(w.findAll(".detail").map((d) => d.text())).toEqual([
			"detail a",
			"detail c",
		]);

		await w.findAll("tbody button[aria-expanded]")[0].trigger("click");
		expect(expanded.value).toEqual(["c"]);
		await flushPromises();
		expect(w.findAll(".detail").map((d) => d.text())).toEqual(["detail c"]);
	});

	it("stripes the detail row of an odd row", () => {
		const w = mountTable(
			{ striped: true, expandedRowKeys: ["b"] },
			{ expand: () => h("p", "detail") }
		);

		expect(w.find("tr.p-data-table-expanded").classes()).toContain(
			"p-data-table-striped"
		);
	});

	describe("measuring", () => {
		afterEach(() => vi.restoreAllMocks());

		const observers: {
			callback: () => void;
			observe: ReturnType<typeof vi.fn>;
		}[] = [];

		function stubObserver() {
			observers.length = 0;
			vi.stubGlobal(
				"ResizeObserver",
				class {
					observe = vi.fn();
					disconnect = vi.fn();
					constructor(public callback: () => void) {
						observers.push(this);
					}
				}
			);
		}

		function mountDirect(props: Record<string, unknown>) {
			const i18n = createI18n({
				legacy: false,
				locale: "en_US",
				missingWarn: false,
				fallbackWarn: false,
			});
			return mount(PDataTable as Component, {
				props: {
					columns: COLUMNS,
					data: DATA,
					rowKey: (r: Row) => r.id,
					...props,
				},
				global: { plugins: [i18n] },
			});
		}

		const frame = () =>
			new Promise((resolve) =>
				requestAnimationFrame(() => resolve(null))
			);

		// a measure re-renders, which measures again until the heights settle
		async function settle() {
			for (let i = 0; i < 3; i++) {
				await frame();
				await flushPromises();
			}
		}

		const many = (n: number) =>
			Array.from({ length: n }, (_, i) => ({
				id: `r${i}`,
				name: `n${i}`,
				amount: i,
			}));

		it("sizes the expanded and empty boxes like the table box", async () => {
			stubObserver();
			vi.spyOn(
				HTMLElement.prototype,
				"clientWidth",
				"get"
			).mockReturnValue(640);
			const expand = mountDirect({ expandedRowKeys: ["a"] });
			// no expand slot: nothing to size
			expect(observers).toHaveLength(1);
			expect(observers[0].observe).not.toHaveBeenCalled();

			const withSlot = mountTable(
				{ expandedRowKeys: ["a"] },
				{ expand: () => h("p", "detail") }
			);
			await flushPromises();
			const observer = observers.at(-1)!;
			expect(observer.observe).toHaveBeenCalledOnce();
			expect(
				withSlot.find(".p-data-table-expand").attributes("style")
			).toBeUndefined();
			observer.callback();
			await flushPromises();
			expect(
				withSlot.find(".p-data-table-expand").attributes("style")
			).toContain("width: 640px");
			expect(expand.exists()).toBe(true);

			const empty = mountDirect({ data: [] });
			await flushPromises();
			observers.at(-1)!.callback();
			await flushPromises();
			expect(
				empty.find(".p-data-table-empty").attributes("style")
			).toContain("width: 640px");
		});

		it("adds the header height to the max height", async () => {
			stubObserver();
			vi.spyOn(
				HTMLElement.prototype,
				"offsetHeight",
				"get"
			).mockReturnValue(40);
			const w = mountDirect({ maxHeight: "50vh" });
			await flushPromises();
			const observer = observers.at(-1)!;
			expect(observer.observe).toHaveBeenCalledOnce();

			observer.callback();
			await flushPromises();

			expect(w.find(".p-data-table-box").attributes("style")).toContain(
				"calc(42px + 50vh)"
			);
		});

		it("renders only the rows that fit the measured view when virtual", async () => {
			stubObserver();
			const w = mountDirect({
				data: many(1000),
				virtual: true,
				fill: true,
			});
			const rendered = () => w.findAll("tbody tr[data-row-key]").length;
			await flushPromises();
			const before = rendered();

			vi.spyOn(
				HTMLElement.prototype,
				"clientHeight",
				"get"
			).mockReturnValue(100);
			observers.at(-1)!.callback();
			await flushPromises();

			// 100 px view + overscan instead of the 800 px fallback
			expect(rendered()).toBeLessThan(before);
		});

		it("works without a ResizeObserver", () => {
			vi.stubGlobal("ResizeObserver", undefined);
			const w = mountDirect({ maxHeight: 200 });

			expect(w.findAll("tbody tr[data-row-key]")).toHaveLength(4);
		});

		it("measures the rendered rows and windows with their heights", async () => {
			vi.spyOn(
				HTMLElement.prototype,
				"offsetHeight",
				"get"
			).mockReturnValue(50);
			const w = mountDirect({
				data: many(1000),
				virtual: true,
				maxHeight: 400,
			});
			const rendered = () => w.findAll("tbody tr[data-row-key]").length;
			const before = rendered();

			await settle();

			// 50 px rows: fewer of them fill the view, the rest is spacer
			const after = rendered();
			expect(after).toBeLessThan(before);
			const spacer = w.find("tbody tr.p-data-table-spacer td");
			expect(spacer.attributes("style")).toContain(
				`height: ${(1000 - after) * 50}px`
			);
		});

		it("leaves the window alone when the rows have no height yet", async () => {
			const w = mountDirect({
				data: many(1000),
				virtual: true,
				maxHeight: 400,
			});
			const before = w.findAll("tbody tr[data-row-key]").length;

			await frame();
			await flushPromises();

			expect(w.findAll("tbody tr[data-row-key]")).toHaveLength(before);
		});

		it("keeps the average when the measured rows match it", async () => {
			vi.spyOn(
				HTMLElement.prototype,
				"offsetHeight",
				"get"
			).mockReturnValue(34);
			const w = mountDirect({
				data: many(1000),
				virtual: true,
				maxHeight: 400,
			});
			const before = w.findAll("tbody tr[data-row-key]").length;

			await frame();
			await flushPromises();

			expect(w.findAll("tbody tr[data-row-key]")).toHaveLength(before);
		});

		it("skips a pending measure when the table stops being windowed", async () => {
			vi.spyOn(
				HTMLElement.prototype,
				"offsetHeight",
				"get"
			).mockReturnValue(50);
			const w = mountDirect({
				data: many(60),
				virtual: true,
				maxHeight: 400,
			});
			await flushPromises();
			await w.setProps({ virtual: false });

			await frame();
			await flushPromises();

			expect(w.findAll("tbody tr[data-row-key]")).toHaveLength(60);
			expect(w.find("tbody tr.p-data-table-spacer").exists()).toBe(false);
		});

		it("ignores scrolling when it isn't windowed", async () => {
			const w = mountDirect({ data: many(100), maxHeight: 400 });
			const box = w.find(".p-data-table-box");

			(box.element as HTMLElement).scrollTop = 34 * 50;
			await box.trigger("scroll");

			expect(w.findAll("tbody tr[data-row-key]")).toHaveLength(100);
			expect(
				w.find("tbody tr[data-row-key]").attributes("data-row-key")
			).toBe("r0");
		});
	});
});
