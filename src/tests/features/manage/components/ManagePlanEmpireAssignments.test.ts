import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { flushPromises, VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import ManagePlanEmpireAssignments from "@/features/manage/components/ManagePlanEmpireAssignments.vue";
import ManageAssignmentFilters from "@/features/manage/components/ManageAssignmentFilters.vue";
import PSelectMultiple from "@/ui/components/PSelectMultiple.vue";
import { mountComponent, tableRows } from "@/tests/mountComponent";

// test data
import empireList from "@/tests/test_data/api_data_empire_list.json";
import plan from "@/tests/test_data/api_data_plan_etherwind.json";

const mock = new AxiosMockAdapter(apiService.client);

// junction payloads are validated as uuids
const uuid = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const [P1, P2, P3, P4, E1, E2] = [1, 2, 3, 4, 5, 6].map(uuid);

const planRef = (uuid: string, name: string, planet: string) => ({
	uuid,
	plan_name: name,
	planet_natural_id: planet,
});
const PLANS = [
	planRef(P1, "Plan A", "ZV-307c"),
	planRef(P2, "Plan B", "ZV-307d"),
	planRef(P3, "Plan C", "ZV-759c"),
];

const empire = (uuid: string, name: string, plans: typeof PLANS) => ({
	uuid,
	empire_name: name,
	empire_faction: "NONE",
	empire_permits_used: 1,
	empire_permits_total: 2,
	plans,
});
// passed unsorted, columns are sorted by name: Alpha, Beta
const EMPIRES = [
	empire(E2, "Beta", [PLANS[2]]),
	empire(E1, "Alpha", [PLANS[0], PLANS[1]]),
];

async function mountAssignments(empires = EMPIRES, plans = PLANS) {
	return mountComponent(
		ManagePlanEmpireAssignments,
		{ empires, plans },
		{ withDialog: true }
	);
}

/** checkbox state per empire column, in row order */
function assigned(wrapper: VueWrapper, empireUuid: string) {
	return wrapper
		.findAll(`td[data-col-key="ASSIGN#${empireUuid}"] input`)
		.map((i) => (i.element as HTMLInputElement).checked);
}

/** "assign all" (0) or "remove all" (1) icon of an empire column */
async function clickColumnIcon(
	wrapper: VueWrapper,
	empireUuid: string,
	icon: 0 | 1
) {
	await wrapper
		.findAll(`th[data-col-key="ASSIGN#${empireUuid}"] .picon`)
		.at(icon)!.trigger("click");
	await flushPromises();
}

async function clickHeaderButton(wrapper: VueWrapper, key: string) {
	const button = wrapper
		.findAll("button")
		.find(
			(b) => b.text() === `management.assignments.buttons.${key}`
		);
	expect(button).toBeDefined();
	await button!.trigger("click");
	await flushPromises();
}

async function filter(wrapper: VueWrapper, index: 0 | 1, value: string[]) {
	wrapper
		.findComponent(ManageAssignmentFilters)
		.findAllComponents(PSelectMultiple)
		.at(index)!.vm.$emit("update:value", value);
	await flushPromises();
}

const planNames = (wrapper: VueWrapper) =>
	tableRows(wrapper).map((r) => r.planName);

describe("ManagePlanEmpireAssignments", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		mock.onGet(/planning\/empire\/$/).reply(200, empireList);
		mock.onGet(/planning\/plan\/$/).reply(200, [plan]);
	});

	it("builds the plan / empire matrix from the empire's plans", async () => {
		const { wrapper } = await mountAssignments();

		expect(planNames(wrapper)).toEqual(["Plan A", "Plan B", "Plan C"]);
		expect(assigned(wrapper, E1)).toEqual([true, true, false]);
		expect(assigned(wrapper, E2)).toEqual([false, false, true]);

		const headers = wrapper
			.findAll("th")
			.map((th) => th.text())
			.filter((t) => ["Alpha", "Beta"].includes(t));
		expect(headers).toEqual(["Alpha", "Beta"]);
	});

	it("saves the assignments as junctions per empire", async () => {
		mock.onPost(/planning\/empire\/junctions\/$/).reply(200, empireList);
		const { wrapper, component } = await mountAssignments();

		await clickColumnIcon(wrapper, E2, 0);
		await clickColumnIcon(wrapper, E1, 1);
		expect(assigned(wrapper, E2)).toEqual([true, true, true]);
		expect(assigned(wrapper, E1)).toEqual([false, false, false]);

		await clickHeaderButton(wrapper, "update_assignments");

		expect(mock.history.post).toHaveLength(1);
		expect(JSON.parse(mock.history.post[0].data)).toEqual([
			{ empire_uuid: E1, baseplanners: [] },
			{
				empire_uuid: E2,
				baseplanners: [
					{ baseplanner_uuid: P1 },
					{ baseplanner_uuid: P2 },
					{ baseplanner_uuid: P3 },
				],
			},
		]);

		// both lists are reloaded and handed to the parent
		expect(component.emitted("update:empireList")?.[0][0]).toHaveLength(
			empireList.length
		);
		expect(component.emitted("update:planList")?.[0][0]).toHaveLength(1);
	});

	it("saves single checkbox changes", async () => {
		mock.onPost(/planning\/empire\/junctions\/$/).reply(200, empireList);
		const { wrapper } = await mountAssignments();

		// assign Plan A to Beta as well
		await wrapper
			.findAll(`td[data-col-key="ASSIGN#${E2}"] input`)[0]
			.setValue(true);
		await clickHeaderButton(wrapper, "update_assignments");

		expect(JSON.parse(mock.history.post[0].data)[1]).toEqual({
			empire_uuid: E2,
			baseplanners: [
				{ baseplanner_uuid: P1 },
				{ baseplanner_uuid: P3 },
			],
		});
	});

	it("filters by plan and by assigned empire", async () => {
		const { wrapper } = await mountAssignments();

		await filter(wrapper, 0, [P2, P3]);
		expect(planNames(wrapper)).toEqual(["Plan B", "Plan C"]);

		await filter(wrapper, 0, []);
		await filter(wrapper, 1, [E2]);
		expect(planNames(wrapper)).toEqual(["Plan C"]);

		await filter(wrapper, 1, [E1, E2]);
		expect(planNames(wrapper)).toHaveLength(3);
	});

	it("assigns all only to the filtered plans", async () => {
		const { wrapper } = await mountAssignments();

		await filter(wrapper, 0, [P2]);
		await clickColumnIcon(wrapper, E2, 0);
		await filter(wrapper, 0, []);

		expect(assigned(wrapper, E2)).toEqual([false, true, true]);
	});

	it("reload discards unsaved changes", async () => {
		const { wrapper } = await mountAssignments();

		await clickColumnIcon(wrapper, E1, 1);
		expect(assigned(wrapper, E1)).toEqual([false, false, false]);

		await clickHeaderButton(wrapper, "reload");
		expect(assigned(wrapper, E1)).toEqual([true, true, false]);
	});

	it("rebuilds the matrix when the plans change", async () => {
		const { wrapper, setProps } = await mountAssignments();

		await setProps({
			plans: [...PLANS, planRef(P4, "Plan D", "ZV-896b")],
		});

		expect(planNames(wrapper)).toEqual([
			"Plan A",
			"Plan B",
			"Plan C",
			"Plan D",
		]);
		expect(assigned(wrapper, E1)).toEqual([true, true, false, false]);
	});

	it("clones a plan with a suffixed name", async () => {
		mock.onPost(new RegExp(`planning/plan/${P2}/clone/$`)).reply(200, plan);
		const { wrapper, component } = await mountAssignments();

		await wrapper
			.findAll('td[data-col-key="options"]')[1]
			.findAll("button")[1]
			.trigger("click");
		await flushPromises();

		expect(mock.history.post).toHaveLength(1);
		expect(JSON.parse(mock.history.post[0].data)).toEqual({
			plan_name: "Plan B (Clone)",
		});
		expect(component.emitted("update:planList")).toHaveLength(1);
	});

	it("deletes a plan only after confirmation", async () => {
		mock.onDelete(new RegExp(`planning/plan/${P3}/$`)).reply(204);
		const { wrapper, component } = await mountAssignments();

		await wrapper
			.findAll('td[data-col-key="options"]')[2]
			.findAll("button")[0]
			.trigger("click");
		await flushPromises();
		expect(mock.history.delete).toHaveLength(0);

		const confirm = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				".n-dialog button"
			)
		).find((b) => b.textContent?.trim() === "common.buttons.delete");
		expect(confirm).toBeDefined();
		confirm!.click();
		await flushPromises();

		expect(mock.history.delete).toHaveLength(1);
		expect(mock.history.delete[0].url).toMatch(
			new RegExp(`planning/plan/${P3}/$`)
		);
		expect(component.emitted("update:empireList")).toHaveLength(1);
	});

	it("shows the empty state without plans", async () => {
		const { wrapper } = await mountAssignments([], []);

		expect(tableRows(wrapper)).toHaveLength(0);
		expect(wrapper.text()).toContain(
			"management.assignments.table.nodata_title"
		);
	});
});
