import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import {
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import ManageCX from "@/features/manage/components/ManageCX.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// test data
import cxList from "@/tests/test_data/api_data_cx_list.json";

const mock = new AxiosMockAdapter(apiService.client);

const LIST_URL = /planning\/cx\/$/;
const [REAL, SHARE] = cxList;
const deleteURL = (uuid: string) => new RegExp(`planning/cx/${uuid}/$`);

async function mountCX(cx = cxList.slice(0, 3)) {
	return mountComponent(ManageCX, { cx }, { withDialog: true });
}

function button(wrapper: VueWrapper, text: string) {
	const b = wrapper.findAll("button").find((b) => b.text() === text);
	expect(b).toBeDefined();
	return b!;
}

const createButton = (wrapper: VueWrapper) =>
	button(wrapper, "common.buttons.create");

async function typeName(wrapper: VueWrapper, name: string) {
	await wrapper.find("input").setValue(name);
	await flushPromises();
}

async function create(wrapper: VueWrapper, name: string) {
	await typeName(wrapper, name);
	await createButton(wrapper).trigger("click");
	await flushPromises();
}

/** the delete buttons are the only buttons in the table */
const deleteButtons = (wrapper: VueWrapper) =>
	wrapper.findAll('td[data-col-key="configuration"] button');

async function clickDelete(wrapper: VueWrapper, row: number) {
	await deleteButtons(wrapper).at(row)!.trigger("click");
	await flushPromises();
}

async function answerDialog(text: "Delete" | "Cancel") {
	const b = Array.from(
		document.body.querySelectorAll<HTMLButtonElement>(".n-dialog button")
	).find((b) => b.textContent?.trim() === text);
	expect(b).toBeDefined();
	b!.click();
	await flushPromises();
}

describe("ManageCX", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onGet(LIST_URL).reply(200, cxList);
	});

	it("lists the CX with their empire assignment", async () => {
		const { wrapper } = await mountCX();

		const rows = tableRows(wrapper);
		expect(rows.map((r) => r.cx_name)).toEqual([
			"PRUN CX REAL",
			"Share CX",
			"CX Norwick Scheme",
		]);
		// 3 and 2 empires, none for the last one
		expect(rows.map((r) => r.uuid)).toEqual([
			"common.buttons.yes (3)",
			"common.buttons.yes (2)",
			"common.buttons.no",
		]);
		expect(
			wrapper.findAllComponents(RouterLinkStub).at(1)!.props("to")
		).toBe(`/exchanges/${SHARE.uuid}`);
	});

	it("shows the empty state without CX", async () => {
		const { wrapper } = await mountCX([]);

		expect(tableRows(wrapper)).toHaveLength(0);
		expect(wrapper.text()).toContain("management.cx.table.nodata_title");
	});

	it("toggles the create form", async () => {
		const { wrapper } = await mountCX();
		const form = () => wrapper.find(".transition-all");

		expect(form().classes()).toContain("h-0");
		await button(wrapper, "management.cx.buttons.new_cx").trigger("click");
		expect(form().classes()).toContain("opacity-100");
		expect(form().classes()).not.toContain("h-0");

		await button(wrapper, "management.cx.buttons.new_cx").trigger("click");
		expect(form().classes()).toContain("h-0");
	});

	it("spins only the row being deleted", async () => {
		let answer!: () => void;
		mock.onDelete(deleteURL(SHARE.uuid)).reply(
			() => new Promise((r) => (answer = () => r([204])))
		);
		const { wrapper } = await mountCX();

		await clickDelete(wrapper, 1);
		await answerDialog("Delete");

		const busy = () =>
			deleteButtons(wrapper).map((b) => b.attributes("aria-busy"));
		expect(busy()).toEqual(["false", "true", "false"]);

		answer();
		await flushPromises();
		expect(busy()).toEqual(["false", "false", "false"]);
	});

	it("allows names of 1 to 100 characters", async () => {
		const { wrapper } = await mountCX();
		const disabled = () => createButton(wrapper).element.disabled;

		expect(disabled()).toBe(true);
		await typeName(wrapper, "A");
		expect(disabled()).toBe(false);
		await typeName(wrapper, "x".repeat(100));
		expect(disabled()).toBe(false);
		await typeName(wrapper, "x".repeat(101));
		expect(disabled()).toBe(true);
		await typeName(wrapper, "");
		expect(disabled()).toBe(true);
	});

	it("creates an empty CX and hands the reloaded list up", async () => {
		mock.onPost(LIST_URL).reply(200, { ...REAL, cx_name: "My new CX" });
		const { wrapper, component } = await mountCX();
		await button(wrapper, "management.cx.buttons.new_cx").trigger("click");

		await create(wrapper, "My new CX");

		expect(mock.history.post).toHaveLength(1);
		expect(JSON.parse(mock.history.post[0].data)).toEqual({
			cx_name: "My new CX",
			cx_data: {
				cx_empire: [],
				cx_planets: [],
				ticker_empire: [],
				ticker_planets: [],
			},
		});
		expect(mock.history.get).toHaveLength(1);
		expect(component.emitted("update:cxList")).toEqual([[cxList]]);

		// the form is reset and closed
		expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
			""
		);
		expect(wrapper.find(".transition-all").classes()).toContain("h-0");
		expect(createButton(wrapper).attributes("aria-busy")).toBe("false");
	});

	it("does not create with an invalid name", async () => {
		const { wrapper, component } = await mountCX();

		// the button is disabled, clicking it anyway does nothing
		await create(wrapper, "x".repeat(101));

		expect(mock.history.post).toHaveLength(0);
		expect(component.emitted("update:cxList")).toBeUndefined();
	});

	it("stops the create spinner when creating fails", async () => {
		mock.onPost(LIST_URL).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountCX();
		await button(wrapper, "management.cx.buttons.new_cx").trigger("click");

		await create(wrapper, "My new CX");

		expect(mock.history.post).toHaveLength(1);
		expect(component.emitted("update:cxList")).toBeUndefined();
		expect(createButton(wrapper).attributes("aria-busy")).toBe("false");
		// the form stays open to try again
		expect((wrapper.find("input").element as HTMLInputElement).value).toBe(
			"My new CX"
		);
		expect(wrapper.find(".transition-all").classes()).not.toContain("h-0");
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it("deletes a CX only after confirmation", async () => {
		mock.onDelete(deleteURL(SHARE.uuid)).reply(204);
		const { wrapper, component } = await mountCX();

		await clickDelete(wrapper, 1);
		expect(mock.history.delete).toHaveLength(0);

		await answerDialog("Delete");

		expect(mock.history.delete).toHaveLength(1);
		expect(mock.history.delete[0].url).toMatch(deleteURL(SHARE.uuid));
		expect(component.emitted("update:cxList")).toEqual([[cxList]]);
		expect(deleteButtons(wrapper).at(1)!.attributes("aria-busy")).toBe(
			"false"
		);
	});

	it("keeps the CX when the dialog is cancelled", async () => {
		const { wrapper, component } = await mountCX();

		await clickDelete(wrapper, 0);
		await answerDialog("Cancel");

		expect(mock.history.delete).toHaveLength(0);
		expect(component.emitted("update:cxList")).toBeUndefined();
	});

	it("keeps the list and stops the spinner when deleting fails", async () => {
		mock.onDelete(deleteURL(REAL.uuid)).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountCX();

		await clickDelete(wrapper, 0);
		await answerDialog("Delete");

		expect(mock.history.delete).toHaveLength(1);
		expect(mock.history.get).toHaveLength(0);
		expect(component.emitted("update:cxList")).toBeUndefined();
		expect(deleteButtons(wrapper).at(0)!.attributes("aria-busy")).toBe(
			"false"
		);
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});
});
