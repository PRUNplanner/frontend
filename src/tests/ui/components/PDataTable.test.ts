import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref, type Slots } from "vue";

import { createI18n } from "vue-i18n";

import PDataTable from "@/ui/components/PDataTable.vue";
// also unmounts after each test
import { tableRows } from "@/tests/mountComponent";
import type { PDataTableColumn } from "@/ui/ui.types";


interface Row { id: string; name: string; amount: number | null }

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

const ids = (w: ReturnType<typeof mountTable>) =>
	tableRows(w).map((r) => r.id);
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
		expect(w.findAll("tbody tr").map((tr) => tr.attributes("data-row-key"))).toEqual(["a", "b", "c", "d"]);
		expect(w.find('td[data-col-key="amount"]').classes()).toContain("numeric");
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
		const byAmount = vi.fn((a: Row, b: Row) => (a.amount ?? 0) - (b.amount ?? 0));
		const w = mountTable({
			columns: [
				{ key: "name", title: "Name", sorter: byAmount, defaultSortOrder: "ascend" },
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
		const data = Array.from({ length: 120 }, (_, i) => ({ id: `r${i}`, name: `n${i}`, amount: i }));
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
				"onUpdate:expandedRowKeys": (k: (string | number)[]) => (expanded.value = k),
				expandLabel: (r: Row) => `Details ${r.name}`,
			},
			{ expand: ({ row }: { row: Row }) => h("p", { class: "detail" }, `detail ${row.id}`) }
		);
		const buttons = w.findAll("tbody button[aria-expanded]");
		expect(buttons).toHaveLength(4);
		expect(buttons[1].attributes("aria-label")).toBe("Details alpha");
		await buttons[1].trigger("click");
		expect(expanded.value).toEqual(["b"]);
		await flushPromises();
		expect(w.find(".detail").text()).toBe("detail b");
		expect(w.find(".detail").element.closest("td")!.getAttribute("colspan")).toBe("4");
		// detail rows are not data rows
		expect(tableRows(w)).toHaveLength(4);
	});

	it("renders cell and header slots, summary and empty", async () => {
		const w = mountTable(
			{},
			{
				"cell-name": ({ row }: { row: Row }) => h("b", row.name.toUpperCase()),
				"header-id": () => h("i", "#"),
				summary: () => h("span", { class: "sum" }, "total"),
			}
		);
		expect(w.find('td[data-col-key="name"] b').text()).toBe("BETA");
		expect(header(w, "id").text()).toBe("#");
		expect(w.find("tfoot .sum").text()).toBe("total");
		expect(w.find("tfoot td").attributes("colspan")).toBe("3");

		const empty = mountTable({ data: [] }, { empty: () => h("p", { class: "none" }, "nothing") });
		expect(empty.find(".none").text()).toBe("nothing");
		expect(empty.find("tfoot").exists()).toBe(false);
		expect(mountTable({ data: [] }).text()).toContain("common.ui.table.no_data");
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
		expect(rows[1].findAll("th").map((th) => th.attributes("data-col-key"))).toEqual(["name", "amount"]);
		expect(Object.keys(tableRows(w)[0])).toEqual(["id", "name", "amount"]);

		const spanned = mountTable({
			columns: [
				{ key: "name", title: "Flow", titleColSpan: 2 },
				{ key: "amount" },
				{ key: "id", title: "Id" },
			],
		});
		expect(spanned.findAll("thead th").map((th) => th.attributes("data-col-key"))).toEqual(["name", "id"]);
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
		expect(rowClick.mock.calls.map((c) => c[0].id)).toEqual(["c", "c", "c"]);
		// keys inside a cell's own control stay with it
		await tr.find("td").trigger("keydown", { key: "Enter" });
		expect(rowClick).toHaveBeenCalledTimes(3);
		expect(mountTable().find("tbody tr").attributes("tabindex")).toBeUndefined();
	});

	it("stripes odd rows and sets the box height", () => {
		const w = mountTable({ striped: true, maxHeight: 300 });
		expect(w.findAll("tbody tr").map((tr) => tr.classes().includes("p-data-table-striped"))).toEqual([false, true, false, true]);
		// 300 px body + the header (no layout in jsdom: 0) + the border
		expect(w.find(".p-data-table-box").attributes("style")).toContain("max-height: calc(302px)");
	});

	it("renders only the rows in view when virtual, in sort order", async () => {
		const data = Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}`, name: `n${i}`, amount: i }));
		const w = mountTable({ data, virtual: true, maxHeight: 400, striped: true });
		const rendered = () => w.findAll("tbody tr[data-row-key]");
		const spacers = () => w.findAll("tbody tr.p-data-table-spacer td").map((td) => td.attributes("style"));

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
		expect(rendered()[0].classes().includes("p-data-table-striped")).toBe(first % 2 === 1);
		expect(spacers()).toHaveLength(2);

		// sorting applies to all rows, not just the window
		await header(w, "amount").find("button").trigger("click");
		expect(Number(ids(w)[0].slice(1))).toBe(999 - first);
		expect(tableRows(w).length).toBe(rendered().length);
	});

	it("renders every row without a height limit, even when virtual", () => {
		const data = Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, name: `n${i}`, amount: i }));
		expect(mountTable({ data, virtual: true }).findAll("tbody tr[data-row-key]")).toHaveLength(200);
	});
});
