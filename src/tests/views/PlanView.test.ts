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
	openDebug,
	openTool,
	press,
	rename,
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
import PlanBase from "@/features/planning/components/PlanBase.vue";
import PlanResultsBar from "@/features/planning/components/PlanResultsBar.vue";
import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
import PlanSaveButton from "@/features/planning/components/PlanSaveButton.vue";
import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
import { calcDebug } from "@/lib/debugMode";
import { flushPlanEdits, trackEvent } from "@/lib/analytics/useAnalytics";
import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { etherwindPlan } from "@/tests/features/planning/usePlanCalculation.fixtures";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";

// the production list stays mounted under a tool, v-show hides it
const productionShown = (wrapper: VueWrapper): boolean =>
	(wrapper.find("[data-production]").element as HTMLElement).style
		.display !== "none";

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

	it("has no Debug item and loads no panel with debug off", async () => {
		calcDebug.value = false;
		const { wrapper } = await mountView();

		expect(wrapper.findComponent(PlanMoreMenu).props("debug")).toBe(false);
		window.dispatchEvent(
			new KeyboardEvent("keydown", { code: "Backquote", ctrlKey: true })
		);
		await flushPromises();
		expect(debugPanel.loads).toBe(0);
	});

	it("opens the debug panel with the button and Ctrl+`", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountView();
		expect(wrapper.findComponent(PlanMoreMenu).props("debug")).toBe(true);

		await openDebug(wrapper);
		expect(wrapper.text()).toContain("debug panel");

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
		await rename(wrapper, "Renamed plan");
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

	it("names an unnamed planet after its system, an untitled plan by id", async () => {
		mocks.getPlanet.mockResolvedValueOnce({
			...planet_etherwind,
			planet_name: planet_etherwind.planet_natural_id,
		});
		const { wrapper } = await mountView({
			planData: { ...newPlan(), plan_name: undefined },
		});

		expect(wrapper.find("nav[aria-label='plan.breadcrumb']").text()).toBe(
			"New Antares c (KW-688c)"
		);
		expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
		// a new plan starts with naming it
		expect(wrapper.find("h1").exists()).toBe(false);
		expect(
			wrapper.find("input[aria-label='plan.header.name']").exists()
		).toBe(true);
		expect(lastTitle()).toBe("KW-688c");

		await wrapper
			.find("input[aria-label='plan.header.name']")
			.trigger("keydown", { key: "Escape" });
		expect(wrapper.find("h1").text()).toBe("plan.name.untitled");
	});

	it("starts a new plan with naming it in the header", async () => {
		const { wrapper } = await mountView(
			{ planData: newPlan() },
			{ login: true }
		);

		await rename(wrapper, "Fresh start");

		expect(wrapper.find("h1").text()).toBe("Fresh start");
		expect(lastTitle()).toBe("Fresh start");
	});

	it("renames a saved plan from the pencil, Escape keeps the name", async () => {
		const { wrapper } = await mountView();

		await wrapper
			.find("button[aria-label='plan.header.rename']")
			.trigger("click");
		const input = wrapper.find("input[aria-label='plan.header.name']");
		await input.setValue("Not this");
		await input.trigger("keydown", { key: "Escape" });
		expect(wrapper.find("h1").text()).toBe("EW COF RAT DW C");

		await rename(wrapper, "That one");
		expect(wrapper.find("h1").text()).toBe("That one");
	});

	it("does not start a shared plan's copy in rename mode", async () => {
		const { wrapper } = await mountView({
			planData: draftPlan(),
			shared: true,
			sharedPlanUuid: "shared-uuid",
		});

		expect(wrapper.find("h1").exists()).toBe(true);
		expect(
			wrapper.find("input[aria-label='plan.header.name']").exists()
		).toBe(false);
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
			panel: "popr",
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
			own: true,
		});

		constructionCart.open();
		supplyCart.open();
		await openTool(wrapper, "plan.tools.labels.supply_cart");
		expect(wrapper.text()).toContain("PlanSupplyCart");
		await openTool(wrapper, "plan.tools.labels.construction_cart");
		expect(wrapper.text()).toContain("PlanConstructionCart");

		// the open tab closes it again, back to the production list
		await openTool(wrapper, "plan.tools.labels.construction_cart");
		expect(wrapper.text()).not.toContain("PlanConstructionCart");
		expect(wrapper.find("nav button[aria-pressed='true']").text()).toBe(
			"plan.tools.labels.production"
		);
		expect(productionShown(wrapper)).toBe(true);
	});

	it("shows a tool in place of the production list and folds the panes", async () => {
		const { wrapper } = await mountView();
		const strip = (name: string) => wrapper.find(`[data-${name}-strip]`);
		expect(strip("base").exists()).toBe(false);
		expect(strip("io").exists()).toBe(false);

		constructionCart.open();
		await openTool(wrapper, "plan.tools.labels.construction_cart");
		expect(productionShown(wrapper)).toBe(false);
		expect(strip("base").exists()).toBe(true);
		expect(strip("io").exists()).toBe(false);

		await openTool(wrapper, "plan.tools.labels.plan_check");
		expect(strip("base").exists()).toBe(true);
		expect(strip("io").exists()).toBe(true);

		// a strip pins its pane open, Fold folds it again
		await strip("base").trigger("click");
		expect(strip("base").exists()).toBe(false);
		expect(trackEvent).toHaveBeenCalledWith("plan:panel_fold", {
			panel: "base",
			folded: false,
		});
		await wrapper
			.find("[data-base-pane]")
			.findAll("button")
			.find((b) => b.text() === "plan.layout.fold")!
			.trigger("click");
		expect(strip("base").exists()).toBe(true);

		// a pinned pane stays open over tool switches
		await strip("io").trigger("click");
		expect(strip("io").exists()).toBe(false);
		await openTool(wrapper, "plan.tools.labels.repair_analysis");
		expect(strip("io").exists()).toBe(false);
		expect(strip("base").exists()).toBe(true);

		await openTool(wrapper, "plan.tools.labels.production");
		expect(productionShown(wrapper)).toBe(true);
		expect(strip("base").exists()).toBe(false);
	});

	it("opens the plan check on its market view from the material I/O", async () => {
		const { wrapper } = await mountView();
		usePlanCheckView().view.value = "compare" as never;

		await emitFrom(wrapper, PlanMaterialIO, "open:plan-check");
		await vi.waitFor(() =>
			expect(wrapper.findComponent({ name: "PlanCheck" }).exists()).toBe(
				true
			)
		);
		expect(usePlanCheckView().view.value).toBe("market");
		expect(productionShown(wrapper)).toBe(false);

		// already open: stays open
		await emitFrom(wrapper, PlanMaterialIO, "open:plan-check");
		expect(wrapper.findComponent({ name: "PlanCheck" }).exists()).toBe(
			true
		);
	});

	it("switches the material I/O source, filter and value", async () => {
		const { wrapper } = await mountView();
		const io = () => wrapper.findComponent(PlanMaterialIO);
		const pane = () => wrapper.find("[data-io-pane]");
		const toggle = async (label: string) => {
			await pane()
				.findAll("button[aria-pressed]")
				.find((b) => b.text() === label)!
				.trigger("click");
			await flushPromises();
		};
		expect(io().props()).toMatchObject({ value: "price", filter: "all" });
		const whole = io().props("materialIOData");

		await toggle("t");
		expect(io().props("value")).toBe("weight");
		await toggle("m³");
		expect(io().props("value")).toBe("volume");
		await toggle("plan.io.filter.imports");
		expect(io().props("filter")).toBe("imports");

		const source = pane().findComponent(PSelect);
		source.vm.$emit("update:value", "production");
		await flushPromises();
		expect(io().props("materialIOData")).not.toBe(whole);
		// market flags and the plan totals belong to the whole base
		expect(io().props("checks")).toBeUndefined();
		expect(pane().text()).not.toContain("plan.io.profit");

		source.vm.$emit("update:value", "workforce");
		await flushPromises();
		source.vm.$emit("update:value", "all");
		await flushPromises();
		expect(io().props("materialIOData")).toStrictEqual(whole);
		expect(pane().text()).toContain("plan.io.profit");
	});

	it("downloads the material I/O as CSV from the ⋯ menu", async () => {
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined);
		vi.stubGlobal("URL", {
			...URL,
			createObjectURL: vi.fn(() => "blob:csv"),
			revokeObjectURL: vi.fn(),
		});
		const { wrapper } = await mountView();

		await emitFrom(wrapper, PlanMoreMenu, "csv");

		expect(click).toHaveBeenCalledTimes(1);
		expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
			"EW COF RAT DW C-material-io.csv"
		);
	});

	it("opens Base as an overlay on a narrow page, Close and Esc shut it", async () => {
		const { wrapper } = await mountView();
		const base = () => wrapper.find("[data-base-pane]");
		const toggle = () =>
			wrapper
				.findAllComponents(PButton)
				.find(
					(b) =>
						b.text() === "plan.base.label" &&
						b.attributes("aria-expanded") !== undefined
				)!;
		expect(base().classes()).toContain("md:@max-[81rem]:hidden");

		await toggle().trigger("click");
		expect(toggle().attributes("aria-expanded")).toBe("true");
		expect(base().classes()).toContain("md:@max-[81rem]:absolute");

		await base()
			.findAll("button")
			.find((b) => b.text() === "plan.layout.close")!
			.trigger("click");
		expect(base().classes()).toContain("md:@max-[81rem]:hidden");

		await toggle().trigger("click");
		await base().trigger("keydown", { key: "Escape" });
		expect(toggle().attributes("aria-expanded")).toBe("false");
	});

	it("opens Material I/O as an overlay on a tablet-wide page, Close and Esc shut it", async () => {
		const { wrapper } = await mountView();
		const io = () => wrapper.find("[data-io-pane]");
		const toggle = () => wrapper.find("[data-io-toggle]");
		expect(io().classes()).toContain("md:@max-[71rem]:hidden");

		await toggle().trigger("click");
		expect(toggle().attributes("aria-expanded")).toBe("true");
		expect(io().classes()).toContain("md:@max-[71rem]:absolute");
		expect(trackEvent).toHaveBeenCalledWith("plan:overlay_open", {
			panel: "io",
		});
		// switching what it shows tracks the whole view
		await io()
			.findAll("button")
			.find((b) => b.text() === "%")!
			.trigger("click");
		expect(trackEvent).toHaveBeenCalledWith("plan:io_view", {
			source: "all",
			filter: "all",
			value: "share",
		});

		await io()
			.findAll("button")
			.find((b) => b.text() === "plan.layout.close")!
			.trigger("click");
		expect(io().classes()).toContain("md:@max-[71rem]:hidden");

		await toggle().trigger("click");
		await io().trigger("keydown", { key: "Escape" });
		expect(toggle().attributes("aria-expanded")).toBe("false");
	});

	it("opens the planet insights from Base", async () => {
		const { wrapper } = await mountView();

		await emitFrom(wrapper, PlanBase, "open:insights");

		expect(mocks.openInsights).toHaveBeenCalledTimes(1);
	});

	it("folds a pinned Material I/O again", async () => {
		const { wrapper } = await mountView();
		await openTool(wrapper, "plan.tools.labels.plan_check");
		await wrapper.find("[data-io-strip]").trigger("click");
		expect(wrapper.find("[data-io-strip]").exists()).toBe(false);

		await wrapper
			.find("[data-io-pane]")
			.findAll("button")
			.find((b) => b.text() === "plan.layout.fold")!
			.trigger("click");

		expect(wrapper.find("[data-io-strip]").exists()).toBe(true);
		expect(trackEvent).toHaveBeenCalledWith("plan:panel_fold", {
			panel: "io",
			folded: true,
		});
	});

	it("names the CSV of an unnamed plan after its planet", async () => {
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => undefined);
		vi.stubGlobal("URL", {
			...URL,
			createObjectURL: vi.fn(() => "blob:csv"),
			revokeObjectURL: vi.fn(),
		});
		const { wrapper } = await mountView({
			planData: { ...etherwindPlan(), plan_name: "" },
		});

		await emitFrom(wrapper, PlanMoreMenu, "csv");

		expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
			"KW-688c-material-io.csv"
		);
	});

	it("keeps the name when the rename changes nothing", async () => {
		const { wrapper } = await mountView();

		await rename(wrapper, "EW COF RAT DW C");

		expect(wrapper.find("h1").text()).toBe("EW COF RAT DW C");
		expect(
			wrapper.find("button[aria-label='plan.history.undo']").attributes(
				"disabled"
			)
		).toBeDefined();
	});

	it("shows the plan's results once, in the results bar", async () => {
		const { wrapper } = await mountView();
		const bar = wrapper.findComponent(PlanResultsBar);

		expect(bar.props("area")).toMatchObject({ permits: expect.any(Number) });
		expect(bar.props("overview").profit).toEqual(expect.any(Number));
		expect(bar.props("compare")).toBeUndefined();
		expect(wrapper.findComponent({ name: "PlanOverview" }).exists()).toBe(
			false
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
		await openDebug(wrapper);
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
		await openDebug(wrapper);

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
		await rename(wrapper, "Mine");
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
	it("keeps Base in view and edits the plan from it", async () => {
		const { wrapper } = await mountView();
		const base = () => wrapper.findComponent(PlanBase);
		expect(base().exists()).toBe(true);

		await emitFrom(wrapper, PlanBase, "update:cogc", "AGRICULTURE");
		expect(base().props("result").cogc).toBe("AGRICULTURE");
		await emitFrom(wrapper, PlanBase, "update:permits", 2);
		expect(base().props("result").area.permits).toBe(2);
		await emitFrom(wrapper, PlanBase, "update:corphq", true);
		expect(base().props("result").corphq).toBe(true);
		await emitFrom(wrapper, PlanBase, "update:expert", "Agriculture", 3);
		expect(base().props("result").experts.Agriculture.amount).toBe(3);
	});

	it("switches the empire and its CX from Base", async () => {
		const { wrapper } = await mountView(
			{ empireList: empires() },
			{ seed: ({ planning }) => planning.setCXs(cxs()) }
		);
		const base = () => wrapper.findComponent(PlanBase);
		expect(base().props("cxUuid")).toBe(SKY_CX);

		await emitFrom(wrapper, PlanBase, "update:active-empire", SHARE_EMPIRE);

		expect(base().props("activeEmpire")).toMatchObject({
			uuid: SHARE_EMPIRE,
		});
		expect(base().props("cxUuid")).toBe(SHARE_CX);
	});

	it("opens the sharing of a saved plan and closes it again", async () => {
		const { wrapper } = await mountView({}, { login: true });
		const modal = () => wrapper.findComponent({ name: "SharingModal" });
		expect(modal().props("show")).toBe(false);

		await wrapper
			.findAllComponents(PButton)
			.find((b) => b.text() === "plan.actions.share_link")!
			.trigger("click");
		expect(modal().props("show")).toBe(true);

		modal().vm.$emit("update:show", false);
		await flushPromises();
		expect(modal().props("show")).toBe(false);
	});

	it("closes the debug panel from the panel itself", async () => {
		calcDebug.value = true;
		const { wrapper } = await mountView();
		await openDebug(wrapper);
		const panel = () => wrapper.findComponent({ name: "PlanCalcDebug" });
		expect(panel().exists()).toBe(true);

		panel().vm.$emit("update:show", false);
		await flushPromises();

		expect(panel().exists()).toBe(false);
	});

	it("explains the history controls and their keys on hover", async () => {
		const { wrapper } = await mountView({}, { login: true });
		const labels = ["plan.history.undo", "plan.history.redo"];

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
			expect(tooltips()).toContain(`${label}_key`);
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

	describe("on a phone", () => {
		const phone = () =>
			vi.stubGlobal("matchMedia", (query: string) => ({
				matches: query === "(max-width: 767.98px)",
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}));
		const section = (wrapper: Mounted["wrapper"], label: string) =>
			wrapper
				.findAll("nav[aria-label='plan.layout.sections'] button")
				.find((b) => b.text().startsWith(label))!;
		const hidden = (wrapper: Mounted["wrapper"], selector: string) =>
			wrapper.find(selector).classes().includes("hidden");

		it("shows one section at a time, picked in the section tabs", async () => {
			phone();
			const { wrapper } = await mountView();

			expect(hidden(wrapper, "[data-base-pane]")).toBe(true);
			expect(hidden(wrapper, "[data-io-pane]")).toBe(true);
			expect(wrapper.find("[data-production]").attributes("style")).toBeUndefined();
			// the desktop tab row and the Material I/O button are gone
			expect(wrapper.find("[data-io-toggle]").exists()).toBe(false);

			await section(wrapper, "plan.base.label").trigger("click");
			expect(hidden(wrapper, "[data-base-pane]")).toBe(false);
			expect(wrapper.find("[data-production]").attributes("style")).toContain(
				"display: none"
			);

			await section(wrapper, "plan.components.materialio.label").trigger(
				"click"
			);
			expect(hidden(wrapper, "[data-base-pane]")).toBe(true);
			expect(hidden(wrapper, "[data-io-pane]")).toBe(false);
			expect(
				vi
					.mocked(trackEvent)
					.mock.calls.filter(([name]) => name === "plan:section_view")
			).toEqual([
				["plan:section_view", { section: "base" }],
				["plan:section_view", { section: "io" }],
			]);
		});

		it("lists the tools, opens one with a way back to the list", async () => {
			phone();
			const { wrapper } = await mountView();

			await section(wrapper, "plan.layout.tools").trigger("click");
			const tools = wrapper.find("[data-phone-tools]");
			const plancheck = tools
				.findAll("button")
				.find((b) => b.text().startsWith("plan.tools.labels.plan_check"))!;
			expect(plancheck.text()).toContain(
				"plan.tools.descriptions.plan-check"
			);

			await tools
				.findAll("button")
				.find((b) => b.text().startsWith("plan.tools.labels.construction_cart"))!
				.trigger("click");
			await flushPromises();
			expect(wrapper.find("[data-phone-tools]").exists()).toBe(false);
			expect(wrapper.find("[data-tool]").exists()).toBe(true);

			await wrapper
				.find("[data-tool]")
				.findAllComponents(PButton)
				.find((b: VueWrapper) => b.text() === "plan.layout.all_tools")!
				.trigger("click");
			expect(wrapper.find("[data-phone-tools]").exists()).toBe(true);
		});

		it("saves from a bar above the app's bottom bar while unsaved", async () => {
			phone();
			const { wrapper } = await mountView({}, { login: true });
			expect(wrapper.find("[data-phone-save]").exists()).toBe(false);
			// the header has no Save button on a phone
			expect(wrapper.findAllComponents(PlanSaveButton)).toHaveLength(0);

			await emitFrom(wrapper, PlanProduction, "update:building:amount", 0, 5);

			const bar = wrapper.find("[data-phone-save]");
			expect(bar.exists()).toBe(true);
			expect(
				bar.findComponent(PlanSaveButton).props("modified")
			).toBe(true);
		});
	});
});
