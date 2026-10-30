import { describe, it, expect, vi } from "vitest";
import { DOMWrapper, type VueWrapper } from "@vue/test-utils";

import { trackEvent, trackPlanEdit } from "@/lib/analytics/useAnalytics";
import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
import PMeter from "@/ui/charts/PMeter.vue";
import { mountComponent } from "@/tests/mountComponent";
import { wf } from "@/tests/features/planning/usePlanCalculation.fixtures";
import plan from "@/locales/en_US/plan.json";

// Types & Interfaces
import type { IWorkforceRecord } from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({
	reportError: vi.fn(),
	trackEvent: vi.fn(),
	trackPlanEdit: vi.fn(),
}));

// without luxuries unless a tier sets them
const WORKFORCE: IWorkforceRecord = {
	pioneer: wf("pioneer", {
		required: 1200,
		capacity: 1500,
		left: 300,
		lux1: true,
		lux2: false,
		efficiency: 0.9634,
	}),
	settler: wf("settler", {
		required: 250,
		capacity: 200,
		left: -50,
		lux1: false,
		lux2: true,
		efficiency: 0.5,
	}),
	technician: wf("technician", {}, false),
	engineer: wf("engineer", {
		required: 10,
		capacity: 100,
		left: 90,
		lux1: true,
		lux2: true,
		efficiency: 1,
	}),
	scientist: wf("scientist", {}, false),
};

async function mountWorkforce(props: Record<string, unknown> = {}) {
	return mountComponent(
		PlanWorkforce,
		{
			disabled: false,
			workforceData: WORKFORCE,
			planetNaturalId: "ZZ-000a",
			...props,
		},
		// real plan texts, so the numbers in "{need} / {housed}" show
		{ messages: { plan } }
	);
}

// a used tier is the block around its meter
const rows = (wrapper: VueWrapper) =>
	wrapper
		.findAll("[role=img]")
		.map((m) => new DOMWrapper(m.element.parentElement!));
const row = (wrapper: VueWrapper, index: number) => rows(wrapper).at(index)!;
// the name is a row's first text
const names = (wrapper: VueWrapper) =>
	rows(wrapper).map((r) => r.find("span").text());
const meter = (wrapper: VueWrapper, index: number) =>
	row(wrapper, index).find("[role=img] > div");
/** value and max of every meter, PMeter colors it over max */
const meters = (wrapper: VueWrapper) =>
	wrapper
		.findAllComponents(PMeter)
		.map((m) => [m.props("value"), m.props("max")]);
/** lux1 / lux2 toggles of a row */
const luxButtons = (wrapper: VueWrapper, index: number) =>
	row(wrapper, index).findAll("button[aria-pressed]");
const bedsFree = (wrapper: VueWrapper, index: number) =>
	row(wrapper, index).find("[data-short]");
const unneededToggle = (wrapper: VueWrapper) =>
	wrapper.find("[data-unneeded-toggle]");

describe("PlanWorkforce", () => {
	it("lists the used tiers with need / housed and efficiency", async () => {
		const { wrapper } = await mountWorkforce();

		// capitalizeString("game.workforce_type.pioneer"): "_" becomes " ",
		// then each word is capitalized; technician and scientist are unused
		expect(names(wrapper)).toEqual([
			"Game.workforce Type.pioneer",
			"Game.workforce Type.settler",
			"Game.workforce Type.engineer",
		]);
		// 0.9634 * 100 = 96.34
		expect(row(wrapper, 0).text()).toContain("1,200 / 1,500 · 96.34 %");
		// 0.5 * 100 = 50.00
		expect(row(wrapper, 1).text()).toContain("250 / 200 · 50.00 %");
	});

	it("puts the unneeded tiers behind a toggle", async () => {
		const { wrapper } = await mountWorkforce();
		const toggle = unneededToggle(wrapper);

		expect(toggle.text()).toBe(
			"Show Game.workforce Type.technician, Game.workforce Type.scientist (not needed)"
		);
		expect(toggle.attributes("aria-expanded")).toBe("false");

		// showing lists them as rows, in tier order
		await toggle.trigger("click");
		expect(names(wrapper)).toEqual([
			"Game.workforce Type.pioneer",
			"Game.workforce Type.settler",
			"Game.workforce Type.technician",
			"Game.workforce Type.engineer",
			"Game.workforce Type.scientist",
		]);
		expect(toggle.text()).toBe("Hide the workforce not needed");
		expect(toggle.attributes("aria-expanded")).toBe("true");

		await toggle.trigger("click");
		expect(rows(wrapper)).toHaveLength(3);
		expect(toggle.attributes("aria-expanded")).toBe("false");
		// each switch is tracked with what it shows now
		expect(vi.mocked(trackEvent).mock.calls).toEqual([
			["plan:workforce_unneeded_toggle", { is_shown: true }],
			["plan:workforce_unneeded_toggle", { is_shown: false }],
		]);
	});

	it("keeps housed tiers without a need behind the toggle too", async () => {
		const { wrapper } = await mountWorkforce({
			workforceData: {
				...WORKFORCE,
				technician: wf("technician", { capacity: 5, left: 5 }, false),
				scientist: wf("scientist", { required: 5, left: -5 }, false),
			},
		});

		// technician is housed but not needed: no row
		expect(names(wrapper)).toEqual([
			"Game.workforce Type.pioneer",
			"Game.workforce Type.settler",
			"Game.workforce Type.engineer",
			"Game.workforce Type.scientist",
		]);
		expect(unneededToggle(wrapper).text()).toBe(
			"Show Game.workforce Type.technician (not needed)"
		);
	});

	it("has no toggle when every tier is needed", async () => {
		const { wrapper } = await mountWorkforce({
			workforceData: {
				...WORKFORCE,
				technician: wf("technician", { required: 5, left: -5 }, false),
				scientist: wf("scientist", { required: 5, left: -5 }, false),
			},
		});

		expect(rows(wrapper)).toHaveLength(5);
		expect(unneededToggle(wrapper).exists()).toBe(false);
	});

	it("shows how full the housing is", async () => {
		const { wrapper } = await mountWorkforce();

		// 1,200 / 1,500 = 80 %
		expect(meter(wrapper, 0).attributes("style")).toContain("width: 80%");
		// settler needs 250 with 200 housed: over
		expect(meters(wrapper)).toEqual([
			[1200, 1500],
			[250, 200],
			[10, 100],
		]);
	});

	it("keeps a need without housing visible, with a full meter", async () => {
		const { wrapper } = await mountWorkforce({
			workforceData: {
				...WORKFORCE,
				technician: wf("technician", { required: 5, left: -5 }, false),
			},
		});

		expect(names(wrapper)[2]).toBe("Game.workforce Type.technician");
		expect(row(wrapper, 2).text()).toContain("5 / 0");
		expect(meters(wrapper)[2]).toEqual([5, 0]);
	});

	it("shows the free beds, marked when short", async () => {
		const { wrapper } = await mountWorkforce();

		expect(
			[0, 1].map((i) => [
				bedsFree(wrapper, i).text(),
				bedsFree(wrapper, i).attributes("data-short"),
			])
		).toEqual([
			["300 free", "false"],
			["-50 free", "true"],
		]);

		// exactly full housing is not short
		const full = await mountWorkforce({
			workforceData: {
				...WORKFORCE,
				settler: wf("settler", { required: 200, capacity: 200, left: 0 }),
			},
		});
		expect(bedsFree(full.wrapper, 1).text()).toBe("0 free");
		expect(bedsFree(full.wrapper, 1).attributes("data-short")).toBe("false");
	});

	it("shows each workforce's luxury tickers", async () => {
		const { wrapper } = await mountWorkforce();

		expect(
			[0, 1, 2].map((i) => luxButtons(wrapper, i).map((b) => b.text()))
		).toEqual([
			["PWO", "COF"],
			["REP", "KOM"],
			["VG", "GIN"],
		]);
		expect(luxButtons(wrapper, 0).at(0)!.attributes("aria-label")).toBe(
			"Supply PWO"
		);
	});

	it("marks provided luxuries as pressed", async () => {
		const { wrapper } = await mountWorkforce();

		// pioneer lux1 only, settler lux2 only, engineer both
		expect(
			[0, 1, 2].map((i) =>
				luxButtons(wrapper, i).map((b) => b.attributes("aria-pressed"))
			)
		).toEqual([
			["true", "false"],
			["false", "true"],
			["true", "true"],
		]);
	});

	// settler has lux2 but no lux1 yet
	it.each([
		["lux1", true, 0, "Lux1"],
		["lux2", false, 1, "Lux2"],
	])(
		"toggles settler %s to %s and tracks it",
		async (lux, value, index, luxType) => {
			const { wrapper, component } = await mountWorkforce();

			await luxButtons(wrapper, 1).at(index)!.trigger("click");

			expect(component.emitted("update:lux")).toEqual([
				["settler", lux, value],
			]);
			expect(trackPlanEdit).toHaveBeenCalledWith({
				field: "workforce",
				planet_natural_id: "ZZ-000a",
				workforce_type: "settler",
				lux_type: luxType,
				value,
			});
		}
	);

	it("toggles pioneer lux1 off and lux2 on", async () => {
		const { wrapper, component } = await mountWorkforce();

		await luxButtons(wrapper, 0).at(0)!.trigger("click");
		await luxButtons(wrapper, 0).at(1)!.trigger("click");

		expect(component.emitted("update:lux")).toEqual([
			["pioneer", "lux1", false],
			["pioneer", "lux2", true],
		]);
	});

	it("follows new workforce data", async () => {
		const { wrapper, setProps } = await mountWorkforce();

		await setProps({
			workforceData: {
				...WORKFORCE,
				pioneer: wf("pioneer", { required: 5000, lux2: true }, false),
			},
		});

		expect(row(wrapper, 0).text()).toContain("5,000 / 0");
		expect(bedsFree(wrapper, 0).text()).toBe("0 free");
		expect(
			luxButtons(wrapper, 0).map((b) => b.attributes("aria-pressed"))
		).toEqual(["false", "true"]);
	});

	it.each([true, false])(
		"passes disabled: %s to the luxury toggles",
		async (disabled) => {
			const { wrapper } = await mountWorkforce({ disabled });

			// 3 used tiers, 2 luxuries each
			expect(
				wrapper
					.findAll("button[aria-pressed]")
					.map((b) => (b.element as HTMLButtonElement).disabled)
			).toEqual(Array(6).fill(disabled));
		}
	);
});
