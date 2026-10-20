import { beforeEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import KitView from "@/views/dev/KitView.vue";
import {
	PCheckbox,
	PInput,
	PInputNumber,
	PSelect,
	PSelectMultiple,
	PTag,
} from "@/ui";
import { toasts } from "@/ui/useToast";
import { mountComponent, tableRows } from "@/tests/mountComponent";

const head = vi.hoisted(() => ({ useHead: vi.fn() }));
vi.mock("@unhead/vue", () => head);

interface ITag {
	closable?: boolean;
	value?: string;
}

const body = () => new DOMWrapper(document.body);

async function mountKit() {
	const { wrapper } = await mountComponent(KitView, {}, { withDialog: true });
	return wrapper;
}

/** the kit's buttons by their label */
const button = (w: VueWrapper | DOMWrapper<Element>, label: string) =>
	w.findAll("button").find((b) => b.text() === label)!;

async function click(el: DOMWrapper<Element>) {
	await el.trigger("click");
	await flushPromises();
}

beforeEach(() => {
	toasts.value = [];
	head.useHead.mockClear();
});

describe("KitView", () => {
	it("sets the page title", async () => {
		await mountKit();

		expect(head.useHead).toHaveBeenCalledWith({
			title: "UI kit",
		});
	});

	describe("buttons", () => {
		it("shows every colour in both sizes, plus the states", async () => {
			const w = await mountKit();

			for (const type of [
				"primary",
				"secondary",
				"success",
				"warning",
				"error",
				"ghost",
			])
				for (const size of ["md", "sm"])
					expect(button(w, `${type} ${size}`).exists()).toBe(true);
			expect(button(w, "disabled").attributes("disabled")).toBeDefined();
			expect(w.find("button[aria-label=Save]").exists()).toBe(true);
		});

		it("presses one view button at a time", async () => {
			const w = await mountKit();
			const pressed = () =>
				["List", "Matrix", "Chart"].filter(
					(v) => button(w, v).attributes("aria-pressed") === "true"
				);
			expect(pressed()).toEqual(["List"]);

			await click(button(w, "Chart"));
			expect(pressed()).toEqual(["Chart"]);

			await click(button(w, "Matrix"));
			expect(pressed()).toEqual(["Matrix"]);
		});

		it("toggles the consumables button", async () => {
			const w = await mountKit();
			const consumables = button(w, "Show consumables");
			expect(consumables.attributes("aria-pressed")).toBe("true");

			await click(consumables);
			expect(consumables.attributes("aria-pressed")).toBe("false");

			await click(consumables);
			expect(consumables.attributes("aria-pressed")).toBe("true");
		});
	});

	describe("fields", () => {
		it("shares one text value between the text fields", async () => {
			const w = await mountKit();
			const texts = () =>
				w
					.findAll(
						"input[aria-label='Text md'], input[aria-label='Text sm']"
					)
					.map((i) => (i.element as HTMLInputElement).value);
			expect(texts()).toHaveLength(2);
			expect(new Set(texts())).toEqual(new Set(["Text"]));

			await w.find("input[aria-label='Text md']").setValue("Changed");

			expect(new Set(texts())).toEqual(new Set(["Changed"]));
		});

		it("shares one amount between the number fields", async () => {
			const w = await mountKit();
			const amounts = () =>
				w
					.findAllComponents(PInputNumber)
					.filter((i) => !i.props("disabled"))
					.map((i) => i.props("value"));
			expect(new Set(amounts())).toEqual(new Set([5]));

			w.findAllComponents(PInputNumber)[0].vm.$emit("update:value", 42);
			await flushPromises();

			expect(new Set(amounts())).toEqual(new Set([42]));
		});

		it("shares the checkbox states", async () => {
			const w = await mountKit();
			const labelled = (text: string) =>
				w.findAllComponents(PCheckbox).filter((c) => c.text() === text);
			expect(labelled("Checked").every((c) => c.props("checked"))).toBe(
				true
			);
			expect(
				labelled("Unchecked").every((c) => !c.props("checked"))
			).toBe(true);

			await labelled("Unchecked")[0].find("input").setValue(true);

			// the indeterminate "Some" boxes follow the same value
			expect(
				[...labelled("Unchecked"), ...labelled("Some")].every((c) =>
					c.props("checked")
				)
			).toBe(true);
		});

		it("selects in the shared single and multiple selects", async () => {
			const w = await mountKit();
			const selects = w
				.findAllComponents(PSelect)
				.filter((s) =>
					s.attributes("aria-label")?.startsWith("Exchange ")
				);
			expect(selects.length).toBeGreaterThan(0);

			selects[0].vm.$emit("update:value", "NC1");
			await flushPromises();
			for (const s of selects) expect(s.props("value")).toBe("NC1");

			const multiple = w
				.findAllComponents(PSelectMultiple)
				.find((s) => s.attributes("aria-label") === "Exchanges md")!;
			expect(multiple.props("value")).toEqual(["AI1", "IC1"]);
			multiple.vm.$emit("update:value", ["CI1"]);
			await flushPromises();
			expect(multiple.props("value")).toEqual(["CI1"]);
		});

		it("fills the empty fields on input", async () => {
			const w = await mountKit();
			const search = w.find("input[aria-label=Search]");
			const empties = () =>
				w
					.findAll("input[aria-label^='Empty ']")
					.map((i) => (i.element as HTMLInputElement).value);
			expect(new Set(empties())).toEqual(new Set([""]));

			await search.setValue("iron");

			expect((search.element as HTMLInputElement).value).toBe("iron");
			expect(new Set(empties())).toEqual(new Set(["iron"]));
		});

		it("writes every field back to its model", async () => {
			const w = await mountKit();
			const fields = [
				[PInput, "value", "typed"],
				[PInputNumber, "value", 7],
				[PSelect, "value", "NC1"],
				[PSelectMultiple, "value", ["NC1"]],
				[PCheckbox, "checked", true],
			] as const;

			let driven = 0;
			for (const [component, prop, value] of fields) {
				for (const field of w.findAllComponents(
					component as never
				) as VueWrapper[]) {
					field.vm.$emit(`update:${prop}`, value);
					await flushPromises();
					expect(
						(field.props() as Record<string, unknown>)[prop]
					).toEqual(value);
					driven++;
				}
			}

			expect(driven).toBeGreaterThan(30);
		});

		it.each([
			["Popover", "Exchange in popover"],
			["Modal", "Exchange in modal"],
			["Drawer", "Material in drawer"],
		])("writes the select in the %s back", async (opener, label) => {
			const w = await mountKit();
			await click(button(w, opener));
			const select = w
				.findAllComponents(PSelect)
				.find((s) => s.attributes("aria-label") === label)!;

			select.vm.$emit("update:value", "NC1");
			await flushPromises();

			expect((select.props() as { value: string }).value).toBe("NC1");
		});

		it("shows the form item error and info text", async () => {
			const w = await mountKit();

			expect(w.text()).toContain("No material with this ticker");
			expect(w.text()).toContain("Between 0 and 100.");
		});
	});

	describe("tags", () => {
		it("closes only the tag whose close button was used", async () => {
			const w = await mountKit();
			const section = w
				.findAll("section")
				.find((s) => s.find("h2").text() === "PTag")!;
			const closable = () =>
				section
					.findAllComponents(PTag)
					.filter((t: VueWrapper) => (t.props() as ITag).closable);
			// three tags in each of the two sizes
			expect(
				closable().map((t: VueWrapper) => (t.props() as ITag).value)
			).toEqual(["AI1", "CI1", "IC1", "AI1", "CI1", "IC1"]);

			closable()[1].vm.$emit("close");
			await flushPromises();

			expect(
				closable().map((t: VueWrapper) => (t.props() as ITag).value)
			).toEqual(["AI1", "IC1", "AI1", "IC1"]);
		});
	});

	describe("overlays", () => {
		it("opens and closes the modal with Cancel and Save", async () => {
			const w = await mountKit();
			await click(button(w, "Modal"));
			let dialog = body().find("[role=dialog]");
			expect(dialog.text()).toContain("A select inside a modal:");

			await click(button(dialog, "Cancel"));
			expect(body().find("[role=dialog]").exists()).toBe(false);

			await click(button(w, "Modal"));
			dialog = body().find("[role=dialog]");
			await click(button(dialog, "Save"));
			expect(body().find("[role=dialog]").exists()).toBe(false);
		});

		it("closes the modal and the bottom sheet with Escape", async () => {
			const w = await mountKit();
			const escape = async () => {
				document.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "Escape",
						bubbles: true,
					})
				);
				await flushPromises();
			};

			await click(button(w, "Modal"));
			expect(body().find("[role=dialog]").exists()).toBe(true);
			await escape();
			expect(body().find("[role=dialog]").exists()).toBe(false);

			await click(button(w, "Bottom sheet"));
			expect(body().find("[role=dialog]").exists()).toBe(true);
			await escape();
			expect(body().find("[role=dialog]").exists()).toBe(false);
		});

		it("opens the drawer and the bottom sheet", async () => {
			const w = await mountKit();

			await click(button(w, "Drawer"));
			expect(body().find("[role=dialog]").text()).toContain(
				"A select inside a drawer:"
			);
			await click(
				body().find(
					"button[aria-label='common.ui.close']"
				) as DOMWrapper<Element>
			);
			expect(body().find("[role=dialog]").exists()).toBe(false);

			await click(button(w, "Bottom sheet"));
			const sheet = body().find("[role=dialog]");
			expect(sheet.attributes("data-placement")).toBe("bottom");
			expect(sheet.text()).toContain("A sheet from the bottom");
		});

		it("shows each tooltip text while hovering its trigger", async () => {
			const w = await mountKit();
			const hover = async (el: DOMWrapper<Element>) => {
				await new DOMWrapper(el.element.parentElement!).trigger(
					"mouseenter"
				);
				await flushPromises();
			};
			expect(body().find("[role=tooltip]").exists()).toBe(false);

			await hover(w.find("[aria-label=Info]"));
			expect(body().find("[role=tooltip]").text()).toBe(
				"Tooltip on an icon"
			);

			await hover(button(w, "Tooltip on a button"));
			expect(body().text()).toContain("The button keeps its own name");
		});

		it("opens the popover with its select", async () => {
			const w = await mountKit();

			await click(button(w, "Popover"));

			expect(body().text()).toContain("A select inside a popover:");
		});

		it("lists the dropdown options with a divider", async () => {
			const w = await mountKit();

			await click(button(w, "Dropdown"));

			expect(
				body()
					.findAll("[role=menuitem]")
					.map((o) => o.text())
			).toEqual(["Save", "CopyMakes a new plan", "Delete"]);
			expect(body().find("[role=separator]").exists()).toBe(true);
		});

		it("asks for a confirmation", async () => {
			const w = await mountKit();

			await click(button(w, "Confirm"));

			const dialog = body().find("[role=dialog]");
			expect(dialog.text()).toContain("Delete plan");
			expect(dialog.text()).toContain("This deletes the plan.");
			await click(button(dialog, "Cancel"));
			expect(body().find("[role=dialog]").exists()).toBe(false);
		});
	});

	describe("toasts", () => {
		it("shows a plain, an error and an undoable toast", async () => {
			const w = await mountKit();

			await click(button(w, "Toast"));
			await click(button(w, "Error toast"));
			await click(button(w, "Toast with action"));

			expect(toasts.value.map((t) => [t.text, t.type])).toEqual([
				["Plan saved", "info"],
				["Saving failed", "error"],
				["Plan deleted", "info"],
			]);
			const undo = toasts.value[2];
			expect(undo.closable).toBe(true);
			expect(undo.action?.label).toBe("Undo");
			// undoing is a demo: nothing happens, nothing throws
			expect(() => undo.action!.onClick()).not.toThrow();
		});
	});

	describe("tables", () => {
		it("renders the plain table with the first four rows", async () => {
			const w = await mountKit();

			const tables = w.findAll("table");
			const plain = tables[0];
			expect(plain.findAll("tbody tr")).toHaveLength(4);
			expect(
				plain.findAll("tbody tr").map((tr) => tr.find("td").text())
			).toEqual(["AL0", "FE1", "O2", "N3"]);
		});

		it("pages the data table by five rows and sorts by amount", async () => {
			const w = await mountKit();
			const table = w.find(".p-data-table");
			expect(tableRows(table)).toHaveLength(5);
			expect(tableRows(table)[0].ticker).toBe("AL0");

			const header = table.find("th[data-col-key=amount]");

			await header.find("button").trigger("click");
			expect(header.attributes("aria-sort")).toBe("descending");
			expect(tableRows(table).map((r) => r.amount)).toEqual([
				"94",
				"84",
				"74",
				"67",
				"57",
			]);

			await header.find("button").trigger("click");
			expect(header.attributes("aria-sort")).toBe("ascending");
			expect(tableRows(table).map((r) => r.amount)).toEqual([
				"0",
				"3",
				"10",
				"20",
				"30",
			]);
		});

		it("shows the delta as a value and expands a row's details", async () => {
			const w = await mountKit();
			const table = w.find(".p-data-table");

			// AL0: (0 * 13) % 21 - 10
			expect(tableRows(table)[0].delta).toBe("-10.00");

			const toggle = table.find("tbody tr[data-row-key] button");
			await toggle.trigger("click");
			expect(table.text()).toContain("Details of AL0");
		});
	});
});
