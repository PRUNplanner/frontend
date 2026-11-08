import {
	type Mounted,
	PLAN_UUID,
	PRUN_REAL,
	SAVED_AT,
	SHARE_CX,
	SHARE_EMPIRE,
	SKY_CX,
	SKY_EMPIRE,
	buildingAmounts,
	constructionCart,
	cxs,
	debugMeta,
	dialog,
	dialogButton,
	draftPlan,
	emitFrom,
	empires,
	errors,
	lastTitle,
	lastToast,
	mocks,
	mountView,
	newPlan,
	openDebug,
	openTool,
	press,
	productionShown,
	rename,
	queryCalls,
	respond,
	savedLayout,
	seedLayout,
	setupPlanViewSuite,
	stubDownload,
	supplyCart,
} from "@/tests/views/PlanView.harness";

import { beforeEach, describe, it, expect, onTestFinished, vi } from "vitest";
import {
	DOMWrapper,
	flushPromises,
	RouterLinkStub,
	type VueWrapper,
} from "@vue/test-utils";
import { PButton, PModal, PSelect } from "@/ui";
import PlanProduction from "@/features/planning/components/PlanProduction.vue";
import PlanBonuses from "@/features/planning/components/PlanBonuses.vue";
import PlanArea from "@/features/planning/components/PlanArea.vue";
import PlanExperts from "@/features/planning/components/PlanExperts.vue";
import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
import PlanConfiguration from "@/features/planning/components/PlanConfiguration.vue";
import PlanLayoutMenu from "@/features/planning/components/layout/PlanLayoutMenu.vue";
import SharedPlanDeltas from "@/features/sharing/components/SharedPlanDeltas.vue";
import { presetLayout } from "@/features/planning/layout/presets";
import { ELEMENT_IDS } from "@/features/planning/layout/elements";
import { stackedLayout } from "@/tests/features/planning/layout/layout.fixtures";
import type { ElementId } from "@/features/planning/layout/planLayout.types";
import PlanMaterialIO from "@/features/planning/components/PlanMaterialIO.vue";
import PlanSaveControl from "@/features/planning/components/PlanSaveControl.vue";
import PlanMoreMenu from "@/features/planning/components/PlanMoreMenu.vue";
import { hoverTooltip } from "@/tests/mountComponent";
import { calcDebug } from "@/lib/debugMode";
import {
	flushPlanEdits,
	trackEvent,
	trackUser,
} from "@/lib/analytics/useAnalytics";
import { useUnsavedGuard } from "@/lib/useUnsavedGuard";
import { usePlanCheckView } from "@/features/planning/usePlanCheckView";
import { etherwindPlan } from "@/tests/features/planning/usePlanCalculation.fixtures";
import planet_etherwind from "@/tests/test_data/api_data_planet_etherwind.json";

const activeTab = (wrapper: VueWrapper) =>
	wrapper.find("nav button[aria-pressed='true']").text();

/** Standard without an element, as a stored Custom Layout */
function presetWithout(el: ElementId) {
	const custom = presetLayout("standard");
	custom.items = custom.items
		.map((i) => ({ ...i, els: i.els.filter((e) => e !== el) }))
		.filter((i) => i.els.length);
	return { custom };
}

/** An <input> outside the view, gone after the test */
function textField(): HTMLInputElement {
	const input = document.createElement("input");
	document.body.append(input);
	onTestFinished(() => input.remove());
	return input;
}

describe("PlanView", () => {
	setupPlanViewSuite();

	describe("header", () => {
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

			expect(
				wrapper.find("nav[aria-label='plan.breadcrumb']").text()
			).toBe("New Antares c (KW-688c)");
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

		it("keeps the name when the rename changes nothing", async () => {
			const { wrapper } = await mountView();

			await rename(wrapper, "EW COF RAT DW C");

			expect(wrapper.find("h1").text()).toBe("EW COF RAT DW C");
			expect(
				wrapper
					.find("button[aria-label='plan.history.undo']")
					.attributes("disabled")
			).toBeDefined();
		});

		it("renames once when the field loses the focus right after Enter", async () => {
			const { wrapper } = await mountView();
			await wrapper
				.find("button[aria-label='plan.header.rename']")
				.trigger("click");
			const input = wrapper.find("input[aria-label='plan.header.name']");
			await input.setValue("That one");

			input.element.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
			);
			input.element.dispatchEvent(
				new FocusEvent("focusout", { bubbles: true })
			);
			await flushPromises();
			expect(wrapper.find("h1").text()).toBe("That one");

			// one rename: one undo brings the old name back
			await wrapper
				.find("button[aria-label='plan.history.undo']")
				.trigger("click");
			expect(wrapper.find("h1").text()).toBe("EW COF RAT DW C");
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
			expect(wrapper.findComponent(PlanSaveControl).exists()).toBe(false);
			expect(
				wrapper.findComponent(PlanProduction).props("disabled")
			).toBe(true);
		});

		it.each(["plan.history.undo", "plan.history.redo"])(
			"explains %s and its key on hover",
			async (label) => {
				const { wrapper } = await mountView({}, { login: true });
				// the disabled undo button takes no events, the wrapper does
				const trigger = wrapper.find(`button[aria-label='${label}']`)
					.element.parentElement!;

				expect(
					(await hoverTooltip(new DOMWrapper(trigger)))?.trim()
				).toBe(`${label}_key`);
			}
		);
	});

	describe("history", () => {
		it("undoes and redoes an edit with the buttons and the shortcut", async () => {
			const { wrapper } = await mountView();
			const undo = wrapper.find("button[aria-label='plan.history.undo']");
			const redo = wrapper.find("button[aria-label='plan.history.redo']");
			expect(undo.attributes("disabled")).toBeDefined();
			expect(redo.attributes("disabled")).toBeDefined();

			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);
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
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);

			const inField = press({ key: "z", ctrlKey: true }, textField());
			press({ key: "z" });
			await flushPromises();

			expect(inField.defaultPrevented).toBe(false);
			expect(buildingAmounts(wrapper).EXT).toBe(5);
		});

		it("ignores the history shortcut on a disabled plan", async () => {
			await mountView({ disabled: true });

			const event = press({ key: "z", ctrlKey: true });

			expect(event.defaultPrevented).toBe(false);
		});
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

	describe("tools", () => {
		// #561: switching to another tool while the first one still loads
		// and shows its spinner left the view broken until a reload
		it("switches tools while the first tool still loads", async () => {
			const { wrapper } = await mountView();
			await openTool(wrapper, "plan.tools.labels.construction_cart");
			// the fallback shows its spinner after 200 ms
			await new Promise((r) => setTimeout(r, 250));

			await openTool(wrapper, "plan.tools.labels.supply_cart");
			constructionCart.open();
			supplyCart.open();
			await flushPromises();

			expect(errors).toEqual([]);
			expect(wrapper.text()).toContain("PlanSupplyCart");
		});

		it("offers POPR only to logged in users", async () => {
			const anonymous = await mountView();
			const labels = () =>
				anonymous.wrapper.findAll("nav button").map((b) => b.text());
			expect(labels()).not.toContain("plan.tools.labels.popr");
			anonymous.wrapper.unmount();

			const { wrapper } = await mountView({}, { login: true });
			expect(wrapper.text()).toContain("plan.tools.labels.popr");
		});

		it("shows a tool as a tab of Production, its state kept while away", async () => {
			const { wrapper } = await mountView();
			constructionCart.open();

			await openTool(wrapper, "plan.tools.labels.construction_cart");
			expect(wrapper.text()).toContain("PlanConstructionCart");
			expect(productionShown(wrapper)).toBe(false);
			expect(trackEvent).toHaveBeenCalledWith("plan:tool_toggle", {
				panel: "construction-cart",
			});

			await openTool(wrapper, "plan.tools.labels.production");
			expect(activeTab(wrapper)).toBe("plan.tools.labels.production");
			expect(productionShown(wrapper)).toBe(true);
			// mounted once, kept under the Production tab
			expect(wrapper.text()).toContain("PlanConstructionCart");
		});

		it("hands POPR the planet and its workforce", async () => {
			const { wrapper } = await mountView({}, { login: true });

			await openTool(wrapper, "plan.tools.labels.popr");
			const popr = wrapper.findComponent({ name: "PlanPOPR" });
			expect(popr.vm.$attrs).toMatchObject({
				planetNaturalId: "KW-688c",
				workforceData: { pioneer: expect.anything() },
			});
		});

		// the plan's buildings, by name
		const buildings = ["EXT", "FP", "HYF", "INC", "RIG"].map((name) =>
			expect.objectContaining({ name })
		);

		it.each([
			[
				"visitation_frequency",
				"PlanVisitationFrequency",
				{ disabled: false, planUuid: PLAN_UUID },
			],
			[
				"repair_analysis",
				"PlanRepairAnalysis",
				{ planetNaturalId: "KW-688c", shared: false, data: buildings },
			],
			["profit_breakdown", "PlanProfitBreakdown", { buildings }],
			[
				"plan_check",
				"PlanCheck",
				{ planUuid: PLAN_UUID, planet: planet_etherwind, own: true },
			],
		])("hands %s the plan data it needs", async (tool, name, expected) => {
			const { wrapper } = await mountView({}, { login: true });

			await openTool(wrapper, `plan.tools.labels.${tool}`);

			expect(wrapper.findComponent({ name }).vm.$attrs).toMatchObject(
				expected
			);
		});

		it("opens the plan check on its market view from the material I/O", async () => {
			const { wrapper } = await mountView();
			usePlanCheckView().view.value = "compare" as never;

			await emitFrom(wrapper, PlanMaterialIO, "open:plan-check");
			await vi.waitFor(() =>
				expect(
					wrapper.findComponent({ name: "PlanCheck" }).exists()
				).toBe(true)
			);
			expect(usePlanCheckView().view.value).toBe("market");
			expect(activeTab(wrapper)).toBe("plan.tools.labels.plan_check");
			expect(productionShown(wrapper)).toBe(false);
		});
	});

	describe("grid", () => {
		// the account's preferences arrived (the GET answered)
		const loaded = {
			login: true,
			seed: ({ user }: { user: { preferencesLoaded: boolean } }) => {
				user.preferencesLoaded = true;
			},
		};

		const item = (wrapper: VueWrapper, id: string) =>
			wrapper.find(`[data-item="i-${id}"]`);

		it("lays out Standard: results kept in view, Base, Production with tools, Material I/O", async () => {
			const { wrapper } = await mountView({}, { login: true });
			const band = wrapper.find("[data-region='band']");
			expect(
				band
					.findAll("[data-item]")
					.map((e) => e.attributes("data-item"))
			).toEqual([
				"i-kpi-profit",
				"i-kpi-payback",
				"i-kpi-workforce",
				"i-kpi-area",
				"i-kpi-storage",
			]);
			// a short band sticks while scrolling, whole
			expect(band.classes()).toContain("sticky");
			expect(band.attributes("data-capped")).toBeUndefined();
			for (const id of [
				"empire",
				"planet",
				"workforce",
				"housing",
				"experts",
				"production",
				"material-io",
				"material-io-totals",
			])
				expect(item(wrapper, id).exists()).toBe(true);
			// Production holds the tools as tabs
			expect(
				item(wrapper, "production")
					.findAll("nav button")
					.map((b) => b.text())
			).toContain("plan.tools.labels.plan_check");
			expect(wrapper.find("[data-auto]").exists()).toBe(false);
		});

		it("folds an item by its chevron, kept in the account", async () => {
			const { wrapper } = await mountView({}, { login: true });
			const fold = () => item(wrapper, "planet").find("[data-fold]");
			expect(fold().attributes("aria-label")).toBe("plan.layout.fold");
			expect(fold().attributes("aria-expanded")).toBe("true");

			await fold().trigger("click");
			expect(item(wrapper, "planet").attributes("data-folded")).toBe(
				"true"
			);
			expect(fold().attributes("aria-expanded")).toBe("false");
			expect(trackEvent).toHaveBeenCalledWith("plan:panel_fold", {
				panel: "planet",
				folded: true,
			});
			expect(savedLayout()).toMatchObject({
				preset: "standard",
				folded: { wide: ["planet"], phone: [] },
			});

			// the next plan view (a reload) keeps it folded, still Standard
			wrapper.unmount();
			const again = await mountView({}, { login: true });
			expect(
				again.wrapper
					.find("[data-item='i-planet']")
					.attributes("data-folded")
			).toBe("true");
			await again.wrapper
				.find("[data-item='i-planet'] [data-fold]")
				.trigger("click");
			expect(
				again.wrapper
					.find("[data-item='i-planet']")
					.attributes("data-folded")
			).toBeUndefined();
		});

		it("switches the layout from the Layout menu, kept in the account", async () => {
			// a Custom Layout with Base's parts side by side, not in use
			seedLayout({
				v: 1,
				preset: "standard",
				custom: stackedLayout(),
				folded: [],
			});
			const { wrapper } = await mountView({}, { login: true });
			const menu = () => wrapper.findComponent(PlanLayoutMenu);
			expect(menu().props()).toMatchObject({
				choice: "standard",
				hasCustom: true,
				canCustomise: true,
			});
			expect(trackUser).toHaveBeenLastCalledWith({
				plan_layout: "standard",
				is_plan_parts_tinted: false,
			});

			menu().vm.$emit("pick", "custom");
			await flushPromises();
			expect(menu().props("choice")).toBe("custom");
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_preset", {
				preset: "custom",
			});
			expect(trackUser).toHaveBeenLastCalledWith({
				plan_layout: "custom",
				is_plan_parts_tinted: false,
			});
			// Base's parts side by side in one row
			const tops = ["empire", "planet", "workforce"].map(
				(id) =>
					item(wrapper, id)
						.attributes("style")!
						.match(/, (\d+)px/)![1]
			);
			expect(new Set(tops).size).toBe(1);

			wrapper.unmount();
			const again = await mountView({}, { login: true });
			expect(
				again.wrapper.findComponent(PlanLayoutMenu).props("choice")
			).toBe("custom");
		});

		it("tints every part from customise mode, kept in the account", async () => {
			const { wrapper } = await mountView({}, { login: true });
			const tinted = (w: VueWrapper) =>
				w
					.find("[data-item='i-planet']")
					.element.closest("[data-tinted]");
			// not in the Layout menu any more
			expect(
				wrapper.findComponent(PlanLayoutMenu).props()
			).not.toHaveProperty("tinted");
			expect(tinted(wrapper)).toBeNull();

			wrapper.findComponent(PlanLayoutMenu).vm.$emit("customise");
			await vi.waitFor(() =>
				expect(wrapper.find("[data-tint]").exists()).toBe(true)
			);
			await wrapper
				.find("[data-tint]")
				.findComponent({ name: "PCheckbox" })
				.vm.$emit("update:checked", true);
			await flushPromises();
			// the editor shows it, the page's wrapper not twice
			expect(
				wrapper.find("[data-layout-editor]").attributes("data-tinted")
			).toBe("true");
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_tint_toggle", {
				is_active: true,
			});
			expect(trackUser).toHaveBeenLastCalledWith({
				plan_layout: "standard",
				is_plan_parts_tinted: true,
			});
			// kept when customising is cancelled, Standard still in use
			await wrapper.find("[data-cancel]").trigger("click");
			await flushPromises();
			expect(wrapper.find("[data-layout-editor]").exists()).toBe(false);
			expect(tinted(wrapper)).not.toBeNull();

			wrapper.unmount();
			const again = await mountView({}, { login: true });
			expect(tinted(again.wrapper)).not.toBeNull();
		});

		it("says once that a new element joined Custom Layout, tagged New", async () => {
			const { custom } = presetWithout("experts");
			seedLayout({
				v: 1,
				preset: "custom",
				custom: {
					wide: custom,
					known: ELEMENT_IDS.filter((e) => e !== "experts"),
				},
				folded: [],
			});
			const { wrapper, user } = await mountView({}, { login: true });
			// not before the account's preferences arrived: another device
			// may have added it already
			expect(mocks.toast).not.toHaveBeenCalled();
			user.preferencesLoaded = true;
			await flushPromises();
			expect(mocks.toast).toHaveBeenCalledWith(
				"plan.layout.new_toast",
				expect.objectContaining({ closable: true })
			);
			expect(trackEvent).toHaveBeenCalledWith("plan:layout_new_element", {
				element: "experts",
			});
			expect(
				wrapper.find("[data-item='i-experts'] [data-fresh]").exists()
			).toBe(true);
			mocks.toast.mockClear();
			wrapper.unmount();
			const again = await mountView({}, loaded);
			expect(mocks.toast).not.toHaveBeenCalledWith(
				"plan.layout.new_toast",
				expect.anything()
			);
			expect(
				again.wrapper
					.find("[data-item='i-experts'] [data-fresh]")
					.exists()
			).toBe(false);
		});

		it("tags nothing New while the page shows Standard", async () => {
			const { custom } = presetWithout("experts");
			seedLayout({
				v: 1,
				preset: "standard",
				custom: {
					wide: custom,
					known: ELEMENT_IDS.filter((e) => e !== "experts"),
				},
				folded: [],
			});
			const { wrapper } = await mountView({}, loaded);
			// the toast is about Custom Layout; Standard's parts aren't new
			expect(mocks.toast).toHaveBeenCalledWith(
				"plan.layout.new_toast",
				expect.anything()
			);
			expect(wrapper.find("[data-fresh]").exists()).toBe(false);
		});

		describe("the layout this tab kept before", () => {
			const tabLayout = {
				v: 1,
				preset: "custom",
				custom: { wide: stackedLayout(), known: ELEMENT_IDS },
				folded: { wide: ["planet"], phone: [] },
			};
			const keep = () =>
				sessionStorage.setItem(
					"prunplanner:planLayout:v1",
					JSON.stringify(tabLayout)
				);

			it("is saved to an account without Custom Layout, once", async () => {
				keep();
				const { wrapper, user } = await mountView({}, loaded);
				expect(mocks.toast).toHaveBeenCalledWith(
					"plan.layout.carry_over.saved"
				);
				expect(trackEvent).toHaveBeenCalledWith(
					"plan:layout_carry_over",
					{
						result: "saved",
					}
				);
				expect(user.preferences.planLayout).toMatchObject({
					preset: "custom",
					folded: { wide: ["planet"], phone: [] },
				});
				expect(
					wrapper.findComponent(PlanLayoutMenu).props("choice")
				).toBe("custom");
				expect(
					sessionStorage.getItem("prunplanner:planLayout:v1")
				).toBeNull();
			});

			it("asks when the account has another one", async () => {
				keep();
				seedLayout({
					v: 1,
					preset: "standard",
					custom: {
						wide: presetLayout("standard"),
						known: ELEMENT_IDS,
					},
					folded: [],
				});
				const { wrapper, user } = await mountView({}, loaded);
				const [, options] = mocks.toast.mock.calls.find(
					([text]) => text === "plan.layout.carry_over.question"
				)!;
				expect(options).toMatchObject({ duration: 0, closable: true });
				expect(user.preferences.planLayout.preset).toBe("standard");
				// the X keeps the saved one
				options.onClose();
				expect(trackEvent).toHaveBeenCalledWith(
					"plan:layout_carry_over",
					{
						result: "kept_saved",
					}
				);
				// the action takes the tab's
				options.action.onClick();
				await flushPromises();
				expect(trackEvent).toHaveBeenCalledWith(
					"plan:layout_carry_over",
					{
						result: "replaced",
					}
				);
				expect(user.preferences.planLayout).toMatchObject({
					preset: "custom",
					folded: { wide: ["planet"], phone: [] },
				});
				expect(
					wrapper.findComponent(PlanLayoutMenu).props("choice")
				).toBe("custom");
			});
		});

		it("uses a layout changed in another tab at once", async () => {
			const { wrapper, user } = await mountView({}, loaded);
			user.preferences.planLayout = {
				v: 1,
				preset: "custom",
				custom: { wide: stackedLayout(), known: [...ELEMENT_IDS] },
				folded: { wide: [], phone: [] },
			};
			await flushPromises();
			expect(wrapper.findComponent(PlanLayoutMenu).props("choice")).toBe(
				"custom"
			);
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_remote_update",
				{
					is_customising: false,
					choice: null,
				}
			);
		});

		it("forgets a change elsewhere the bar wasn't answered for once customising ends", async () => {
			const { wrapper, user } = await mountView({}, loaded);
			const open = async () => {
				wrapper.findComponent(PlanLayoutMenu).vm.$emit("customise");
				await vi.waitFor(() =>
					expect(wrapper.find("[data-layout-editor]").exists()).toBe(
						true
					)
				);
			};
			await open();
			user.preferences.planLayout = {
				v: 1,
				preset: "standard",
				custom: null,
				folded: { wide: ["planet"], phone: [] },
			};
			await flushPromises();
			expect(wrapper.find("[data-elsewhere]").exists()).toBe(true);
			await wrapper.find("[data-cancel]").trigger("click");
			await flushPromises();
			await open();
			expect(wrapper.find("[data-elsewhere]").exists()).toBe(false);
		});

		it("gives a logged out visitor Standard, no Layout menu, and keeps nothing", async () => {
			const { custom } = presetWithout("experts");
			const tab = JSON.stringify({
				v: 1,
				preset: "custom",
				custom: { wide: custom },
				folded: [],
			});
			sessionStorage.setItem("prunplanner:planLayout:v1", tab);
			const { wrapper, user } = await mountView();
			expect(wrapper.findComponent(PlanLayoutMenu).exists()).toBe(false);
			// Standard: the tab's Custom Layout is neither used nor taken
			expect(wrapper.find("[data-item='i-experts']").exists()).toBe(true);
			expect(mocks.toast).not.toHaveBeenCalled();
			expect(sessionStorage.getItem("prunplanner:planLayout:v1")).toBe(
				tab
			);
			expect(user.preferences.planLayout.custom).toBeNull();
		});

		it("opens customise mode and tracks it", async () => {
			const { wrapper } = await mountView({}, { login: true });
			wrapper.findComponent(PlanLayoutMenu).vm.$emit("customise");
			await flushPromises();
			await vi.waitFor(() =>
				expect(wrapper.find("[data-layout-editor]").exists()).toBe(true)
			);
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_customise_open",
				{
					from: "preset",
				}
			);
			// not offered twice
			expect(
				wrapper.findComponent(PlanLayoutMenu).props("canCustomise")
			).toBe(false);
			// Everything open is the layout's: off, switched on while
			// customising, kept on the page once saved
			const showAll = () =>
				wrapper.findComponent(PlanWorkforce).props("showAll");
			expect(showAll()).toBe(false);
			wrapper
				.find("[data-item='i-workforce']")
				.findComponent({ name: "PDropdown" })
				.vm.$emit("select", "open:workforce");
			await flushPromises();
			expect(showAll()).toBe(true);
			// while customising, Ctrl/Cmd+Z undoes the layout change
			expect(press({ key: "z", ctrlKey: true }).defaultPrevented).toBe(
				true
			);
			await flushPromises();
			expect(showAll()).toBe(false);
			wrapper
				.find("[data-item='i-workforce']")
				.findComponent({ name: "PDropdown" })
				.vm.$emit("select", "open:workforce");
			await flushPromises();
			await wrapper.find("[data-save]").trigger("click");
			await flushPromises();
			expect(wrapper.find("[data-layout-editor]").exists()).toBe(false);
			expect(showAll()).toBe(true);
		});

		it("tracks customising the Custom Layout in use as such", async () => {
			seedLayout({
				v: 1,
				preset: "custom",
				custom: stackedLayout(),
				folded: [],
			});
			const { wrapper } = await mountView({}, { login: true });
			wrapper.findComponent(PlanLayoutMenu).vm.$emit("customise");
			await flushPromises();
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:layout_customise_open",
				{ from: "custom" }
			);
		});
	});

	it("switches the material I/O source, filter and value", async () => {
		const { wrapper } = await mountView();
		const io = () => wrapper.findComponent(PlanMaterialIO);
		const pane = () => wrapper.find("[data-item='i-material-io']");
		const totals = () => wrapper.find("[data-io-totals]");
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
		expect(trackEvent).toHaveBeenCalledWith("plan:io_view", {
			source: "all",
			filter: "imports",
			value: "volume",
		});

		await toggle("plan.io.source.production");
		// without what the workforce consumes
		expect(
			io()
				.props("materialIOData")
				.map((r: { ticker: string }) => r.ticker)
		).toEqual([
			"C",
			"CAF",
			"COF",
			"DW",
			"H2O",
			"HCP",
			"MAI",
			"MUS",
			"NS",
			"RAT",
			"SIO",
			"VEG",
		]);
		// market flags and the plan totals belong to the whole base
		expect(io().props("checks")).toBeUndefined();
		expect(totals().text()).not.toContain("plan.io.profit");

		await toggle("plan.io.source.workforce");
		await toggle("plan.io.source.all");
		expect(io().props("materialIOData")).toStrictEqual(whole);
		expect(totals().text()).toContain("plan.io.profit");
	});

	describe("results tiles", () => {
		const tile = (wrapper: VueWrapper, key: string) =>
			wrapper.find(`[data-tile="${key}"]`);

		it("shows the plan's results once, kept in view", async () => {
			const { wrapper } = await mountView();
			for (const key of [
				"profit",
				"payback",
				"workforce",
				"area",
				"storage",
			])
				expect(tile(wrapper, key).exists()).toBe(true);
			expect(
				wrapper.find("[data-region='band'] [data-tile='area']").exists()
			).toBe(true);
			expect(wrapper.findComponent(SharedPlanDeltas).exists()).toBe(
				false
			);
		});

		it("opens the tool each tile's figure comes from", async () => {
			const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
			const { wrapper } = await mountView({}, { attach: true });

			await tile(wrapper, "profit").trigger("click");
			await vi.waitFor(() =>
				expect(
					wrapper
						.findComponent({ name: "PlanProfitBreakdown" })
						.exists()
				).toBe(true)
			);
			expect(activeTab(wrapper)).toBe(
				"plan.tools.labels.profit_breakdown"
			);
			expect(trackEvent).toHaveBeenCalledWith("plan:result_tile_open", {
				tile: "profit",
			});
			const production = wrapper.find("[data-item='i-production']");
			expect(scroll.mock.contexts).toContain(production.element);
			expect(document.activeElement).toBe(production.element);
			// a second click keeps it open
			await tile(wrapper, "profit").trigger("click");
			expect(activeTab(wrapper)).toBe(
				"plan.tools.labels.profit_breakdown"
			);

			constructionCart.open();
			await tile(wrapper, "payback").trigger("click");
			await vi.waitFor(() =>
				expect(wrapper.text()).toContain("PlanConstructionCart")
			);
			expect(activeTab(wrapper)).toBe(
				"plan.tools.labels.construction_cart"
			);

			await tile(wrapper, "storage").trigger("click");
			await vi.waitFor(() =>
				expect(
					wrapper
						.findComponent({ name: "PlanVisitationFrequency" })
						.exists()
				).toBe(true)
			);
			expect(productionShown(wrapper)).toBe(false);
		});

		it("unfolds the Base part a tile opens", async () => {
			const { wrapper } = await mountView();
			const planet = () => wrapper.find("[data-item='i-planet']");
			await planet().find("[data-fold]").trigger("click");
			expect(planet().attributes("data-folded")).toBe("true");

			await tile(wrapper, "area").trigger("click");
			expect(planet().attributes("data-folded")).toBeUndefined();
			expect(trackEvent).toHaveBeenCalledWith("plan:panel_fold", {
				panel: "planet",
				folded: false,
			});
		});

		it("opens a hidden element in a dialog", async () => {
			const { custom } = presetWithout("visitation-frequency");
			seedLayout({ v: 1, preset: "custom", custom, folded: [] });
			const { wrapper } = await mountView({}, { login: true });
			expect(wrapper.findComponent(PlanLayoutMenu).props("choice")).toBe(
				"custom"
			);

			await tile(wrapper, "storage").trigger("click");
			await flushPromises();
			const modal = wrapper
				.findAllComponents(PModal)
				.find(
					(m) =>
						m.props("title") ===
						"plan.tools.labels.visitation_frequency"
				)!;
			expect(modal.props("show")).toBe(true);
			await vi.waitFor(() =>
				expect(
					wrapper
						.findComponent({ name: "PlanVisitationFrequency" })
						.exists()
				).toBe(true)
			);

			modal.vm.$emit("update:show", false);
			await flushPromises();
			expect(modal.props("show")).toBe(false);
		});
	});

	describe("Base", () => {
		it("edits the plan from its parts", async () => {
			const { wrapper } = await mountView();
			const bonuses = () => wrapper.findComponent(PlanBonuses);

			await emitFrom(wrapper, PlanBonuses, "update:cogc", "AGRICULTURE");
			expect(bonuses().props("cogc")).toBe("AGRICULTURE");
			await emitFrom(wrapper, PlanArea, "update:permits", 2);
			expect(
				wrapper.findComponent(PlanArea).props("areaData").permits
			).toBe(2);
			await emitFrom(wrapper, PlanBonuses, "update:corphq", true);
			expect(bonuses().props("corphq")).toBe(true);
			await emitFrom(
				wrapper,
				PlanExperts,
				"update:expert",
				"Agriculture",
				3
			);
			expect(
				wrapper.findComponent(PlanExperts).props("expertData")
					.Agriculture.amount
			).toBe(3);
		});

		it("switches the empire and its CX", async () => {
			const { wrapper } = await mountView(
				{ empireList: empires() },
				{ seed: ({ planning }) => planning.setCXs(cxs()) }
			);
			const config = () => wrapper.findComponent(PlanConfiguration);
			expect(config().props("cxUuid")).toBe(SKY_CX);

			await emitFrom(
				wrapper,
				PlanConfiguration,
				"update:active-empire",
				SHARE_EMPIRE
			);

			expect(config().props("activeEmpire")).toMatchObject({
				uuid: SHARE_EMPIRE,
			});
			expect(config().props("cxUuid")).toBe(SHARE_CX);
		});

		it("adds an extractor from the planet's resources", async () => {
			const { wrapper } = await mountView();
			const before = buildingAmounts(wrapper);
			const add = wrapper
				.find("[data-section='planet']")
				.findAll("button")
				.find((b) =>
					b
						.attributes("aria-label")
						?.startsWith("plan.base.planet.add_extractor")
				)!;
			await add.trigger("click");
			await flushPromises();
			expect(
				Object.keys(buildingAmounts(wrapper)).length
			).toBeGreaterThanOrEqual(Object.keys(before).length);
		});
	});

	describe("CSV", () => {
		it.each([
			["EW COF RAT DW C", "EW COF RAT DW C-material-io.csv"],
			// an unnamed plan after its planet
			["", "KW-688c-material-io.csv"],
		])(
			"downloads the material I/O of plan %j from the ⋯ menu as %s",
			async (name, file) => {
				const click = stubDownload();
				const { wrapper } = await mountView({
					planData: { ...etherwindPlan(), plan_name: name },
				});

				await emitFrom(wrapper, PlanMoreMenu, "csv");

				expect(click).toHaveBeenCalledTimes(1);
				expect(
					(click.mock.contexts[0] as HTMLAnchorElement).download
				).toBe(file);
			}
		);
	});

	describe("debug", () => {
		it("has no Debug item and opens no panel with debug off", async () => {
			const { wrapper } = await mountView();

			expect(wrapper.findComponent(PlanMoreMenu).props("debug")).toBe(
				false
			);
			// the shortcut is not taken: the browser keeps it, nothing opens
			const event = press({ code: "Backquote", ctrlKey: true });
			await flushPromises();
			expect(event.defaultPrevented).toBe(false);
			expect(trackEvent).not.toHaveBeenCalledWith(
				"debug:calc_open",
				expect.anything()
			);
			expect(
				wrapper.findComponent({ name: "PlanCalcDebug" }).exists()
			).toBe(false);
		});

		it("opens the debug panel with the button and Ctrl+`", async () => {
			calcDebug.value = true;
			const { wrapper } = await mountView();
			expect(wrapper.findComponent(PlanMoreMenu).props("debug")).toBe(
				true
			);

			await openDebug(wrapper);
			expect(wrapper.text()).toContain("debug panel");

			press({ code: "Backquote", metaKey: true });
			await flushPromises();
			expect(wrapper.text()).not.toContain("debug panel");

			press({ code: "Backquote", ctrlKey: true });
			await flushPromises();
			expect(wrapper.text()).toContain("debug panel");

			// the panel shows what save sends, a rename included
			await rename(wrapper, "Renamed plan");
			expect(wrapper.text()).toContain("debug panel Renamed plan");
		});

		it("closes the debug panel from the panel itself", async () => {
			calcDebug.value = true;
			const { wrapper } = await mountView();
			await openDebug(wrapper);
			const panel = () =>
				wrapper.findComponent({ name: "PlanCalcDebug" });
			expect(panel().exists()).toBe(true);

			panel().vm.$emit("update:show", false);
			await flushPromises();

			expect(panel().exists()).toBe(false);
		});

		it("keeps the debug shortcut out of text fields", async () => {
			calcDebug.value = true;
			const { wrapper } = await mountView();

			const event = press(
				{ code: "Backquote", ctrlKey: true },
				textField()
			);
			await flushPromises();

			expect(event.defaultPrevented).toBe(false);
			expect(wrapper.text()).not.toContain("debug panel");
		});

		it("describes the plan for the debug panel", async () => {
			calcDebug.value = true;
			const { wrapper } = await mountView(
				{ planData: { ...newPlan(), plan_name: undefined } },
				{
					seed: ({ planning }) => planning.setCXs(cxs()),
				}
			);
			await openDebug(wrapper);
			expect(debugMeta(wrapper)).toEqual({
				plan: "plan.name.untitled",
				planet: "KW-688c",
				cx: "Universe",
				empire: "none",
			});
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

			// a CX gone from the store (deleted elsewhere): Universe prices
			planning.cxs = {};
			await flushPromises();
			expect(panel.props("meta").cx).toBe("Universe");
		});

		// the debug panel names the empire the plan calculates with
		it("calculates with the navigation's empire when the plan is in several", async () => {
			calcDebug.value = true;
			// the plan is in Sky Productions (listed first) and PRUN REAL; the
			// navigation shows PRUN REAL
			const { wrapper } = await mountView(
				{ empireList: empires() },
				{
					seed: ({ user, planning }) => {
						planning.setEmpires(empires());
						planning.setCXs(cxs());
						user.preferences.defaultEmpireUuid = PRUN_REAL;
					},
				}
			);
			await openDebug(wrapper);

			expect(debugMeta(wrapper)).toMatchObject({ empire: "PRUN REAL" });
		});

		// as its breadcrumb: the first of the user's empires that holds the plan
		it("falls back to the empire its breadcrumb links when the navigation's isn't one", async () => {
			calcDebug.value = true;
			const { wrapper } = await mountView(
				{ empireList: empires() },
				{
					seed: ({ user, planning }) => {
						planning.setEmpires(empires());
						planning.setCXs(cxs());
						user.preferences.defaultEmpireUuid = SHARE_EMPIRE;
					},
				}
			);
			await openDebug(wrapper);

			expect(debugMeta(wrapper)).toMatchObject({ empire: "PRUN REAL" });
		});

		it("starts a new plan in the first empire of the list", async () => {
			calcDebug.value = true;
			const { wrapper } = await mountView(
				{ planData: draftPlan(), empireList: empires() },
				{ seed: ({ planning }) => planning.setCXs(cxs()) }
			);
			await openDebug(wrapper);

			expect(debugMeta(wrapper).empire).toBe("PRUN REAL");
		});
	});

	describe("saving", () => {
		const saved = { uuid: PLAN_UUID, modified_at: SAVED_AT };

		it("saves an existing plan with the version it started from", async () => {
			respond({ PatchPlan: () => saved, GetPlan: () => etherwindPlan() });
			const { wrapper } = await mountView(
				{ planData: { ...etherwindPlan(), modified_at: "v1" } },
				{ login: true }
			);
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);
			expect(
				wrapper.findComponent(PlanSaveControl).props("modified")
			).toBe(true);

			press({ key: "s", ctrlKey: true });
			await flushPromises();

			expect(queryCalls("PatchPlan")).toHaveLength(1);
			const patch = queryCalls("PatchPlan")[0];
			expect(patch[1].planUuid).toBe(PLAN_UUID);
			expect(patch[1].data).toMatchObject({
				uuid: PLAN_UUID,
				base_modified_at: "v1",
				// no draft seen: another one stays
				draft_updated_at: null,
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
				named: false,
				restore: false,
			});
			expect(
				wrapper.findComponent(PlanSaveControl).props("modified")
			).toBe(false);

			// the next save sends the version of this one
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				6
			);
			wrapper.findComponent(PlanSaveControl).vm.$emit("save");
			await flushPromises();
			const patches = queryCalls("PatchPlan");
			expect(patches).toHaveLength(2);
			expect(patches[1][1].data.base_modified_at).toBe(SAVED_AT);
			expect(trackEvent).toHaveBeenCalledWith("plan:save", {
				planet_natural_id: "KW-688c",
				trigger: "button",
				named: false,
				restore: false,
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
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);

			press({ key: "s", metaKey: true });
			await flushPromises();

			expect(mocks.toast).toHaveBeenCalledWith(
				"plan.save_status.failed_message",
				{ type: "error" }
			);
			const button = wrapper.findComponent(PlanSaveControl);
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
			wrapper.findComponent(PlanSaveControl).vm.$emit("save");
			await flushPromises();

			expect(queryCalls("CreatePlan")).toHaveLength(1);
			expect(queryCalls("CreatePlan")[0][1].data.plan_name).toBe("Mine");
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

			wrapper.findComponent(PlanSaveControl).vm.$emit("save");
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

			wrapper.findComponent(PlanSaveControl).vm.$emit("save");
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

			wrapper.findComponent(PlanSaveControl).vm.$emit("save");
			await flushPromises();

			expect(queryCalls("PatchPlan")).toHaveLength(1);
			const patch = queryCalls("PatchPlan")[0];
			expect(patch[1].planUuid).toBe("new-uuid");
			expect(patch[1].data.base_modified_at).toBe(SAVED_AT);
			expect(
				wrapper.findComponent(PlanSaveControl).props("modified")
			).toBe(false);
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

			wrapper.findComponent(PlanSaveControl).vm.$emit("save");
			await flushPromises();

			expect(mocks.push).not.toHaveBeenCalled();
			expect(wrapper.findComponent(PlanSaveControl).props("failed")).toBe(
				true
			);
		});
	});

	describe("save as", () => {
		async function openSaveAs(mounted: Mounted) {
			mounted.wrapper
				.findComponent(PlanSaveControl)
				.vm.$emit("save-as-copy");
			await flushPromises();
		}

		it("offers a copy under the current empire and plan name", async () => {
			const mounted = await mountView(
				{ empireList: empires() },
				{
					login: true,
					// the copy name only, the other labels stay keys
					messages: {
						plan: {
							components: {
								save_as: { copy_name: "{name} (Copy)" },
							},
						},
					},
				}
			);
			await openSaveAs(mounted);

			const modal = dialog();
			expect(modal.text()).toContain("plan.components.save_as.title");
			expect(
				(modal.find("input").element as HTMLInputElement).value
			).toBe("EW COF RAT DW C (Copy)");
			expect(modal.text()).toContain(
				"plan.components.save_as.form.empire"
			);
		});

		it("leaves the copy's name empty for an unnamed plan and blocks creating", async () => {
			const mounted = await mountView(
				{ planData: newPlan() },
				{ login: true }
			);
			await openSaveAs(mounted);

			const create = dialogButton("common.buttons.create");
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
				CreatePlan: () => ({
					uuid: "copy-uuid",
					modified_at: SAVED_AT,
				}),
			});
			const open = vi
				.spyOn(window, "open")
				.mockImplementation(() => null);
			const mounted = await mountView(
				{ empireList: empires() },
				{ login: true }
			);
			await openSaveAs(mounted);

			await dialog().find("input").setValue("  My copy  ");
			await dialogButton("common.buttons.create").trigger("click");
			await flushPromises();

			expect(queryCalls("CreatePlan")).toHaveLength(1);
			expect(queryCalls("CreatePlan")[0][1].data).toMatchObject({
				plan_name: "My copy",
				empire_uuid: SKY_EMPIRE,
			});
			expect(
				mounted.user.preferences.planOverrides["copy-uuid"]
			).toBeDefined();
			expect(trackEvent).toHaveBeenCalledWith("plan:save_as", {
				planet_natural_id: "KW-688c",
			});
			expect(open).toHaveBeenCalledWith(
				"/plan/KW-688c/copy-uuid",
				"_blank"
			);
			expect(dialog().exists()).toBe(false);
		});

		it("creates a copy for the empire picked in the dialog", async () => {
			respond({
				CreatePlan: () => ({
					uuid: "copy-uuid",
					modified_at: SAVED_AT,
				}),
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
			await dialogButton("common.buttons.create").trigger("click");
			await flushPromises();

			expect(queryCalls("CreatePlan")).toHaveLength(1);
			expect(queryCalls("CreatePlan")[0][1].data.empire_uuid).toBe(
				SHARE_EMPIRE
			);
		});

		it("keeps the dialog open when the copy cannot be created", async () => {
			respond({
				CreatePlan: () => {
					throw new Error("offline");
				},
			});
			vi.spyOn(console, "error").mockImplementation(() => {});
			const open = vi
				.spyOn(window, "open")
				.mockImplementation(() => null);
			const mounted = await mountView({}, { login: true });
			await openSaveAs(mounted);

			await dialogButton("common.buttons.create").trigger("click");
			await flushPromises();

			expect(open).not.toHaveBeenCalled();
			expect(dialog().exists()).toBe(true);

			await dialogButton("common.buttons.cancel").trigger("click");
			expect(dialog().exists()).toBe(false);
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

	describe("discarding, drafts and versions", () => {
		it("discards the edits after confirming", async () => {
			mocks.confirm.mockResolvedValue(false);
			const { wrapper } = await mountView({}, { login: true });
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);

			await emitFrom(wrapper, PlanSaveControl, "discard");
			expect(mocks.confirm).toHaveBeenCalledWith(
				expect.objectContaining({
					content: "plan.versions.discard_confirm",
				})
			);
			expect(buildingAmounts(wrapper).EXT).toBe(5);

			mocks.confirm.mockResolvedValue(true);
			await emitFrom(wrapper, PlanSaveControl, "discard");
			expect(buildingAmounts(wrapper).EXT).toBe(1);
			expect(
				wrapper.findComponent(PlanSaveControl).props("modified")
			).toBe(false);
			expect(trackEvent).toHaveBeenCalledWith("plan:discard_changes");
			// no draft was written yet, none to delete
			expect(queryCalls("DeletePlanDraft")).toEqual([]);
		});

		it("opens the saved plan and offers the draft of the same save, restored as unsaved edits", async () => {
			const plan = { ...etherwindPlan(), modified_at: "v1" };
			const draft = {
				...plan,
				plan_data: {
					...plan.plan_data,
					buildings: plan.plan_data.buildings.map((b, i) =>
						i === 0 ? { ...b, amount: 7 } : b
					),
				},
				base_modified_at: "v1",
				updated_at: "2026-10-30T12:00:00.123456Z",
			};
			respond({ GetPlan: () => plan, GetPlanDraft: () => draft });
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);

			// the saved version shows
			expect(buildingAmounts(wrapper).EXT).toBe(1);
			const control = wrapper.findComponent(PlanSaveControl);
			expect(control.props("modified")).toBe(false);
			expect(mocks.toast).toHaveBeenCalledWith(
				"plan.versions.draft_found",
				expect.objectContaining({
					action: expect.objectContaining({
						label: "plan.versions.restore_draft",
					}),
				})
			);

			const [, options] = mocks.toast.mock.calls.find(
				([text]) => text === "plan.versions.draft_found"
			)!;
			options.action.onClick();
			await flushPromises();
			expect(buildingAmounts(wrapper).EXT).toBe(7);
			expect(control.props("modified")).toBe(true);
			expect(control.props("draftResumed")).toBe(true);
			expect(control.props("canUndo")).toBe(false);
		});

		it("reloads the saved plan from its own button", async () => {
			const plan = { ...etherwindPlan(), modified_at: "v1" };
			respond({ GetPlan: () => plan });
			mocks.confirm.mockResolvedValue(true);
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);

			await wrapper
				.find("button[aria-label='plan.actions.reload']")
				.trigger("click");
			await flushPromises();
			expect(mocks.confirm).toHaveBeenCalledWith(
				expect.objectContaining({
					content: "plan.actions.reload_confirm",
				})
			);
			expect(queryCalls("GetPlan").length).toBeGreaterThan(0);
			expect(buildingAmounts(wrapper).EXT).toBe(1);
			expect(
				wrapper.findComponent(PlanSaveControl).props("modified")
			).toBe(false);
			expect(trackEvent).toHaveBeenCalledWith("plan:reload", {
				planet_natural_id: plan.planet_natural_id,
			});
		});

		it("has no reload button on a plan not saved yet, a shared copy or a read-only plan", async () => {
			const { wrapper: fresh } = await mountView(
				{ planData: draftPlan() },
				{ login: true }
			);
			expect(
				fresh.find("button[aria-label='plan.actions.reload']").exists()
			).toBe(false);

			const { wrapper: shared } = await mountView(
				{
					planData: draftPlan(),
					shared: true,
					sharedPlanUuid: "shared-uuid",
				},
				{ login: true }
			);
			expect(
				shared.find("button[aria-label='plan.actions.reload']").exists()
			).toBe(false);

			const { wrapper: readOnly } = await mountView(
				{ disabled: true },
				{ login: true }
			);
			expect(
				readOnly
					.find("button[aria-label='plan.actions.reload']")
					.exists()
			).toBe(false);
		});

		it("doesn't preview while the pending draft write met another draft", async () => {
			const plan = { ...etherwindPlan(), modified_at: "v1" };
			respond({
				GetPlan: () => plan,
				SavePlanDraft: () => {
					throw Object.assign(new Error("409"), {
						status: 409,
						responseData: { code: "draft_conflict" },
					});
				},
				GetPlanDraft: () => ({
					...plan,
					plan_name: "Other tab",
					base_modified_at: "v1",
					updated_at: "2026-10-30T12:00:00.000001Z",
				}),
			});
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);
			// an edit, its write still waiting for the debounce
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);

			await emitFrom(wrapper, PlanSaveControl, "preview", "v-1");
			await vi.waitFor(() => expect(dialog().exists()).toBe(true));
			expect(dialog().text()).toContain("save_conflict.draft.title");
			expect(queryCalls("GetPlanVersion")).toEqual([]);
			expect(wrapper.find("[data-version-preview]").exists()).toBe(false);
		});

		it("previews a version read-only, restores it as one undo step", async () => {
			const plan = { ...etherwindPlan(), modified_at: "v1" };
			const version = {
				...plan,
				uuid: "5f0c3b8e-1d2a-4c3b-9e8f-7a6b5c4d3e2f",
				kind: "save",
				name: "Early stage",
				created_at: "2026-10-12T18:20:00.000000Z",
				source_version: null,
				is_active: false,
				data_bytes: 100,
				plan_data: {
					...plan.plan_data,
					buildings: plan.plan_data.buildings.map((b, i) =>
						i === 0 ? { ...b, amount: 3 } : b
					),
				},
			};
			respond({
				GetPlan: () => plan,
				GetPlanVersion: () => version,
				PatchPlan: () => ({ uuid: PLAN_UUID, modified_at: "v2" }),
			});
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);

			await emitFrom(wrapper, PlanSaveControl, "preview", version.uuid);
			expect(buildingAmounts(wrapper).EXT).toBe(3);
			expect(wrapper.find("[data-version-preview]").exists()).toBe(true);
			expect(
				wrapper.findComponent(PlanProduction).props("disabled")
			).toBe(true);
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:version_preview",
				expect.objectContaining({ named: true })
			);

			// back: the edits as they were
			await wrapper
				.findAll("[data-version-preview] button")
				.find((b) => b.text() === "plan.versions.back")!
				.trigger("click");
			expect(buildingAmounts(wrapper).EXT).toBe(1);
			expect(wrapper.find("[data-version-preview]").exists()).toBe(false);
			expect(
				wrapper.findComponent(PlanSaveControl).props("modified")
			).toBe(false);

			// restore: unsaved, one undo step back
			await emitFrom(wrapper, PlanSaveControl, "preview", version.uuid);
			await wrapper
				.findAll("[data-version-preview] button")
				.find((b) => b.text() === "plan.versions.restore")!
				.trigger("click");
			await flushPromises();
			const control = () => wrapper.findComponent(PlanSaveControl);
			expect(buildingAmounts(wrapper).EXT).toBe(3);
			expect(control().props("restoredFrom")).toMatchObject({
				uuid: version.uuid,
			});
			expect(control().props("canUndo")).toBe(true);

			// the save is marked as the restore
			control().vm.$emit("save", "");
			await flushPromises();
			expect(queryCalls("PatchPlan")[0][1].data).toMatchObject({
				restored_from: version.uuid,
			});
		});
		function previewFixture() {
			const plan = { ...etherwindPlan(), modified_at: "v1" };
			const listItem = {
				uuid: "5f0c3b8e-1d2a-4c3b-9e8f-7a6b5c4d3e2f",
				kind: "save",
				name: "Early stage",
				created_at: "2026-10-12T18:20:00.000000Z",
				source_version: null,
				is_active: false,
				data_bytes: 100,
			};
			const plan_data = {
				...plan.plan_data,
				buildings: plan.plan_data.buildings.map((b, i) =>
					i === 0 ? { ...b, amount: 3 } : b
				),
			};
			const version = { ...plan, ...listItem, plan_data };
			const active = {
				...listItem,
				uuid: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
				name: "",
				is_active: true,
			};
			return { plan, listItem, version, active, plan_data };
		}

		it("deleting the previewed version returns to the edits", async () => {
			const { plan, listItem, version, active } = previewFixture();
			respond({
				GetPlan: () => plan,
				GetPlanVersions: () => [active, listItem],
				GetPlanVersion: () => version,
				DeletePlanVersion: () => undefined,
			});
			mocks.confirm.mockResolvedValue(true);
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);

			await emitFrom(wrapper, PlanSaveControl, "preview", listItem.uuid);
			expect(buildingAmounts(wrapper).EXT).toBe(3);

			await emitFrom(wrapper, PlanSaveControl, "delete", listItem.uuid);
			expect(queryCalls("DeletePlanVersion")[0][1]).toEqual({
				planUuid: PLAN_UUID,
				versionUuid: listItem.uuid,
			});
			expect(wrapper.find("[data-version-preview]").exists()).toBe(false);
			expect(buildingAmounts(wrapper).EXT).toBe(1);
			expect(
				wrapper.findComponent(PlanSaveControl).props("versions")
			).toEqual([active]);
		});

		it("makes the previewed version active from the banner", async () => {
			const { plan, listItem, version, active, plan_data } =
				previewFixture();
			respond({
				GetPlan: () => plan,
				GetPlanVersions: () => [active, listItem],
				GetPlanVersion: () => version,
				ActivatePlanVersion: () => ({
					...plan,
					plan_data,
					modified_at: "v3",
				}),
			});
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);

			await emitFrom(wrapper, PlanSaveControl, "preview", listItem.uuid);
			await wrapper
				.findAll("[data-version-preview] button")
				.find((b) => b.text() === "plan.versions.make_active")!
				.trigger("click");
			await flushPromises();

			expect(mocks.confirm).not.toHaveBeenCalled();
			expect(queryCalls("ActivatePlanVersion")[0][1]).toMatchObject({
				planUuid: PLAN_UUID,
				versionUuid: listItem.uuid,
			});
			expect(wrapper.find("[data-version-preview]").exists()).toBe(false);
			expect(buildingAmounts(wrapper).EXT).toBe(3);
			expect(
				wrapper.findComponent(PlanSaveControl).props("modified")
			).toBe(false);
			expect(trackEvent).toHaveBeenCalledWith(
				"plan:version_activate",
				expect.objectContaining({ named: true, from: "preview" })
			);
		});

		it("makes a version active from the list, reloading a list gone stale", async () => {
			const { plan, listItem, active } = previewFixture();
			respond({
				GetPlan: () => plan,
				GetPlanVersions: () => [active, listItem],
				// pruned or deleted in another tab
				ActivatePlanVersion: () => {
					throw Object.assign(new Error("404"), { status: 404 });
				},
			});
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);
			const loads = queryCalls("GetPlanVersions").length;

			// not in the list: nothing to activate
			await emitFrom(wrapper, PlanSaveControl, "activate", "gone-uuid");
			expect(queryCalls("ActivatePlanVersion")).toEqual([]);

			await emitFrom(wrapper, PlanSaveControl, "activate", listItem.uuid);
			expect(queryCalls("ActivatePlanVersion")[0][1]).toMatchObject({
				versionUuid: listItem.uuid,
			});
			expect(lastToast()).toEqual([
				"plan.versions.gone",
				{ type: "error" },
			]);
			expect(queryCalls("GetPlanVersions")).toHaveLength(loads + 1);
		});

		it("deletes a version not previewed, the edits stay", async () => {
			const { plan, listItem, active } = previewFixture();
			respond({
				GetPlan: () => plan,
				GetPlanVersions: () => [active, listItem],
				DeletePlanVersion: () => undefined,
			});
			mocks.confirm.mockResolvedValue(true);
			const { wrapper } = await mountView(
				{ planData: plan },
				{ login: true }
			);
			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);

			await emitFrom(wrapper, PlanSaveControl, "delete", "gone-uuid");
			expect(queryCalls("DeletePlanVersion")).toEqual([]);

			await emitFrom(wrapper, PlanSaveControl, "delete", listItem.uuid);
			expect(queryCalls("DeletePlanVersion")).toHaveLength(1);
			const control = wrapper.findComponent(PlanSaveControl);
			expect(control.props("versions")).toEqual([active]);
			expect(control.props("modified")).toBe(true);
			expect(buildingAmounts(wrapper).EXT).toBe(5);
		});
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

	describe("on a phone", () => {
		beforeEach(() => {
			vi.stubGlobal("matchMedia", (query: string) => ({
				matches: query === "(max-width: 767.98px)",
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}));
			// the grid is as wide as a phone's page
			const width = vi
				.spyOn(HTMLElement.prototype, "clientWidth", "get")
				.mockReturnValue(343);
			onTestFinished(() => width.mockRestore());
		});
		const box = (wrapper: Mounted["wrapper"], id: string) => {
			const style = wrapper
				.find(`[data-item="i-${id}"]`)
				.attributes("style")!;
			const [, x, y] = style.match(
				/translate\(([\d.]+)px, ([\d.]+)px\)/
			)!;
			return {
				x: +x,
				y: +y,
				w: parseFloat(style.match(/width: ([\d.]+)px/)![1]),
			};
		};

		it("stacks every item full width in layout order, small ones two per row", async () => {
			const { wrapper } = await mountView();
			await flushPromises();

			// no section tabs any more
			expect(
				wrapper.find("nav[aria-label='plan.layout.sections']").exists()
			).toBe(false);
			// Base parts and Production full width, in order
			const order = ["empire", "production", "material-io", "planet"].map(
				(id) => box(wrapper, id)
			);
			for (const b of order) expect(b).toMatchObject({ x: 0, w: 343 });
			for (let i = 1; i < order.length; i++)
				expect(order[i].y).toBeGreaterThan(order[i - 1].y);
			// the results tiles pair up
			expect(box(wrapper, "kpi-payback").y).toBe(
				box(wrapper, "kpi-workforce").y
			);
			expect(box(wrapper, "kpi-workforce").x).toBeGreaterThan(0);
		});

		it("shows Custom Layout's phone arrangement, folds kept for it", async () => {
			seedLayout({
				v: 1,
				preset: "custom",
				custom: {
					wide: presetLayout("standard"),
					phone: {
						cols: 2,
						gap: 16,
						items: [
							{
								id: "i-production",
								els: ["production"],
								x: 0,
								w: 2,
								y: 0,
							},
							{
								id: "i-kpi-payback",
								els: ["kpi-payback"],
								x: 1,
								w: 1,
								y: 1,
							},
							{
								id: "i-kpi-area",
								els: ["kpi-area"],
								x: 0,
								w: 1,
								y: 2,
							},
							{
								id: "i-empire",
								els: ["empire"],
								x: 0,
								w: 2,
								y: 3,
							},
							{
								id: "i-planet",
								els: ["planet"],
								x: 0,
								w: 2,
								y: 4,
							},
						],
					},
					known: ELEMENT_IDS,
				},
				folded: { wide: ["empire"], phone: [] },
			});
			const { wrapper } = await mountView({}, { login: true });
			await flushPromises();
			// as arranged: Area beside Payback, not a stack
			expect(box(wrapper, "kpi-payback").x).toBeGreaterThan(0);
			expect(box(wrapper, "kpi-area").x).toBe(0);
			expect(box(wrapper, "kpi-area").y).toBe(
				box(wrapper, "kpi-payback").y
			);
			// Wide's folds are Wide's
			expect(
				wrapper.find("[data-item='i-empire']").attributes("data-folded")
			).toBeUndefined();
			await wrapper
				.find("[data-item='i-planet'] [data-fold]")
				.trigger("click");
			expect(savedLayout()?.folded).toEqual({
				wide: ["empire"],
				phone: ["planet"],
			});
		});

		it("switches presets there but offers no customising", async () => {
			const { wrapper } = await mountView({}, { login: true });
			expect(
				wrapper.findComponent(PlanLayoutMenu).props("canCustomise")
			).toBe(false);
		});

		it("opens the element a results tile names, wherever it is", async () => {
			const { wrapper } = await mountView();

			await wrapper.find("[data-tile='storage']").trigger("click");
			await vi.waitFor(() =>
				expect(
					wrapper
						.findComponent({ name: "PlanVisitationFrequency" })
						.exists()
				).toBe(true)
			);
			expect(activeTab(wrapper)).toBe(
				"plan.tools.labels.visitation_frequency"
			);
		});

		it("saves from a bar above the app's bottom bar, history in the header", async () => {
			const { wrapper } = await mountView({}, { login: true });
			// a saved plan: its status (the versions) in the bar
			const bar = wrapper.find("[data-phone-save]");
			expect(bar.exists()).toBe(true);
			expect(bar.findComponent(PlanSaveControl).props("part")).toBe(
				"save"
			);
			// the header keeps undo and redo, no Save
			const [header] = wrapper.findAllComponents(PlanSaveControl);
			expect(header.props("part")).toBe("history");
			expect(header.find("[data-save]").exists()).toBe(false);

			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);

			expect(bar.findComponent(PlanSaveControl).props("modified")).toBe(
				true
			);
			expect(bar.find("[data-save]").exists()).toBe(true);
		});

		it("shows the bar for a new plan while it saves, after it failed and once edited", async () => {
			let fail: (err: unknown) => void = () => {};
			respond({
				CreatePlan: () =>
					new Promise((_, reject) => {
						fail = reject;
					}),
			});
			vi.spyOn(console, "error").mockImplementation(() => {});
			const { wrapper } = await mountView(
				{ planData: { ...draftPlan(), plan_name: "Mine" } },
				{ login: true }
			);
			const bar = () => wrapper.find("[data-phone-save]");
			// nothing to save yet
			expect(bar().exists()).toBe(false);

			// Save from the header's control
			wrapper.findComponent(PlanSaveControl).vm.$emit("save");
			await flushPromises();
			expect(bar().exists()).toBe(true);

			fail(new Error("offline"));
			await flushPromises();
			expect(bar().findComponent(PlanSaveControl).props("failed")).toBe(
				true
			);

			await emitFrom(
				wrapper,
				PlanProduction,
				"update:building:amount",
				0,
				5
			);
			expect(bar().findComponent(PlanSaveControl).props("modified")).toBe(
				true
			);
		});
	});
});
