import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import ManagePlanEmpireAssignments from "@/features/manage/components/ManagePlanEmpireAssignments.vue";
import PInput from "@/ui/components/PInput.vue";
import PSelect from "@/ui/components/PSelect.vue";
import { NDropdown } from "naive-ui";
import { mountComponent } from "@/tests/mountComponent";

// test data
import empireList from "@/tests/test_data/api_data_empire_list.json";
import plan from "@/tests/test_data/api_data_plan_etherwind.json";

// planet names come from IndexedDB, resolved once per planet
const planetData = vi.hoisted(() => ({
	getPlanet: vi.fn(async (id: string) => ({
		planet_natural_id: id,
		planet_name: id === "ZV-307c" ? "Vallis" : id,
	})),
	planetName: vi.fn(() => "..."),
}));
vi.mock("@/database/services/usePlanetData", () => ({
	usePlanetData: () => planetData,
}));

const mock = new AxiosMockAdapter(apiService.client);

// junction payloads are validated as uuids
const uuid = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const [P1, P2, P3, P4, E1, E2] = [1, 2, 3, 4, 5, 6].map(uuid);

const planRef = (uuid: string, name: string, planet: string) => ({
	uuid,
	plan_name: name,
	planet_natural_id: planet,
});
// passed unsorted, rows are sorted by name
const PLANS = [
	planRef(P2, "Plan B", "ZV-307d"),
	planRef(P1, "Plan A", "ZV-307c"),
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
	empire(E1, "Alpha", [PLANS[1], PLANS[0]]),
];

interface IExposed {
	changes: { changedCount: number };
	save: () => Promise<void>;
	discard: () => void;
}

async function mountAssignments(empires = EMPIRES, plans = PLANS) {
	return mountComponent(
		ManagePlanEmpireAssignments,
		{ empires, plans },
		{ withDialog: true }
	);
}

const bodyRows = (wrapper: VueWrapper) =>
	wrapper.findAll("tbody tr").filter((tr) => tr.find("a").exists());

const planNames = (wrapper: VueWrapper) =>
	bodyRows(wrapper).map((tr) => tr.find("a").text());

/** checkbox state of one empire column (0 Alpha, 1 Beta), in row order */
function assigned(wrapper: VueWrapper, column: number) {
	return bodyRows(wrapper).map(
		(tr) =>
			(tr.findAll("td input").at(column)!.element as HTMLInputElement)
				.checked
	);
}

/** stripe per row of one empire column */
function striped(wrapper: VueWrapper, column: number) {
	return bodyRows(wrapper).map((tr) =>
		tr.findAll("td label").at(column)!.classes("bg-unsaved-stripes")
	);
}

async function toggleCell(wrapper: VueWrapper, row: number, column: number) {
	await bodyRows(wrapper)[row].findAll("td input").at(column)!.trigger("change");
	await flushPromises();
}

const headerBoxes = (wrapper: VueWrapper) =>
	wrapper
		.findAll("thead input")
		.map((i) => i.element as HTMLInputElement);

function headerState(wrapper: VueWrapper) {
	return headerBoxes(wrapper).map((i) =>
		i.indeterminate ? "some" : i.checked ? "all" : "none"
	);
}

async function clickHeader(wrapper: VueWrapper, column: number) {
	await wrapper.findAll("thead input").at(column)!.trigger("change");
	await flushPromises();
}

const exposed = (component: VueWrapper) =>
	component.vm as unknown as IExposed;

async function openMenu(wrapper: VueWrapper, row: number) {
	await bodyRows(wrapper)[row].find("button[aria-busy]").trigger("click");
	await flushPromises();
}

function menuOption(label: string) {
	return Array.from(
		document.body.querySelectorAll<HTMLElement>(".n-dropdown-option-body")
	).find((o) => o.textContent?.trim() === label);
}

function confirmDialog() {
	Array.from(
		document.body.querySelectorAll<HTMLButtonElement>(".n-dialog button")
	)
		.find((b) => b.textContent?.trim() === "common.buttons.delete")!
		.click();
}

describe("ManagePlanEmpireAssignments", () => {
	beforeAll(() => {
		axiosSetup();
	});

	beforeEach(() => {
		mock.reset();
		planetData.getPlanet.mockClear();
		planetData.planetName.mockClear();
		mock.onGet(/planning\/empire\/$/).reply(200, empireList);
		mock.onGet(/planning\/plan\/$/).reply(200, [plan]);
	});

	it("builds the matrix sorted by plan and empire name", async () => {
		const { wrapper } = await mountAssignments();

		expect(planNames(wrapper)).toEqual(["Plan A", "Plan B", "Plan C"]);
		expect(assigned(wrapper, 0)).toEqual([true, true, false]);
		expect(assigned(wrapper, 1)).toEqual([false, false, true]);

		const headers = wrapper.findAll("thead th").map((th) => th.text());
		expect(headers[2]).toContain("Alpha");
		expect(headers[3]).toContain("Beta");
		// no pagination, no planet or configuration column
		expect(wrapper.find(".n-pagination").exists()).toBe(false);
		expect(wrapper.findAll("thead th")).toHaveLength(4);
	});

	it("resolves planet names once, not during render", async () => {
		const { wrapper } = await mountAssignments();

		expect(planetData.planetName).not.toHaveBeenCalled();
		expect(planetData.getPlanet).toHaveBeenCalledTimes(3);
		expect(bodyRows(wrapper)[0].text()).toContain("Vallis · ZV-307c");
		// name equals the id: only the id
		expect(bodyRows(wrapper)[1].text()).not.toContain("·");
	});

	it("stripes and counts unsaved cells, discard reverts them", async () => {
		const { wrapper, component } = await mountAssignments();

		await toggleCell(wrapper, 0, 1);
		await toggleCell(wrapper, 1, 0);

		expect(assigned(wrapper, 1)).toEqual([true, false, true]);
		expect(striped(wrapper, 1)).toEqual([true, false, false]);
		expect(striped(wrapper, 0)).toEqual([false, true, false]);
		expect(exposed(component).changes.changedCount).toBe(2);

		// toggling back is no change
		await toggleCell(wrapper, 0, 1);
		expect(exposed(component).changes.changedCount).toBe(1);

		exposed(component).discard();
		await flushPromises();
		expect(striped(wrapper, 0)).toEqual([false, false, false]);
		expect(assigned(wrapper, 0)).toEqual([true, true, false]);
	});

	it("header checkbox shows none/some/all and adds or removes all", async () => {
		const { wrapper } = await mountAssignments();
		expect(headerState(wrapper)).toEqual(["some", "some"]);

		await clickHeader(wrapper, 1);
		expect(headerState(wrapper)).toEqual(["some", "all"]);
		expect(assigned(wrapper, 1)).toEqual([true, true, true]);

		await clickHeader(wrapper, 1);
		expect(headerState(wrapper)).toEqual(["some", "none"]);
		expect(assigned(wrapper, 1)).toEqual([false, false, false]);

		expect(wrapper.find("thead").text()).toContain(
			"management.assignments.empire_plans"
		);
	});

	it("saves only the changed empires as junctions and reloads", async () => {
		mock.onPost(/planning\/empire\/junctions\/$/).reply(200, empireList);
		const { wrapper, component } = await mountAssignments();

		// assign Plan B to Beta
		await toggleCell(wrapper, 1, 1);
		await exposed(component).save();

		expect(mock.history.post).toHaveLength(1);
		const payload = JSON.parse(mock.history.post[0].data);
		expect(payload).toHaveLength(1);
		expect(payload[0].empire_uuid).toBe(E2);
		expect(
			payload[0].baseplanners.map(
				(b: { baseplanner_uuid: string }) => b.baseplanner_uuid
			)
		).toEqual(expect.arrayContaining([P2, P3]));

		expect(component.emitted("update:empireList")?.[0][0]).toHaveLength(
			empireList.length
		);
		expect(component.emitted("update:planList")?.[0][0]).toHaveLength(1);
	});

	it("rejects when saving fails and keeps the edits", async () => {
		mock.onPost(/planning\/empire\/junctions\/$/).reply(500);
		const { wrapper, component } = await mountAssignments();

		await toggleCell(wrapper, 1, 1);
		await expect(exposed(component).save()).rejects.toThrow();
		expect(exposed(component).changes.changedCount).toBe(1);
	});

	it("filters by search, empire and unassigned; header acts on shown rows", async () => {
		const { wrapper } = await mountAssignments();

		// planet name search
		wrapper.findComponent(PInput).vm.$emit("update:value", "vallis");
		await flushPromises();
		expect(planNames(wrapper)).toEqual(["Plan A"]);

		// natural id search
		wrapper.findComponent(PInput).vm.$emit("update:value", "759");
		await flushPromises();
		expect(planNames(wrapper)).toEqual(["Plan C"]);

		// header adds only the shown plan
		await clickHeader(wrapper, 0);
		wrapper.findComponent(PInput).vm.$emit("update:value", "");
		await flushPromises();
		expect(assigned(wrapper, 0)).toEqual([true, true, true]);

		wrapper.findComponent(PSelect).vm.$emit("update:value", E2);
		await flushPromises();
		expect(planNames(wrapper)).toEqual(["Plan C"]);
		wrapper.findComponent(PSelect).vm.$emit("update:value", undefined);
		await flushPromises();

		await toggleCell(wrapper, 1, 0);
		const unassigned = wrapper
			.findAll("button")
			.find((b) => b.attributes("aria-pressed") !== undefined)!;
		await unassigned.trigger("click");
		await flushPromises();
		expect(unassigned.attributes("aria-pressed")).toBe("true");
		expect(planNames(wrapper)).toEqual(["Plan B"]);
	});

	it("sorts by plan name both ways", async () => {
		const { wrapper } = await mountAssignments();

		await wrapper.find("thead th button").trigger("click");
		expect(planNames(wrapper)).toEqual(["Plan C", "Plan B", "Plan A"]);
		expect(wrapper.find("thead th").attributes("aria-sort")).toBe(
			"descending"
		);
	});

	it("keeps unsaved edits when the lists reload", async () => {
		const { wrapper, component, setProps } = await mountAssignments();

		await toggleCell(wrapper, 0, 1);
		await toggleCell(wrapper, 2, 0);

		// a clone appears, Plan C is deleted
		const plans = [...PLANS.slice(0, 2), planRef(P4, "Plan D", "ZV-896b")];
		await setProps({
			plans,
			empires: [empire(E2, "Beta", []), empire(E1, "Alpha", plans.slice(0, 2))],
		});

		expect(planNames(wrapper)).toEqual(["Plan A", "Plan B", "Plan D"]);
		expect(striped(wrapper, 1)).toEqual([true, false, false]);
		expect(exposed(component).changes.changedCount).toBe(1);
	});

	it("Escape closes the row menu", async () => {
		const { wrapper } = await mountAssignments();

		await openMenu(wrapper, 0);
		expect(wrapper.findComponent(NDropdown).props("show")).toBe(true);

		// the dropdown listens on the whole page, the key press has to bubble
		document.body.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		await flushPromises();
		expect(wrapper.findComponent(NDropdown).props("show")).toBe(false);
	});

	it("row menu clones a plan with a suffixed name", async () => {
		mock.onPost(new RegExp(`planning/plan/${P2}/clone/$`)).reply(200, plan);
		const { wrapper, component } = await mountAssignments();

		await openMenu(wrapper, 1);
		expect(
			["management.assignments.menu.clone", "management.assignments.menu.share", "management.assignments.menu.delete"].map(
				(l) => menuOption(l) !== undefined
			)
		).toEqual([true, true, true]);

		menuOption("management.assignments.menu.clone")!.click();
		await flushPromises();

		expect(JSON.parse(mock.history.post[0].data)).toEqual({
			plan_name: "Plan B (Clone)",
		});
		expect(component.emitted("update:planList")).toHaveLength(1);
	});

	it("row menu deletes a plan only after confirmation", async () => {
		mock.onDelete(new RegExp(`planning/plan/${P3}/$`)).reply(204);
		const { wrapper, component } = await mountAssignments();

		await openMenu(wrapper, 2);
		menuOption("management.assignments.menu.delete")!.click();
		await flushPromises();
		expect(mock.history.delete).toHaveLength(0);

		confirmDialog();
		await flushPromises();

		expect(mock.history.delete).toHaveLength(1);
		expect(component.emitted("update:empireList")).toHaveLength(1);
	});

	it("keeps the plans and stops the spinner when deleting fails", async () => {
		mock.onDelete(new RegExp(`planning/plan/${P3}/$`)).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountAssignments();

		await openMenu(wrapper, 2);
		menuOption("management.assignments.menu.delete")!.click();
		await flushPromises();
		confirmDialog();
		await flushPromises();

		expect(mock.history.delete).toHaveLength(1);
		expect(component.emitted("update:planList")).toBeUndefined();
		expect(
			bodyRows(wrapper)[2].find("button").attributes("aria-busy")
		).toBe("false");
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it("renders long lists in chunks, a filter starts over", async () => {
		const plans = Array.from({ length: 50 }, (_, i) =>
			planRef(uuid(i + 10), `Plan ${String(i).padStart(2, "0")}`, "ZV-307c")
		);
		const { wrapper } = await mountAssignments([], plans);

		// first chunk right away, the rest over the next frames
		expect(bodyRows(wrapper).length).toBeLessThan(50);
		await vi.waitFor(() => expect(bodyRows(wrapper)).toHaveLength(50));

		wrapper.findComponent(PInput).vm.$emit("update:value", "plan");
		await flushPromises();
		expect(bodyRows(wrapper).length).toBeLessThan(50);
		await vi.waitFor(() => expect(bodyRows(wrapper)).toHaveLength(50));
	});

	it("shows the empty state without plans", async () => {
		const { wrapper } = await mountAssignments([], []);

		expect(wrapper.find("table").exists()).toBe(false);
		expect(wrapper.text()).toContain(
			"management.assignments.table.nodata_title"
		);
	});
});
