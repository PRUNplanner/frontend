import {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import ManagePlanEmpireAssignments from "@/features/manage/components/ManagePlanEmpireAssignments.vue";
import PInput from "@/ui/components/PInput.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PDropdown from "@/ui/components/PDropdown.vue";
import ManageAssignmentCard from "@/features/manage/components/ManageAssignmentCard.vue";
import { toasts } from "@/ui/useToast";
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
			(
				tr.findAll("td:not(:first-child) input").at(column)!
					.element as HTMLInputElement
			).checked
	);
}

/** stripe per row of one empire column */
function striped(wrapper: VueWrapper, column: number) {
	return bodyRows(wrapper).map((tr) =>
		tr
			.findAll("td:not(:first-child) .pcheckbox")
			.at(column)!
			.element.parentElement!.classList.contains("bg-unsaved-stripes")
	);
}

async function toggleCell(wrapper: VueWrapper, row: number, column: number) {
	const input = bodyRows(wrapper)
		.at(row)!
		.findAll("td:not(:first-child) input")
		.at(column)!;
	await input.setValue(!(input.element as HTMLInputElement).checked);
	await flushPromises();
}

const headerBoxes = (wrapper: VueWrapper) =>
	wrapper
		.findAll("thead th:not(:first-child) input")
		.map((i) => i.element as HTMLInputElement);

function headerState(wrapper: VueWrapper) {
	return headerBoxes(wrapper).map((i) =>
		i.indeterminate ? "some" : i.checked ? "all" : "none"
	);
}

async function clickHeader(wrapper: VueWrapper, column: number) {
	const input = wrapper
		.findAll("thead th:not(:first-child) input")
		.at(column)!;
	await input.setValue(!(input.element as HTMLInputElement).checked);
	await flushPromises();
}

const exposed = (component: VueWrapper) => component.vm as unknown as IExposed;

async function openMenu(wrapper: VueWrapper, row: number) {
	await bodyRows(wrapper)[row].find("button[aria-busy]").trigger("click");
	await flushPromises();
}

function menuOption(label: string) {
	return Array.from(
		document.body.querySelectorAll<HTMLElement>("[role=menuitem]")
	).find((o) => o.textContent?.trim() === label);
}

function confirmDialog() {
	Array.from(
		document.body.querySelectorAll<HTMLButtonElement>(
			"[role=dialog] button"
		)
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
		expect(wrapper.find(".ppagination").exists()).toBe(false);
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
			empires: [
				empire(E2, "Beta", []),
				empire(E1, "Alpha", plans.slice(0, 2)),
			],
		});

		expect(planNames(wrapper)).toEqual(["Plan A", "Plan B", "Plan D"]);
		expect(striped(wrapper, 1)).toEqual([true, false, false]);
		expect(exposed(component).changes.changedCount).toBe(1);
	});

	it("opens the row menu at the row's button, Escape and a click away close it", async () => {
		const { wrapper } = await mountAssignments();
		const menu = () => wrapper.findComponent(PDropdown);

		await openMenu(wrapper, 0);
		expect(menu().props("show")).toBe(true);
		expect(menu().props("anchor")).toBe(
			bodyRows(wrapper)[0].find("button[aria-busy]").element
		);
		expect(
			menuOption("management.assignments.menu.delete")!.className
		).toContain("text-negative");

		// the dropdown listens on the whole page, the key press has to bubble
		document.body.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		);
		await flushPromises();
		expect(menu().props("show")).toBe(false);

		await openMenu(wrapper, 1);
		expect(menu().props("anchor")).toBe(
			bodyRows(wrapper)[1].find("button[aria-busy]").element
		);
		document.body.dispatchEvent(
			new MouseEvent("mousedown", { bubbles: true })
		);
		await flushPromises();
		expect(menu().props("show")).toBe(false);
	});

	it("row menu clones a plan with a suffixed name", async () => {
		mock.onPost(new RegExp(`planning/plan/${P2}/clone/$`)).reply(200, plan);
		const { wrapper, component } = await mountAssignments();

		await openMenu(wrapper, 1);
		expect(
			[
				"management.assignments.menu.clone",
				"management.assignments.menu.share",
				"management.assignments.menu.delete",
			].map((l) => menuOption(l) !== undefined)
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

	it("selects all shown plans and deletes them after one confirmation", async () => {
		mock.onDelete(new RegExp(`planning/plan/${P1}/$`)).reply(204);
		mock.onDelete(new RegExp(`planning/plan/${P2}/$`)).reply(500);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountAssignments();
		const selectedBoxes = () =>
			bodyRows(wrapper).map(
				(tr) =>
					(
						tr.find("td:first-child input")
							.element as HTMLInputElement
					).checked
			);

		// only Plan A and B are shown, the header box takes both
		wrapper.findComponent(PInput).vm.$emit("update:value", "zv-307");
		await flushPromises();
		await wrapper.find("thead th:first-child input").setValue(true);
		await flushPromises();
		expect(selectedBoxes()).toEqual([true, true]);

		await wrapper
			.findAll("button")
			.find(
				(b) => b.text() === "management.assignments.selection.delete"
			)!
			.trigger("click");
		await flushPromises();
		expect(mock.history.delete).toHaveLength(0);

		confirmDialog();
		await flushPromises();

		expect(mock.history.delete).toHaveLength(2);
		expect(component.emitted("update:planList")).toHaveLength(1);
		// the one that failed stays selected
		expect(selectedBoxes()).toEqual([false, true]);
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it("renders long lists in chunks, a filter starts over", async () => {
		const plans = Array.from({ length: 50 }, (_, i) =>
			planRef(
				uuid(i + 10),
				`Plan ${String(i).padStart(2, "0")}`,
				"ZV-307c"
			)
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

	describe("table", () => {
		const SEL = "management.assignments.selection";
		const rowBox = (wrapper: VueWrapper, row: number) =>
			bodyRows(wrapper)[row].find("td:first-child input");
		const button = (wrapper: VueWrapper, text: string) =>
			wrapper.findAll("button").find((b) => b.text() === text);
		const manyPlans = (n: number) =>
			Array.from({ length: n }, (_, i) =>
				planRef(uuid(i + 10), `Plan ${i}`, "ZV-307c")
			);
		const dialogText = () =>
			document.body.querySelector("[role=dialog]")?.textContent ?? "";

		beforeEach(() => {
			toasts.value = [];
		});

		it("shows All changes saved only when told so", async () => {
			const off = await mountAssignments();
			expect(off.wrapper.find("[role=status]").exists()).toBe(false);

			const on = await mountComponent(
				ManagePlanEmpireAssignments,
				{ empires: EMPIRES, plans: PLANS, saved: true },
				{ withDialog: true }
			);
			expect(on.wrapper.find("[role=status]").text()).toContain(
				"management.save_bar.all_saved"
			);
		});

		it("shows just the id when the planet lookup fails", async () => {
			planetData.getPlanet.mockRejectedValueOnce(new Error("no planet"));
			const { wrapper } = await mountAssignments(EMPIRES, [PLANS[1]]);

			expect(bodyRows(wrapper)[0].text()).toContain("ZV-307c");
			expect(bodyRows(wrapper)[0].text()).not.toContain("·");
		});

		it("treats a cleared search as no filter and reports no match", async () => {
			const { wrapper } = await mountAssignments();
			const input = () => wrapper.findComponent(PInput);

			input().vm.$emit("update:value", "zzz");
			await flushPromises();
			expect(bodyRows(wrapper)).toHaveLength(0);
			expect(wrapper.find("tbody").text()).toContain(
				"management.assignments.no_match"
			);

			input().vm.$emit("update:value", null);
			await flushPromises();
			expect(planNames(wrapper)).toEqual(["Plan A", "Plan B", "Plan C"]);
		});

		it("selects single rows, counts them and clears the selection", async () => {
			const { wrapper } = await mountAssignments();
			expect(button(wrapper, `${SEL}.clear`)).toBeUndefined();

			await rowBox(wrapper, 0).setValue(true);
			await rowBox(wrapper, 2).setValue(true);
			expect(wrapper.find("[role=status]").text()).toBe(`${SEL}.count`);
			expect(
				wrapper.find<HTMLInputElement>("thead th:first-child input")
					.element.indeterminate
			).toBe(true);

			// unselecting one keeps the other
			await rowBox(wrapper, 0).setValue(false);
			expect(
				(rowBox(wrapper, 2).element as HTMLInputElement).checked
			).toBe(true);
			expect(
				(rowBox(wrapper, 0).element as HTMLInputElement).checked
			).toBe(false);

			await button(wrapper, `${SEL}.clear`)!.trigger("click");
			expect(
				(rowBox(wrapper, 2).element as HTMLInputElement).checked
			).toBe(false);
			expect(button(wrapper, `${SEL}.delete`)).toBeUndefined();
		});

		it("the header box clears the selection again when all are selected", async () => {
			const { wrapper } = await mountAssignments();
			const header = () =>
				wrapper.find<HTMLInputElement>("thead th:first-child input");

			await header().setValue(true);
			expect(header().element.checked).toBe(true);
			expect(header().attributes("aria-label")).toBe(
				`${SEL}.clear_all_shown`
			);

			await header().setValue(false);
			expect(header().element.checked).toBe(false);
			expect(header().attributes("aria-label")).toBe(
				`${SEL}.select_all_shown`
			);
			expect(wrapper.find("[role=status]").exists()).toBe(false);
		});

		it("drops plans that vanished from the selection", async () => {
			const { wrapper, setProps } = await mountAssignments();
			await rowBox(wrapper, 0).setValue(true);
			await rowBox(wrapper, 1).setValue(true);

			// a reload that keeps both changes nothing
			await setProps({ plans: [...PLANS] });
			expect(
				bodyRows(wrapper).map(
					(tr) =>
						(
							tr.find("td:first-child input")
								.element as HTMLInputElement
						).checked
				)
			).toEqual([true, true, false]);

			// Plan B is gone: only Plan A stays selected
			await setProps({ plans: [PLANS[1], PLANS[2]] });
			expect(
				bodyRows(wrapper).map(
					(tr) =>
						(
							tr.find("td:first-child input")
								.element as HTMLInputElement
						).checked
				)
			).toEqual([true, false]);
		});

		it("keeps the selection when the confirmation is cancelled", async () => {
			const { wrapper } = await mountAssignments();
			await rowBox(wrapper, 0).setValue(true);

			await button(wrapper, `${SEL}.delete`)!.trigger("click");
			await flushPromises();
			Array.from(
				document.body.querySelectorAll<HTMLButtonElement>(
					"[role=dialog] button"
				)
			)
				.find((b) => b.textContent?.trim() === "common.buttons.cancel")!
				.click();
			await flushPromises();

			expect(mock.history.delete).toHaveLength(0);
			expect(
				(rowBox(wrapper, 0).element as HTMLInputElement).checked
			).toBe(true);
		});

		it("lists only the first names of a large selection and shows progress", async () => {
			const plans = manyPlans(6);
			let release: () => void = () => {};
			const gate = new Promise<void>((r) => (release = r));
			mock.onDelete(/planning\/plan\/.*\/$/).reply(async () => {
				await gate;
				return [204];
			});
			const { wrapper, component } = await mountComponent(
				ManagePlanEmpireAssignments,
				{ empires: [], plans },
				{
					withDialog: true,
					messages: {
						management: {
							assignments: {
								selection: {
									confirm_content: "Delete {names}",
									more: "{names} and {count} more",
								},
							},
						},
					},
				}
			);

			await wrapper.find("thead th:first-child input").setValue(true);
			await button(wrapper, `${SEL}.delete`)!.trigger("click");
			await flushPromises();
			expect(dialogText()).toContain(
				"Delete Plan 0, Plan 1, Plan 2, Plan 3, Plan 4 and 1 more"
			);

			confirmDialog();
			await flushPromises();
			// the first request waits: progress label, buttons locked
			const deleting = button(wrapper, `${SEL}.deleting`)!;
			expect(deleting.attributes("disabled")).toBeDefined();
			expect(
				button(wrapper, `${SEL}.clear`)!.attributes("disabled")
			).toBeDefined();

			release();
			await vi.waitFor(() => {
				expect(component.emitted("update:planList")).toHaveLength(1);
			});
			await flushPromises();

			expect(mock.history.delete).toHaveLength(6);
			expect(toasts.value).toEqual([]);
			expect(wrapper.find("[role=status]").exists()).toBe(false);
			expect(button(wrapper, `${SEL}.delete`)).toBeUndefined();
		});

		it("toasts how many plans could not be deleted", async () => {
			mock.onDelete(new RegExp(`planning/plan/${P1}/$`)).reply(204);
			mock.onDelete(new RegExp(`planning/plan/${P2}/$`)).reply(500);
			mock.onDelete(new RegExp(`planning/plan/${P3}/$`)).reply(500);
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { wrapper } = await mountAssignments();

			await wrapper.find("thead th:first-child input").setValue(true);
			await button(wrapper, `${SEL}.delete`)!.trigger("click");
			await flushPromises();
			confirmDialog();
			await flushPromises();

			expect(toasts.value).toMatchObject([
				{ text: `${SEL}.failed`, type: "error" },
			]);
			error.mockRestore();
		});

		it("still ends the deletion when reloading the lists fails", async () => {
			mock.onDelete(/planning\/plan\/.*\/$/).reply(204);
			mock.onGet(/planning\/empire\/$/).reply(500);
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { wrapper, component } = await mountAssignments();

			await rowBox(wrapper, 0).setValue(true);
			await button(wrapper, `${SEL}.delete`)!.trigger("click");
			await flushPromises();
			confirmDialog();
			await flushPromises();

			expect(mock.history.delete).toHaveLength(1);
			expect(error).toHaveBeenCalled();
			expect(component.emitted("update:planList")).toBeUndefined();
			expect(wrapper.find("[role=status]").exists()).toBe(false);
			expect(toasts.value).toEqual([]);
			error.mockRestore();
		});

		it("saving without changes sends nothing", async () => {
			const { component } = await mountAssignments();

			await exposed(component).save();

			expect(mock.history.post).toHaveLength(0);
			expect(component.emitted("update:planList")).toBeUndefined();
		});
	});

	describe("row menu", () => {
		it("opens the sharing modal of the plan", async () => {
			const { wrapper } = await mountAssignments();

			await openMenu(wrapper, 0);
			menuOption("management.assignments.menu.share")!.click();
			await flushPromises();

			const dialog = document.body.querySelector("[role=dialog]");
			expect(dialog?.textContent).toContain("sharing.title");
			expect(dialog?.textContent).toContain(
				"sharing.buttons.create_link"
			);
			expect(
				menuOption("management.assignments.menu.share")
			).toBeUndefined();

			document.body
				.querySelector<HTMLButtonElement>(
					'[role=dialog] button[aria-label="common.ui.close"]'
				)!
				.click();
			await flushPromises();
			expect(document.body.querySelector("[role=dialog]")).toBeNull();
		});

		it("stops the spinner when cloning fails", async () => {
			mock.onPost(new RegExp(`planning/plan/${P1}/clone/$`)).reply(500);
			const error = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { wrapper, component } = await mountAssignments();

			await openMenu(wrapper, 0);
			menuOption("management.assignments.menu.clone")!.click();
			await flushPromises();

			expect(mock.history.post).toHaveLength(1);
			expect(component.emitted("update:planList")).toBeUndefined();
			expect(
				bodyRows(wrapper)[0]
					.find("button[aria-busy]")
					.attributes("aria-busy")
			).toBe("false");
			expect(error).toHaveBeenCalled();
			error.mockRestore();
		});

		it("does not delete when the confirmation is declined", async () => {
			const { wrapper, component } = await mountAssignments();

			await openMenu(wrapper, 0);
			menuOption("management.assignments.menu.delete")!.click();
			await flushPromises();
			Array.from(
				document.body.querySelectorAll<HTMLButtonElement>(
					"[role=dialog] button"
				)
			)
				.find((b) => b.textContent?.trim() === "common.buttons.cancel")!
				.click();
			await flushPromises();

			expect(mock.history.delete).toHaveLength(0);
			expect(component.emitted("update:empireList")).toBeUndefined();
		});

		it("ignores a choice for a plan that is gone", async () => {
			const { wrapper, setProps } = await mountAssignments();

			await openMenu(wrapper, 0);
			await setProps({ plans: [PLANS[0], PLANS[2]] });
			menuOption("management.assignments.menu.clone")!.click();
			await flushPromises();

			expect(mock.history.post).toHaveLength(0);
			expect(planNames(wrapper)).toEqual(["Plan B", "Plan C"]);
		});
	});

	describe("narrow screens", () => {
		const SEL = "management.assignments.selection";
		let onChange: (e: { matches: boolean }) => void;
		let removed: number;

		function narrow() {
			removed = 0;
			vi.stubGlobal("matchMedia", () => ({
				matches: false,
				addEventListener: (_: string, cb: typeof onChange) =>
					(onChange = cb),
				removeEventListener: () => removed++,
			}));
		}

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		const cards = (wrapper: VueWrapper) =>
			wrapper.findAllComponents(ManageAssignmentCard);
		const button = (wrapper: VueWrapper, text: string) =>
			wrapper.findAll("button").find((b) => b.text() === text);

		it("lists the plans as cards and toggles assignments", async () => {
			narrow();
			const { wrapper } = await mountAssignments();

			expect(wrapper.find("table").exists()).toBe(false);
			expect(cards(wrapper).map((c) => c.props("row").planName)).toEqual([
				"Plan A",
				"Plan B",
				"Plan C",
			]);
			// Alpha has A and B, Beta has C
			expect(cards(wrapper).map((c) => c.props("cells"))).toEqual([
				"10",
				"10",
				"01",
			]);

			await cards(wrapper)[2]
				.findAll("button[aria-pressed]")[0]
				.trigger("click");
			expect(cards(wrapper)[2].props("cells")).toBe("+1");
		});

		it("selects all shown cards and clears them again", async () => {
			narrow();
			const { wrapper } = await mountAssignments();

			await button(wrapper, `${SEL}.select_all_shown`)!.trigger("click");
			expect(cards(wrapper).map((c) => c.props("selected"))).toEqual([
				true,
				true,
				true,
			]);
			expect(wrapper.find("[role=status]").exists()).toBe(true);

			await button(wrapper, `${SEL}.clear_all_shown`)!.trigger("click");
			expect(cards(wrapper).map((c) => c.props("selected"))).toEqual([
				false,
				false,
				false,
			]);

			// a single card
			await cards(wrapper)[1].find("input[type=checkbox]").setValue(true);
			expect(cards(wrapper).map((c) => c.props("selected"))).toEqual([
				false,
				true,
				false,
			]);
			await cards(wrapper)[1]
				.find("input[type=checkbox]")
				.setValue(false);
			expect(cards(wrapper)[1].props("selected")).toBe(false);
		});

		it("opens the row menu from a card", async () => {
			narrow();
			const { wrapper } = await mountAssignments();

			await cards(wrapper)[1].find("button[aria-busy]").trigger("click");
			await flushPromises();

			expect(
				menuOption("management.assignments.menu.share")
			).toBeDefined();
		});

		it("reports no match, offers no select-all and follows the screen size", async () => {
			narrow();
			const { wrapper } = await mountAssignments();

			wrapper.findComponent(PInput).vm.$emit("update:value", "zzz");
			await flushPromises();
			expect(cards(wrapper)).toHaveLength(0);
			expect(wrapper.text()).toContain("management.assignments.no_match");
			expect(button(wrapper, `${SEL}.select_all_shown`)).toBeUndefined();

			onChange({ matches: true });
			await flushPromises();
			expect(wrapper.find("table").exists()).toBe(true);
			expect(cards(wrapper)).toHaveLength(0);
		});

		it("stops listening to the screen size when unmounted", async () => {
			narrow();
			const { wrapper } = await mountAssignments();

			wrapper.unmount();

			expect(removed).toBe(1);
		});
	});
});
