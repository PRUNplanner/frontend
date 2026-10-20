import {
	type Mounted,
	PLAN_UUID,
	SAVED_AT,
	SHARE_CX,
	SHARE_EMPIRE,
	SKY_CX,
	SKY_EMPIRE,
	buildingAmounts,
	constructionCart,
	cxs,
	debugPanel,
	dialog,
	draftPlan,
	emitFrom,
	empires,
	errors,
	lastTitle,
	mocks,
	mountView,
	newPlan,
	openTool,
	press,
	queryCalls,
	respond,
	setupPlanViewSuite,
	supplyCart,
} from "@/tests/views/PlanView.harness";
import { describe, it, expect, vi } from "vitest";
import {
	DOMWrapper,
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
import { PButton, PModal, PSelect } from "@/ui";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
import PlanInfrastructure from "@/features/planning/components/PlanInfrastructure.vue";
import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
import PlanSaveButton from "@/features/planning/components/PlanSaveButton.vue";
import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
import { calcDebug } from "@/lib/debugMode";
import { flushPlanEdits, trackEvent } from "@/lib/analytics/useAnalytics";
import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { etherwindPlan } from "@/tests/features/planning/usePlanCalculation.fixtures";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";

describe("PlanView", () => {
	setupPlanViewSuite();

	// #561: switching to another tool while the first one still loads and
	// shows its spinner left the view broken until a reload
	it("switches tools while the first tool still loads", async () => {
		const { wrapper } = await mountView();
		const toolTab = (label: string) =>
			wrapper
				.findAll("nav button")
				.find((b) => b.text() === `plan.tools.labels.${label}`)!;

		await toolTab("construction_cart").trigger("click");
		await flushPromises();
		// the fallback shows its spinner after 200 ms
		await new Promise((r) => setTimeout(r, 250));

		await toolTab("supply_cart").trigger("click");
		await flushPromises();
		constructionCart.open();
		supplyCart.open();
		await flushPromises();

		expect(errors).toEqual([]);
		expect(wrapper.text()).toContain("PlanSupplyCart");
		expect(wrapper.text()).not.toContain("PlanConstructionCart");
	});

	it("has no Debug button and loads no panel with debug off", async () => {
		calcDebug.value = false;
		const { wrapper } = await mountView();

		expect(wrapper.find("[data-calc-debug-button]").exists()).toBe(false);
		window.dispatchEvent(
			new KeyboardEvent("keydown", { code: "Backquote", ctrlKey: true })
		);
		await flushPromises();
		expect(debugPanel.loads).toBe(0);
	});

	it("opens the debug panel with the button and Ctrl+`", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountView();
		const button = wrapper.find("[data-calc-debug-button]");
		expect(button.exists()).toBe(true);

		await button.trigger("click");
		await flushPromises();
		expect(wrapper.text()).toContain("debug panel");
		expect(button.attributes("aria-pressed")).toBe("true");

		window.dispatchEvent(
			new KeyboardEvent("keydown", { code: "Backquote", metaKey: true })
		);
		await flushPromises();
		expect(wrapper.text()).not.toContain("debug panel");

		window.dispatchEvent(
			new KeyboardEvent("keydown", { code: "Backquote", ctrlKey: true })
		);
		await flushPromises();
		expect(wrapper.text()).toContain("debug panel");

		// the panel shows what save sends, a rename included
		await wrapper
			.findAll("nav button")
			.find((b) => b.text() === "plan.components.configuration.label")!
			.trigger("click");
		await flushPromises();
		wrapper
			.findComponent({ name: "PlanConfiguration" })
			.vm.$emit("update:plan-name", "Renamed plan");
		await flushPromises();
		expect(wrapper.text()).toContain("debug panel Renamed plan");
		calcDebug.value = false;
	});

	// -- header, title, history ------------------------------------------

	it("shows the plan under its empire with planet name and id", async () => {
		const { wrapper } = await mountView(
			{},
			{ seed: ({ planning }) => planning.setEmpires(empires()) }
		);

		const nav = wrapper.find("nav[aria-label='plan.breadcrumb']");
		expect(nav.text()).toBe("PRUN REAL›Etherwind (KW-688c)");
		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			"/empire"
		);
		expect(wrapper.find("h1").text()).toBe("EW COF RAT DW C");
		expect(lastTitle()).toBe("EW COF RAT DW C");
	});

	it("shows only the planet id and an untitled plan without names", async () => {
		mocks.getPlanet.mockResolvedValueOnce({
			...planet_etherwind,
			planet_name: planet_etherwind.planet_natural_id,
		});
		const { wrapper } = await mountView({
			planData: { ...newPlan(), plan_name: undefined },
		});

		expect(wrapper.find("nav[aria-label='plan.breadcrumb']").text()).toBe(
			"KW-688c"
		);
		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
		expect(wrapper.find("h1").text()).toBe("plan.name.untitled");
		expect(lastTitle()).toBe("KW-688c");
	});

	it("opens the configuration of a new plan and renames it", async () => {
		const { wrapper } = await mountView({ planData: newPlan() });

		const configuration = wrapper.findComponent(PlanConfiguration);
		expect(configuration.props("newPlan")).toBe(true);
		expect(configuration.props("planName")).toBeUndefined();

		configuration.vm.$emit("update:plan-name", "Fresh start");
		await flushPromises();

		expect(wrapper.find("h1").text()).toBe("Fresh start");
		expect(lastTitle()).toBe("Fresh start");
	});

	it("does not open the configuration of a shared plan", async () => {
		const { wrapper } = await mountView({
			planData: draftPlan(),
			shared: true,
			sharedPlanUuid: "shared-uuid",
		});

		expect(wrapper.findComponent(PlanConfiguration).exists()).toBe(false);
	});

	it("hides history and save controls on a disabled plan", async () => {
		const { wrapper } = await mountView(
			{ disabled: true },
			{ login: true }
		);

		expect(
			wrapper.find("button[aria-label='plan.history.undo']").exists()
		).toBe(false);
		expect(wrapper.findComponent(PlanSaveButton).exists()).toBe(false);
		expect(wrapper.findComponent(PlanProduction).props("disabled")).toBe(
			true
		);
	});

	it("undoes and redoes an edit with the buttons and the shortcut", async () => {
		const { wrapper } = await mountView();
		const undo = wrapper.find("button[aria-label='plan.history.undo']");
		const redo = wrapper.find("button[aria-label='plan.history.redo']");
		expect(undo.attributes("disabled")).toBeDefined();
		expect(redo.attributes("disabled")).toBeDefined();

		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);
		expect(buildingAmounts(wrapper).EXT).toBe(5);

		await undo.trigger("click");
		expect(buildingAmounts(wrapper).EXT).toBe(1);
		expect(trackEvent).toHaveBeenCalledWith("plan:undo", {
			trigger: "button",
		});

		await redo.trigger("click");
		expect(buildingAmounts(wrapper).EXT).toBe(5);
		expect(trackEvent).toHaveBeenCalledWith("plan:redo", {
			trigger: "button",
		});

		const undoKey = press({ key: "z", ctrlKey: true });
		await flushPromises();
		expect(undoKey.defaultPrevented).toBe(true);
		expect(buildingAmounts(wrapper).EXT).toBe(1);
		expect(trackEvent).toHaveBeenCalledWith("plan:undo", {
			trigger: "shortcut",
		});

		press({ key: "Z", metaKey: true, shiftKey: true });
		await flushPromises();
		expect(buildingAmounts(wrapper).EXT).toBe(5);
		expect(trackEvent).toHaveBeenCalledWith("plan:redo", {
			trigger: "shortcut",
		});
	});

	it("does not track an undo without history", async () => {
		await mountView();

		press({ key: "z", ctrlKey: true });
		press({ key: "z", ctrlKey: true, shiftKey: true });
		await flushPromises();

		expect(trackEvent).not.toHaveBeenCalled();
	});

	it("ignores the history shortcut in text fields and without a modifier", async () => {
		const { wrapper } = await mountView({}, { login: true });
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);
		const input = document.createElement("input");
		document.body.append(input);

		const inField = press({ key: "z", ctrlKey: true }, input);
		press({ key: "z" });
		await flushPromises();
		input.remove();

		expect(inField.defaultPrevented).toBe(false);
		expect(buildingAmounts(wrapper).EXT).toBe(5);
	});

	it("ignores the history shortcut on a disabled plan", async () => {
		await mountView({ disabled: true });

		const event = press({ key: "z", ctrlKey: true });

		expect(event.defaultPrevented).toBe(false);
	});

	it("asks the unsaved guard for edits and not for shared plans", async () => {
		const { wrapper } = await mountView();
		const [unsaved, message, onAsk] =
			vi.mocked(useUnsavedGuard).mock.calls[0];
		expect(unsaved()).toBe(false);

		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);
		expect(unsaved()).toBe(true);
		expect(message()).toBe("plan.notifications.leave_unsaved");
		onAsk!();
		expect(trackEvent).toHaveBeenCalledWith("plan:leave_unsaved", {
			planet_natural_id: "KW-688c",
		});
	});

	it("flushes pending edit events and stops listening on unmount", async () => {
		const { wrapper } = await mountView();
		wrapper.unmount();

		expect(flushPlanEdits).toHaveBeenCalled();
		const event = press({ key: "z", ctrlKey: true });
		expect(event.defaultPrevented).toBe(false);
	});

	// -- tools -----------------------------------------------------------

	it("offers POPR only to logged in users", async () => {
		const anonymous = await mountView();
		const labels = () =>
			anonymous.wrapper.findAll("nav button").map((b) => b.text());
		expect(labels()).not.toContain("plan.tools.labels.popr");
		anonymous.wrapper.unmount();

		const { wrapper } = await mountView({}, { login: true });
		expect(wrapper.text()).toContain("plan.tools.labels.popr");
	});

	it("hands each tool the plan data it needs and toggles it shut", async () => {
		const { wrapper } = await mountView({}, { login: true });
		const attrs = (name: string) =>
			wrapper.findComponent({ name }).vm.$attrs as Record<string, any>;

		await openTool(wrapper, "plan.tools.labels.popr");
		expect(attrs("PlanPOPR").planetNaturalId).toBe("KW-688c");
		expect(attrs("PlanPOPR").workforceData.pioneer).toBeDefined();
		expect(trackEvent).toHaveBeenCalledWith("plan:tool_toggle", {
			tool_name: "popr",
		});

		await openTool(wrapper, "plan.tools.labels.visitation_frequency");
		expect(wrapper.findComponent({ name: "PlanPOPR" }).exists()).toBe(
			false
		);
		expect(attrs("PlanVisitationFrequency")).toMatchObject({
			disabled: false,
			planUuid: PLAN_UUID,
		});

		await openTool(wrapper, "plan.tools.labels.repair_analysis");
		const repair = attrs("PlanRepairAnalysis");
		expect(repair.planetNaturalId).toBe("KW-688c");
		expect(repair.shared).toBe(false);
		expect(repair.data.map((b: { name: string }) => b.name).sort()).toEqual(
			["EXT", "FP", "HYF", "INC", "RIG"]
		);

		await openTool(wrapper, "plan.tools.labels.profit_breakdown");
		expect(attrs("PlanProfitBreakdown").buildings).toHaveLength(5);

		await openTool(wrapper, "plan.tools.labels.plan_check");
		expect(attrs("PlanCheck")).toMatchObject({
			planUuid: PLAN_UUID,
			planet: planet_etherwind,
		});

		constructionCart.open();
		supplyCart.open();
		await openTool(wrapper, "plan.tools.labels.supply_cart");
		expect(wrapper.text()).toContain("PlanSupplyCart");
		await openTool(wrapper, "plan.tools.labels.construction_cart");
		expect(wrapper.text()).toContain("PlanConstructionCart");

		// the open tab closes it again
		await openTool(wrapper, "plan.tools.labels.construction_cart");
		expect(wrapper.text()).not.toContain("PlanConstructionCart");
		expect(wrapper.find("nav button[aria-pressed='true']").exists()).toBe(
			false
		);
	});

	it("opens the plan check on its market view from the material I/O", async () => {
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		const { wrapper } = await mountView();
		usePlanCheckView().view.value = "compare" as never;

		await emitFrom(wrapper, PlanMaterialIO, "open:plan-check");
		await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
		expect(usePlanCheckView().view.value).toBe("market");
		expect(wrapper.findComponent({ name: "PlanCheck" }).exists()).toBe(
			true
		);

		// already open: stays open, still scrolls into view
		await emitFrom(wrapper, PlanMaterialIO, "open:plan-check");
		await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
		expect(wrapper.findComponent({ name: "PlanCheck" }).exists()).toBe(
			true
		);
	});

	it("flips the material I/O between weight/volume and money and splits it", async () => {
		const { wrapper } = await mountView();
		expect(wrapper.findAllComponents(PlanMaterialIO)).toHaveLength(1);
		expect(wrapper.findComponent(PlanMaterialIO).props("showBasked")).toBe(
			false
		);

		await wrapper
			.find(
				"button[aria-label='plan.components.materialio.buttons.toggle_weight_volume']"
			)
			.trigger("click");
		expect(wrapper.findComponent(PlanMaterialIO).props("showBasked")).toBe(
			true
		);

		await wrapper
			.find(
				"button[aria-label='plan.components.materialio.buttons.toggle_production_workforce']"
			)
			.trigger("click");
		const split = wrapper.findAllComponents(PlanMaterialIO);
		expect(split).toHaveLength(2);
		expect(split.every((m) => m.props("showBasked"))).toBe(true);
		expect(wrapper.text()).toContain(
			"plan.components.materialio.label_production"
		);
		expect(wrapper.text()).toContain(
			"plan.components.materialio.label_workforce"
		);
	});

	// -- calculation debug -----------------------------------------------

	it("describes the plan for the debug panel", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountView(
			{ planData: { ...newPlan(), plan_name: undefined } },
			{
				seed: ({ planning }) => planning.setCXs(cxs()),
			}
		);
		await wrapper.find("[data-calc-debug-button]").trigger("click");
		await flushPromises();
		const meta = () =>
			wrapper.findComponent({ name: "PlanCalcDebug" }).props("meta");

		expect(meta()).toEqual({
			plan: "plan.name.untitled",
			planet: "KW-688c",
			cx: "Universe",
			empire: "none",
		});
		calcDebug.value = false;
	});

	it("names the empire and the CX of the plan in the debug panel", async () => {
		calcDebug.value = true;
		const { wrapper, planning } = await mountView(
			{ empireList: empires() },
			{ seed: ({ planning }) => planning.setCXs(cxs()) }
		);
		await wrapper.find("[data-calc-debug-button]").trigger("click");
		await flushPromises();

		const panel = wrapper.findComponent({ name: "PlanCalcDebug" });
		expect(panel.props("meta")).toEqual({
			plan: "EW COF RAT DW C",
			planet: "KW-688c",
			cx: "PRUN CX REAL",
			empire: "Sky Productions",
		});
		expect(panel.props("plan")).toMatchObject({
			uuid: PLAN_UUID,
			plan_name: "EW COF RAT DW C",
		});

		// the CX uuid stands in for a CX the store does not know
		planning.cxs = {};
		await flushPromises();
		expect(panel.props("meta").cx).toBe(SKY_CX);
		calcDebug.value = false;
	});

	it("keeps the debug shortcut out of text fields", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountView();
		const input = document.createElement("input");
		document.body.append(input);

		const event = press({ code: "Backquote", ctrlKey: true }, input);
		await flushPromises();
		input.remove();

		expect(event.defaultPrevented).toBe(false);
		expect(wrapper.text()).not.toContain("debug panel");
		calcDebug.value = false;
	});

	// -- saving ----------------------------------------------------------

	const saved = { uuid: PLAN_UUID, modified_at: SAVED_AT };

	it("saves an existing plan with the version it started from", async () => {
		respond({ PatchPlan: () => saved, GetPlan: () => etherwindPlan() });
		const { wrapper } = await mountView(
			{ planData: { ...etherwindPlan(), modified_at: "v1" } },
			{ login: true }
		);
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);
		expect(wrapper.findComponent(PlanSaveButton).props("modified")).toBe(
			true
		);

		press({ key: "s", ctrlKey: true });
		await flushPromises();

		const patch = queryCalls("PatchPlan")[0];
		expect(patch[1].planUuid).toBe(PLAN_UUID);
		expect(patch[1].data).toMatchObject({
			uuid: PLAN_UUID,
			base_modified_at: "v1",
		});
		expect(
			patch[1].data.plan_data.buildings.find(
				(b: { name: string }) => b.name === "EXT"
			).amount
		).toBe(5);
		expect(flushPlanEdits).toHaveBeenCalled();
		expect(trackEvent).toHaveBeenCalledWith("plan:save", {
			planet_natural_id: "KW-688c",
			trigger: "shortcut",
		});
		expect(wrapper.findComponent(PlanSaveButton).props("modified")).toBe(
			false
		);

		// the next save sends the version of this one
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 6);
		wrapper.findComponent(PlanSaveButton).vm.$emit("save");
		await flushPromises();
		const patches = queryCalls("PatchPlan");
		expect(patches[1][1].data.base_modified_at).toBe(SAVED_AT);
		expect(trackEvent).toHaveBeenCalledWith("plan:save", {
			planet_natural_id: "KW-688c",
			trigger: "button",
		});
	});

	it("keeps the edits and offers a retry when saving fails", async () => {
		respond({
			PatchPlan: () => {
				throw new Error("offline");
			},
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountView({}, { login: true });
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);

		press({ key: "s", metaKey: true });
		await flushPromises();

		expect(mocks.toast).toHaveBeenCalledWith(
			"plan.save_status.failed_message",
			{ type: "error" }
		);
		const button = wrapper.findComponent(PlanSaveButton);
		expect(button.props("failed")).toBe(true);
		expect(button.props("modified")).toBe(true);
		expect(button.props("saving")).toBe(false);
	});

	it("does not save with the shortcut when it cannot", async () => {
		// not logged in
		const anonymous = await mountView();
		const blocked = press({ key: "s", ctrlKey: true });
		await flushPromises();
		expect(blocked.defaultPrevented).toBe(true);
		anonymous.wrapper.unmount();

		// unnamed
		const unnamed = await mountView(
			{ planData: { ...etherwindPlan(), plan_name: "" } },
			{ login: true }
		);
		press({ key: "s", ctrlKey: true });
		await flushPromises();
		unnamed.wrapper.unmount();

		// read only
		await mountView({ disabled: true }, { login: true });
		press({ key: "s", ctrlKey: true });
		await flushPromises();

		expect(queryCalls("CreatePlan")).toEqual([]);
		expect(queryCalls("PatchPlan")).toEqual([]);
	});

	it("creates a new plan, remembers the hab setting and opens it", async () => {
		respond({
			CreatePlan: () => ({ uuid: "new-uuid", modified_at: SAVED_AT }),
			GetPlan: () => etherwindPlan(),
		});
		const { wrapper, user } = await mountView(
			{ planData: newPlan() },
			{ login: true }
		);
		await emitFrom(wrapper, PlanConfiguration, "update:plan-name", "Mine");
		wrapper.findComponent(PlanSaveButton).vm.$emit("save");
		await flushPromises();

		const create = queryCalls("CreatePlan")[0];
		expect(create[1].data.plan_name).toBe("Mine");
		expect(
			user.preferences.planOverrides["new-uuid"].autoOptimizeHabs
		).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("plan:create", {
			planet_natural_id: "KW-688c",
			is_first_plan: true,
		});
		expect(mocks.push).toHaveBeenCalledWith("/plan/KW-688c/new-uuid");
	});

	it("is not the first plan when the account already has plans", async () => {
		respond({
			CreatePlan: () => ({ uuid: "new-uuid", modified_at: SAVED_AT }),
		});
		const { wrapper } = await mountView(
			{ planData: { ...newPlan(), plan_name: "Mine" } },
			{
				login: true,
				seed: ({ planning }) => planning.setPlan(etherwindPlan()),
			}
		);

		wrapper.findComponent(PlanSaveButton).vm.$emit("save");
		await flushPromises();

		expect(trackEvent).toHaveBeenCalledWith("plan:create", {
			planet_natural_id: "KW-688c",
			is_first_plan: false,
		});
	});

	it("reports a failed creation and stays on the page", async () => {
		respond({
			CreatePlan: () => {
				throw new Error("offline");
			},
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountView(
			{ planData: { ...newPlan(), plan_name: "Mine" } },
			{ login: true }
		);

		wrapper.findComponent(PlanSaveButton).vm.$emit("save");
		await flushPromises();

		expect(mocks.toast).toHaveBeenCalledWith(
			"plan.save_status.failed_message",
			{ type: "error" }
		);
		expect(mocks.push).not.toHaveBeenCalled();
	});

	it("saves edits made while the plan was being created before it leaves", async () => {
		const editing: { wrapper?: VueWrapper } = {};
		respond({
			CreatePlan: async () => {
				await emitFrom(
					editing.wrapper!,
					PlanProduction,
					"update:building:amount",
					0,
					7
				);
				return { uuid: "new-uuid", modified_at: SAVED_AT };
			},
			PatchPlan: () => ({ uuid: "new-uuid", modified_at: "later" }),
			GetPlan: () => etherwindPlan(),
		});
		const { wrapper } = await mountView(
			{ planData: { ...draftPlan(), plan_name: "Mine" } },
			{ login: true }
		);
		editing.wrapper = wrapper;

		wrapper.findComponent(PlanSaveButton).vm.$emit("save");
		await flushPromises();

		const patch = queryCalls("PatchPlan")[0];
		expect(patch[1].planUuid).toBe("new-uuid");
		expect(patch[1].data.base_modified_at).toBe(SAVED_AT);
		expect(wrapper.findComponent(PlanSaveButton).props("modified")).toBe(
			false
		);
		expect(mocks.push).toHaveBeenCalledWith("/plan/KW-688c/new-uuid");
	});

	it("does not open a new plan whose later edits fail to save", async () => {
		const editing: { wrapper?: VueWrapper } = {};
		respond({
			CreatePlan: async () => {
				await emitFrom(
					editing.wrapper!,
					PlanProduction,
					"update:building:amount",
					0,
					7
				);
				return { uuid: "new-uuid", modified_at: SAVED_AT };
			},
			PatchPlan: () => {
				throw new Error("offline");
			},
			GetPlan: () => etherwindPlan(),
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper } = await mountView(
			{ planData: { ...draftPlan(), plan_name: "Mine" } },
			{ login: true }
		);
		editing.wrapper = wrapper;

		wrapper.findComponent(PlanSaveButton).vm.$emit("save");
		await flushPromises();

		expect(mocks.push).not.toHaveBeenCalled();
		expect(wrapper.findComponent(PlanSaveButton).props("failed")).toBe(
			true
		);
	});

	// -- save as ---------------------------------------------------------

	const createButton = () =>
		dialog()
			.findAll("button")
			.find((b) => b.text() === "common.buttons.create")!;

	async function openSaveAs(mounted: Mounted) {
		mounted.wrapper.findComponent(PlanMoreMenu).vm.$emit("save-as");
		await flushPromises();
	}

	it("offers a copy under the current empire and plan name", async () => {
		const mounted = await mountView(
			{ empireList: empires() },
			{ login: true }
		);
		await openSaveAs(mounted);

		const modal = dialog();
		expect(modal.text()).toContain("plan.components.save_as.title");
		expect((modal.find("input").element as HTMLInputElement).value).toBe(
			"EW COF RAT DW C (Copy)"
		);
		expect(modal.text()).toContain("plan.components.save_as.form.empire");
	});

	it("leaves the copy's name empty for an unnamed plan and blocks creating", async () => {
		const mounted = await mountView(
			{ planData: newPlan() },
			{ login: true }
		);
		await openSaveAs(mounted);

		const create = dialog()
			.findAll("button")
			.find((b) => b.text() === "common.buttons.create")!;
		expect(create.attributes("disabled")).toBeDefined();
		expect(dialog().text()).not.toContain(
			"plan.components.save_as.form.empire"
		);

		// an empty name saves nothing even when forced
		mounted.wrapper
			.findAllComponents(PButton)
			.find(
				(b) =>
					b.text() === "common.buttons.create" &&
					dialog().element.contains(b.element)
			)!
			.vm.$emit("click");
		await flushPromises();
		expect(queryCalls("CreatePlan")).toEqual([]);
		expect(queryCalls("PatchPlan")).toEqual([]);
	});

	it("creates the copy in a new tab", async () => {
		respond({
			CreatePlan: () => ({ uuid: "copy-uuid", modified_at: SAVED_AT }),
		});
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		const mounted = await mountView(
			{ empireList: empires() },
			{ login: true }
		);
		await openSaveAs(mounted);

		await dialog().find("input").setValue("  My copy  ");
		await dialog()
			.findAll("button")
			.find((b) => b.text() === "common.buttons.create")!
			.trigger("click");
		await flushPromises();

		const create = queryCalls("CreatePlan")[0];
		expect(create[1].data).toMatchObject({
			plan_name: "My copy",
			empire_uuid: SKY_EMPIRE,
		});
		expect(
			mounted.user.preferences.planOverrides["copy-uuid"]
		).toBeDefined();
		expect(trackEvent).toHaveBeenCalledWith("plan:save_as", {
			planet_natural_id: "KW-688c",
		});
		expect(open).toHaveBeenCalledWith("/plan/KW-688c/copy-uuid", "_blank");
		expect(dialog().exists()).toBe(false);
	});

	it("keeps the dialog open when the copy cannot be created", async () => {
		respond({
			CreatePlan: () => {
				throw new Error("offline");
			},
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		const mounted = await mountView({}, { login: true });
		await openSaveAs(mounted);

		await dialog()
			.findAll("button")
			.find((b) => b.text() === "common.buttons.create")!
			.trigger("click");
		await flushPromises();

		expect(open).not.toHaveBeenCalled();
		expect(dialog().exists()).toBe(true);

		await dialog()
			.findAll("button")
			.find((b) => b.text() === "common.buttons.cancel")!
			.trigger("click");
		expect(dialog().exists()).toBe(false);
	});

	// -- reloading -------------------------------------------------------

	it("reloads the saved plan and drops the history", async () => {
		const savedPlan = { ...etherwindPlan(), plan_name: "Saved name" };
		const { wrapper } = await mountView(
			{},
			{
				login: true,
				seed: ({ planning }) => planning.setPlan(savedPlan),
			}
		);
		wrapper.findComponent(PlanMoreMenu).vm.$emit("reload");
		await flushPromises();

		expect(wrapper.find("h1").text()).toBe("Saved name");
		expect(trackEvent).toHaveBeenCalledWith("plan:reload", {
			planet_natural_id: "KW-688c",
		});
	});

	it("asks before a reload throws edits away", async () => {
		const savedPlan = { ...etherwindPlan(), plan_name: "Saved name" };
		const confirmReload = vi.fn(() => false);
		vi.stubGlobal("confirm", confirmReload);
		const { wrapper } = await mountView(
			{},
			{
				login: true,
				seed: ({ planning }) => planning.setPlan(savedPlan),
			}
		);
		await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);

		wrapper.findComponent(PlanMoreMenu).vm.$emit("reload");
		await flushPromises();
		expect(confirmReload).toHaveBeenCalledWith(
			"plan.actions.reload_confirm"
		);
		expect(buildingAmounts(wrapper).EXT).toBe(5);

		confirmReload.mockReturnValue(true);
		wrapper.findComponent(PlanMoreMenu).vm.$emit("reload");
		await flushPromises();
		expect(buildingAmounts(wrapper).EXT).toBe(1);
		expect(wrapper.find("h1").text()).toBe("Saved name");
	});

	it("cannot reload a plan that was never saved", async () => {
		const { wrapper } = await mountView(
			{ planData: newPlan() },
			{ login: true }
		);

		wrapper.findComponent(PlanMoreMenu).vm.$emit("reload");
		await flushPromises();

		expect(String(errors[0])).toContain("Unable to reload plan");
	});

	// -- tools, menus and modals ----------------------------------------
	it("closes a tool by toggling its tab again", async () => {
		const { wrapper } = await mountView();
		const label = "plan.components.configuration.label";

		await openTool(wrapper, label);
		expect(wrapper.findComponent(PlanInfrastructure).exists()).toBe(true);

		await openTool(wrapper, label);
		expect(wrapper.findComponent(PlanInfrastructure).exists()).toBe(false);
	});

	it("switches the empire and its CX from the configuration", async () => {
		const { wrapper } = await mountView(
			{ empireList: empires() },
			{ seed: ({ planning }) => planning.setCXs(cxs()) }
		);
		await openTool(wrapper, "plan.components.configuration.label");
		const configuration = () => wrapper.findComponent(PlanConfiguration);
		expect(configuration().props("cxUuid")).toBe(SKY_CX);

		await emitFrom(
			wrapper,
			PlanConfiguration,
			"update:active-empire",
			SHARE_EMPIRE
		);

		expect(configuration().props("activeEmpire")).toMatchObject({
			uuid: SHARE_EMPIRE,
		});
		expect(configuration().props("cxUuid")).toBe(SHARE_CX);
	});

	it("opens the sharing of a saved plan and closes it again", async () => {
		const { wrapper } = await mountView({}, { login: true });
		const modal = () => wrapper.findComponent({ name: "SharingModal" });
		expect(modal().props("show")).toBe(false);

		await emitFrom(wrapper, PlanMoreMenu, "share");
		expect(modal().props("show")).toBe(true);

		modal().vm.$emit("update:show", false);
		await flushPromises();
		expect(modal().props("show")).toBe(false);
	});

	it("closes the debug panel from the panel itself", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountView();
		await wrapper.find("[data-calc-debug-button]").trigger("click");
		await flushPromises();
		const panel = () => wrapper.findComponent({ name: "PlanCalcDebug" });
		expect(panel().exists()).toBe(true);

		panel().vm.$emit("update:show", false);
		await flushPromises();

		expect(panel().exists()).toBe(false);
	});

	it("explains the history and material controls on hover", async () => {
		const { wrapper } = await mountView({}, { login: true });
		const labels = [
			"plan.history.undo",
			"plan.history.redo",
			"plan.components.materialio.buttons.toggle_weight_volume",
			"plan.components.materialio.buttons.toggle_production_workforce",
		];

		const tooltips = () =>
			[...document.body.querySelectorAll("[role=tooltip]")].map((e) =>
				e.textContent?.trim()
			);
		for (const label of labels) {
			expect(tooltips()).not.toContain(label);
			// the disabled undo button takes no events, the wrapper does
			const trigger = wrapper.find(`button[aria-label='${label}']`)
				.element.parentElement!;
			await new DOMWrapper(trigger).trigger("mouseenter");
			await flushPromises();
			expect(tooltips()).toContain(label);
			await new DOMWrapper(trigger).trigger("mouseleave");
		}
	});

	it("creates a copy for the empire picked in the dialog", async () => {
		respond({
			CreatePlan: () => ({ uuid: "copy-uuid", modified_at: SAVED_AT }),
		});
		vi.spyOn(window, "open").mockImplementation(() => null);
		const mounted = await mountView(
			{ empireList: empires() },
			{ login: true }
		);
		await openSaveAs(mounted);

		mounted.wrapper
			.findAllComponents(PSelect)
			.find((c) => dialog().element.contains(c.element))!
			.vm.$emit("update:value", SHARE_EMPIRE);
		await flushPromises();
		await createButton().trigger("click");
		await flushPromises();

		expect(queryCalls("CreatePlan")[0][1].data.empire_uuid).toBe(
			SHARE_EMPIRE
		);
	});

	it("closes the copy dialog without saving", async () => {
		const mounted = await mountView({}, { login: true });
		await openSaveAs(mounted);
		expect(dialog().exists()).toBe(true);

		mounted.wrapper
			.findAllComponents(PModal)
			.find((m) => m.props("show"))!
			.vm.$emit("update:show", false);
		await flushPromises();

		expect(dialog().exists()).toBe(false);
		expect(queryCalls("CreatePlan")).toEqual([]);
	});
});
