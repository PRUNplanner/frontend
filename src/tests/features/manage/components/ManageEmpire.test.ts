import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import ManageEmpire from "@/features/manage/components/ManageEmpire.vue";
import PInput from "@/ui/components/PInput.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// test data
import empireList from "@/tests/test_data/api_data_empire_list.json";
import cxList from "@/tests/test_data/api_data_cx_list.json";

const mock = new AxiosMockAdapter(apiService.client);

// payloads are validated as uuids
const uuid = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const [E1, E2, CX1, CX2] = [1, 2, 3, 4].map(uuid);

const empire = (
	id: string,
	name: string,
	faction: string,
	used: number,
	total: number,
	planCount: number
) => ({
	uuid: id,
	empire_name: name,
	empire_faction: faction,
	empire_permits_used: used,
	empire_permits_total: total,
	plans: Array.from({ length: planCount }, (_, i) => ({
		uuid: uuid(i),
		plan_name: `Plan ${i}`,
		planet_natural_id: "ZV-307c",
	})),
});
// passed unsorted, the table sorts by name
const EMPIRES = [
	empire(E2, "Beta", "NONE", 1, 2, 0),
	empire(E1, "Alpha", "MORIA", 3, 5, 2),
];

const cx = (id: string, name: string, empires: string[]) => ({
	uuid: id,
	cx_name: name,
	cx_data: {
		cx_empire: [],
		cx_planets: [],
		ticker_empire: [],
		ticker_planets: [],
	},
	empires: empires.map((e) => ({ uuid: e })),
});
const CXS = [cx(CX1, "Main CX", [E1]), cx(CX2, "Alt CX", [])];

async function mountEmpire(empires = EMPIRES, cxs = CXS) {
	return mountComponent(
		ManageEmpire,
		{ empires, cx: cxs },
		{ withDialog: true }
	);
}

function button(wrapper: VueWrapper, label: string) {
	const found = wrapper.findAll("button").find((b) => b.text() === label);
	expect(found).toBeDefined();
	return found!;
}

/** CX select per table row */
const cxSelects = (wrapper: VueWrapper) =>
	wrapper
		.findAll('td[data-col-key="cx"]')
		.map((td) => td.findComponent(PSelect));

/** name, permits total, permits used of the create form */
async function fillCreate(
	wrapper: VueWrapper,
	name: string,
	total: number,
	used: number
) {
	await wrapper.findComponent(PInput).find("input").setValue(name);
	const [inputTotal, inputUsed] = wrapper
		.findAllComponents(PInputNumber)
		.map((c) => c.find("input"));
	await inputTotal.setValue(String(total));
	await inputUsed.setValue(String(used));
}

const createDisabled = (wrapper: VueWrapper) =>
	button(wrapper, "common.buttons.create").attributes("disabled") !==
	undefined;

describe("ManageEmpire", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onGet(/planning\/empire\/$/).reply(200, empireList);
		mock.onGet(/planning\/cx\/$/).reply(200, cxList);
	});

	it("lists empires with faction, permits, plan count and CX", async () => {
		const { wrapper } = await mountEmpire();

		expect(
			tableRows(wrapper).map((r) => [
				r.empire_name,
				r.empire_faction,
				r.permits.replace(/\s+/g, " "),
				r.plans,
			])
		).toEqual([
			["Alpha", "Moria", "3 / 5", "2"],
			["Beta", "None", "1 / 2", "0"],
		]);
		expect(cxSelects(wrapper).map((s) => s.text())).toEqual([
			"Main CX",
			"None",
		]);
	});

	it("saves the CX assignment of every empire", async () => {
		mock.onPost(/planning\/cx\/junctions\/$/).reply(200, cxList);
		const { wrapper, component } = await mountEmpire();

		const [alpha, beta] = cxSelects(wrapper);
		alpha.vm.$emit("update:value", undefined);
		beta.vm.$emit("update:value", CX2);
		await flushPromises();

		await button(wrapper, "management.empire.buttons.update_cx").trigger(
			"click"
		);
		await flushPromises();

		expect(JSON.parse(mock.history.post[0].data)).toEqual([
			{ cx_uuid: CX1, empires: [] },
			{ cx_uuid: CX2, empires: [{ empire_uuid: E2 }] },
		]);
		expect(component.emitted("update:cxList")?.[0][0]).toHaveLength(
			cxList.length
		);
	});

	it("follows CX changes from the parent", async () => {
		const { wrapper, setProps } = await mountEmpire();

		await setProps({
			cx: [cx(CX1, "Main CX", []), cx(CX2, "Alt CX", [E1, E2])],
		});

		expect(cxSelects(wrapper).map((s) => s.text())).toEqual([
			"Alt CX",
			"Alt CX",
		]);
	});

	it("validates the new empire's name and permits", async () => {
		const { wrapper } = await mountEmpire();
		expect(createDisabled(wrapper)).toBe(true);

		await fillCreate(wrapper, "Gamma", 2, 1);
		expect(createDisabled(wrapper)).toBe(false);

		await fillCreate(wrapper, "x".repeat(100), 2, 2);
		expect(createDisabled(wrapper)).toBe(false);

		await fillCreate(wrapper, "x".repeat(101), 2, 2);
		expect(createDisabled(wrapper)).toBe(true);

		// more permits used than available
		await fillCreate(wrapper, "Gamma", 2, 3);
		expect(createDisabled(wrapper)).toBe(true);

		await fillCreate(wrapper, "", 2, 1);
		expect(createDisabled(wrapper)).toBe(true);
	});

	it("creates an empire and reloads the list", async () => {
		mock.onPost(/planning\/empire\/$/).reply(200, {
			...EMPIRES[0],
			plans: undefined,
		});
		const { wrapper, component } = await mountEmpire();

		await fillCreate(wrapper, "Gamma", 5, 3);
		wrapper
			.findAllComponents(PSelect)
			.find((s) => s.text() === "No Faction")!
			.vm.$emit("update:value", "HORTUS");
		await flushPromises();

		await button(wrapper, "common.buttons.create").trigger("click");
		await flushPromises();

		expect(JSON.parse(mock.history.post[0].data)).toEqual({
			empire_faction: "HORTUS",
			empire_permits_used: 3,
			empire_permits_total: 5,
			empire_name: "Gamma",
		});
		expect(component.emitted("update:empireList")?.[0][0]).toHaveLength(
			empireList.length
		);
	});

	it("deletes an empire only after confirmation", async () => {
		mock.onDelete(new RegExp(`planning/empire/${E2}/$`)).reply(204);
		const { wrapper, component } = await mountEmpire();

		await wrapper
			.findAll('td[data-col-key="configuration"] button')[1]
			.trigger("click");
		await flushPromises();
		expect(mock.history.delete).toHaveLength(0);

		const confirm = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				".n-dialog button"
			)
		).find((b) => b.textContent?.trim() === "Delete");
		expect(confirm).toBeDefined();
		confirm!.click();
		await flushPromises();

		expect(mock.history.delete).toHaveLength(1);
		expect(component.emitted("update:empireList")).toHaveLength(1);
	});

	it("shows the empty state without empires", async () => {
		const { wrapper } = await mountEmpire([], []);

		expect(tableRows(wrapper)).toHaveLength(0);
		expect(wrapper.text()).toContain("management.empire.table.nodata_title");
	});
});
