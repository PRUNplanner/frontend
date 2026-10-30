import {
	PLAN_UUID,
	SAVED_AT,
	SKY_EMPIRE,
	buildingAmounts,
	dialog,
	dialogButton,
	emitFrom,
	empires,
	mocks,
	mountView,
	newPlan,
	press,
	queryCalls,
	respond,
	setupPlanViewSuite,
} from "@/tests/views/PlanView.harness";
import type { IMountOptions } from "@/tests/views/PlanView.harness";
import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import PlanSaveButton from "@/features/planning/components/PlanSaveButton.vue";
import { remoteChange } from "@/lib/crossTab";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { etherwindPlan } from "@/tests/features/planning/usePlanCalculation.fixtures";

describe("PlanView save conflicts", () => {
	setupPlanViewSuite();

	// -- save conflicts --------------------------------------------------

	const CONFLICT = Object.assign(new Error("409"), {
		status: 409,
		responseData: { code: "conflict" },
	});
	const DELETED = Object.assign(new Error("404"), { status: 404 });

	function remotePlan() {
		const plan = etherwindPlan();
		plan.plan_name = "Their name";
		plan.plan_data.buildings[0].amount = 2;
		return { ...plan, modified_at: "theirs" };
	}

	async function saveIntoConflict(
		error: object,
		view: { props?: object; seed?: IMountOptions["seed"] } = {}
	) {
		const patch = vi.fn(() => {
			throw error;
		});
		respond({
			PatchPlan: patch,
			GetPlan: (_args, options) =>
				options?.forceRefetch ? remotePlan() : etherwindPlan(),
			CreatePlan: () => ({ uuid: "copy-uuid", modified_at: SAVED_AT }),
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const mounted = await mountView(
			{
				planData: { ...etherwindPlan(), modified_at: "mine" },
				...view.props,
			},
			{ login: true, seed: view.seed }
		);
		await emitFrom(
			mounted.wrapper,
			PlanProduction,
			"update:building:amount",
			0,
			5
		);
		press({ key: "s", ctrlKey: true });
		await vi.waitFor(() => expect(dialog().exists()).toBe(true));
		await flushPromises();
		return { ...mounted, patch };
	}

	it("lists both sides of a save conflict and overwrites on request", async () => {
		const { wrapper, patch } = await saveIntoConflict(CONFLICT);

		expect(dialog().text()).toContain("save_conflict.title");
		expect(dialog().text()).toContain("save_conflict.option.reload");
		expect(dialog().text()).not.toContain("save_conflict.load_failed");
		// the other tab's version is loaded fresh to compare, their side lists
		// the name they gave it
		expect(queryCalls("GetPlan")).toEqual([
			["GetPlan", expect.anything(), { forceRefetch: true }],
		]);
		expect(
			dialog()
				.findAll("h3")
				.map((h) => h.text())
		).toEqual(["save_conflict.theirs", "save_conflict.mine"]);
		expect(dialog().find("h3 + ul").text()).toContain(
			"save_conflict.change.name"
		);

		patch.mockImplementation(() => ({ modified_at: SAVED_AT }) as never);
		await dialogButton("save_conflict.option.overwrite").trigger("click");
		await flushPromises();

		expect(trackEvent).toHaveBeenCalledWith("plan:save_conflict", {
			planet_natural_id: "KW-688c",
			is_deleted: false,
			choice: "overwrite",
		});
		expect(patch).toHaveBeenCalledTimes(2);
		expect(queryCalls("PatchPlan")[0][1].data.base_modified_at).toBe(
			"mine"
		);
		expect(
			queryCalls("PatchPlan")[1][1].data.base_modified_at
		).toBeUndefined();
		await vi.waitFor(() => expect(dialog().exists()).toBe(false));
		expect(wrapper.find("h1").text()).toBe("EW COF RAT DW C");
	});

	it("reloads the other tab's version on request", async () => {
		const { wrapper, patch } = await saveIntoConflict(CONFLICT);

		await dialogButton("save_conflict.option.reload").trigger("click");
		await flushPromises();

		expect(wrapper.find("h1").text()).toBe("Their name");
		expect(buildingAmounts(wrapper).EXT).toBe(2);
		expect(wrapper.findComponent(PlanSaveButton).props("modified")).toBe(
			false
		);
		expect(trackEvent).toHaveBeenCalledWith(
			"plan:save_conflict",
			expect.objectContaining({ choice: "reload" })
		);

		// the next save starts from their version
		patch.mockImplementation(() => ({ modified_at: SAVED_AT }) as never);
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 3);
		press({ key: "s", ctrlKey: true });
		await flushPromises();
		expect(queryCalls("PatchPlan")).toHaveLength(2);
		expect(queryCalls("PatchPlan")[1][1].data.base_modified_at).toBe(
			"theirs"
		);
	});

	it("keeps the edits when reloading the saved version fails", async () => {
		const { wrapper } = await saveIntoConflict(CONFLICT);
		respond({
			GetPlan: () => {
				throw new Error("offline");
			},
		});

		await dialogButton("save_conflict.option.reload").trigger("click");
		await flushPromises();

		expect(buildingAmounts(wrapper).EXT).toBe(5);
		expect(console.error).toHaveBeenCalledWith(expect.any(Error));
		expect(mocks.toast).toHaveBeenCalledWith("common.ui.load_failed", {
			type: "error",
		});
	});

	it("saves a conflicting plan as a copy and opens it", async () => {
		const { wrapper, user } = await saveIntoConflict(CONFLICT);

		await dialogButton("save_conflict.option.save_as_new").trigger("click");
		await flushPromises();

		const create = queryCalls("CreatePlan")[0][1].data;
		expect(create.plan_name).toBe("save_conflict.copy_name");
		expect(create.empire_uuid).toBe(SKY_EMPIRE);
		expect(user.preferences.planOverrides["copy-uuid"]).toBeDefined();
		expect(mocks.push).toHaveBeenCalledWith("/plan/KW-688c/copy-uuid");
		expect(wrapper.findComponent(PlanSaveButton).props("modified")).toBe(
			false
		);
	});

	it("puts the copy in the empire the plan calculates with", async () => {
		// the plan is in Sky Productions (listed first) and PRUN REAL; the
		// navigation shows PRUN REAL
		const prunReal = empires().find((e) => e.empire_name === "PRUN REAL")!;
		await saveIntoConflict(CONFLICT, {
			props: { empireList: empires() },
			seed: ({ user, planning }) => {
				planning.setEmpires(empires());
				user.preferences.defaultEmpireUuid = prunReal.uuid;
			},
		});

		await dialogButton("save_conflict.option.save_as_new").trigger("click");
		await flushPromises();

		expect(queryCalls("CreatePlan")[0][1].data.empire_uuid).toBe(
			prunReal.uuid
		);
	});

	it("reports a copy of a conflicting plan that cannot be created", async () => {
		await saveIntoConflict(CONFLICT);
		respond({
			CreatePlan: () => {
				throw new Error("offline");
			},
		});

		await dialogButton("save_conflict.option.save_as_new").trigger("click");
		await flushPromises();

		expect(mocks.toast).toHaveBeenCalledWith(
			"plan.save_status.failed_message",
			{ type: "error" }
		);
		expect(mocks.push).not.toHaveBeenCalled();
	});

	it("only offers a copy for a plan deleted elsewhere", async () => {
		const { wrapper } = await saveIntoConflict(DELETED);

		expect(dialog().text()).toContain("save_conflict.deleted_title");
		// nothing to compare with: no change list
		expect(queryCalls("GetPlan")).toEqual([]);
		expect(dialog().find("h3").exists()).toBe(false);
		const labels = dialog()
			.findAll("button")
			.map((b) => b.text())
			.filter(Boolean);
		expect(labels).toEqual([
			"save_conflict.option.close",
			"save_conflict.option.save_as_new",
		]);

		await dialogButton("save_conflict.option.close").trigger("click");
		await flushPromises();
		expect(trackEvent).toHaveBeenCalledWith("plan:save_conflict", {
			planet_natural_id: "KW-688c",
			is_deleted: true,
			choice: "close",
		});
		expect(dialog().exists()).toBe(false);
		// closing keeps the edits, unsaved
		expect(buildingAmounts(wrapper).EXT).toBe(5);
		expect(queryCalls("PatchPlan")).toHaveLength(1);
		expect(queryCalls("CreatePlan")).toEqual([]);
	});

	// -- changes from another tab ----------------------------------------

	function changed(uuids: string[] = [PLAN_UUID]) {
		remoteChange.value = {
			keys: [],
			uuids,
			seq: Math.random(),
		};
		return flushPromises();
	}

	it("loads a plan another tab saved while there are no edits", async () => {
		respond({ GetPlan: () => remotePlan() });
		const { wrapper } = await mountView({}, { login: true });

		await changed();

		expect(wrapper.find("h1").text()).toBe("Their name");
		expect(trackEvent).toHaveBeenCalledWith("app:remote_change", {
			object_type: "plan",
			has_unsaved_edits: false,
			is_deleted: false,
		});
		expect(mocks.toast).not.toHaveBeenCalled();
	});

	it("loads the plan when another tab's bulk action included it", async () => {
		respond({ GetPlan: () => remotePlan() });
		const { wrapper } = await mountView({}, { login: true });

		await changed(["another-plan", PLAN_UUID]);

		expect(wrapper.find("h1").text()).toBe("Their name");
	});

	it("only tells about a plan another tab saved while there are edits", async () => {
		respond({ GetPlan: () => remotePlan() });
		const { wrapper } = await mountView({}, { login: true });
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);

		await changed();

		expect(wrapper.find("h1").text()).toBe("EW COF RAT DW C");
		expect(trackEvent).toHaveBeenCalledWith("app:remote_change", {
			object_type: "plan",
			has_unsaved_edits: true,
			is_deleted: false,
		});
		const [text, options] = mocks.toast.mock.calls[0];
		expect(text).toBe("save_conflict.notice.saved_elsewhere");
		expect(options).toMatchObject({
			duration: 15_000,
			action: { label: "save_conflict.notice.reload" },
		});

		// the toast's action takes their version
		await options.action.onClick();
		await flushPromises();
		expect(wrapper.find("h1").text()).toBe("Their name");
		expect(buildingAmounts(wrapper).EXT).toBe(2);
	});

	it("replaces the earlier notice with the next one", async () => {
		respond({ GetPlan: () => remotePlan() });
		const { wrapper } = await mountView({}, { login: true });
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);

		await changed();
		const first = mocks.toast.mock.results[0].value;
		await changed();

		expect(first.destroy).toHaveBeenCalledTimes(1);
		expect(mocks.toast).toHaveBeenCalledTimes(2);

		wrapper.unmount();
		expect(mocks.toast.mock.results[1].value.destroy).toHaveBeenCalled();
	});

	it("ignores changes of other plans, a cleared change and the same version", async () => {
		respond({
			GetPlan: () => ({ ...etherwindPlan(), modified_at: "mine" }),
		});
		await mountView(
			{ planData: { ...etherwindPlan(), modified_at: "mine" } },
			{ login: true }
		);
		const before = queryCalls("GetPlan").length;

		await changed(["another-plan"]);
		await changed([]);
		remoteChange.value = null;
		await flushPromises();
		expect(queryCalls("GetPlan")).toHaveLength(before);

		// our own save echoes back as the version we already have
		await changed();
		expect(queryCalls("GetPlan")).toHaveLength(before + 1);
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("never reacts to another tab for a plan without a uuid", async () => {
		await mountView({ planData: newPlan() }, { login: true });

		await changed();

		expect(queryCalls("GetPlan")).toEqual([]);
	});

	it("tells that another tab deleted the plan", async () => {
		respond({
			GetPlan: () => {
				throw DELETED;
			},
		});
		await mountView({}, { login: true });

		await changed();

		expect(trackEvent).toHaveBeenCalledWith("app:remote_change", {
			object_type: "plan",
			has_unsaved_edits: false,
			is_deleted: true,
		});
		expect(mocks.toast).toHaveBeenCalledWith(
			"save_conflict.notice.deleted_elsewhere",
			{ type: "error", duration: 15_000 }
		);
	});

	it("ignores other failures while checking a change of another tab", async () => {
		respond({
			GetPlan: () => {
				throw new Error("offline");
			},
		});
		await mountView({}, { login: true });

		await changed();

		expect(mocks.toast).not.toHaveBeenCalled();
		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("offers a copy of a plan without an empire under the first one", async () => {
		respond({
			PatchPlan: () => {
				throw CONFLICT;
			},
			GetPlan: () => etherwindPlan(),
			CreatePlan: () => ({ uuid: "copy-uuid", modified_at: SAVED_AT }),
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountView(
			{
				planData: { ...etherwindPlan(), empires: [] },
				empireList: empires(),
			},
			{ login: true }
		);
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);
		press({ key: "s", ctrlKey: true });
		await vi.waitFor(() => expect(dialog().exists()).toBe(true));
		await flushPromises();

		await dialogButton("save_conflict.option.save_as_new").trigger("click");
		await flushPromises();

		const created = queryCalls("CreatePlan")[0][1].data;
		expect(created.plan_name).toBe("save_conflict.copy_name");
		expect(created.empire_uuid).toBe(empires()[0].uuid);
	});
});
