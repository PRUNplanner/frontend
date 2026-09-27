import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

import { trackEvent } from "@/lib/analytics/useAnalytics";
import PlanWorkforce from "@/features/planning/components/PlanWorkforce.vue";
import { CheckSharp, BlockOutlined } from "@vicons/material";
import PButton from "@/ui/components/PButton.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { WorkforceType } from "@/features/api/schemas/planningData.schemas";
import type {
	IWorkforceElement,
	IWorkforceRecord,
} from "@/features/planning/usePlanCalculation.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

const wf = (
	name: WorkforceType,
	data: Partial<IWorkforceElement> = {}
): IWorkforceElement => ({
	name,
	required: 0,
	capacity: 0,
	left: 0,
	lux1: false,
	lux2: false,
	efficiency: 0,
	...data,
});

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
	technician: wf("technician"),
	engineer: wf("engineer", {
		required: 10,
		capacity: 100,
		left: 90,
		lux1: true,
		lux2: true,
		efficiency: 1,
	}),
	scientist: wf("scientist"),
};

async function mountWorkforce(props: Record<string, unknown> = {}) {
	return mountComponent(PlanWorkforce, {
		disabled: false,
		workforceData: WORKFORCE,
		planetNaturalId: "ZZ-000a",
		...props,
	});
}

const row = (wrapper: VueWrapper, index: number) =>
	wrapper.findAll("tbody tr").at(index)!;
const cells = (wrapper: VueWrapper, index: number) =>
	row(wrapper, index).findAll("td");
const texts = (wrapper: VueWrapper, index: number) =>
	cells(wrapper, index).map((td) => td.text());
/** lux1 / lux2 buttons of a row */
const luxButtons = (wrapper: VueWrapper, index: number) =>
	row(wrapper, index).findAllComponents(PButton);

describe("PlanWorkforce", () => {
	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
	});

	it("lists every workforce with need, supply, open and efficiency", async () => {
		const { wrapper } = await mountWorkforce();

		expect(wrapper.findAll("tbody tr")).toHaveLength(5);
		// capitalizeString("game.workforce_type.pioneer"): "_" becomes " ",
		// then each word is capitalized
		// 0.9634 * 100 = 96.34
		expect(texts(wrapper, 0)).toEqual([
			"Game.workforce Type.pioneer",
			"1,200",
			"1,500",
			"300",
			"PWO",
			"COF",
			"96.34",
		]);
		// 0.5 * 100 = 50.00
		expect(texts(wrapper, 1)).toEqual([
			"Game.workforce Type.settler",
			"250",
			"200",
			"-50",
			"REP",
			"KOM",
			"50.00",
		]);
	});

	it("shows each workforce's luxury tickers", async () => {
		const { wrapper } = await mountWorkforce();

		expect(
			[0, 1, 2, 3, 4].map((i) =>
				luxButtons(wrapper, i).map((b) => b.text())
			)
		).toEqual([
			["PWO", "COF"],
			["REP", "KOM"],
			["SC", "ALE"],
			["VG", "GIN"],
			["NST", "WIN"],
		]);
	});

	it("marks provided luxuries", async () => {
		const { wrapper } = await mountWorkforce();

		// pioneer lux1 only, settler lux2 only, engineer both
		expect(
			[0, 1, 2, 3].map((i) =>
				luxButtons(wrapper, i).map((b) => b.props("type"))
			)
		).toEqual([
			["success", "secondary"],
			["secondary", "success"],
			["secondary", "secondary"],
			["success", "success"],
		]);
	});

	it("shows a check for provided luxuries and a block otherwise", async () => {
		const { wrapper } = await mountWorkforce();

		const icons = (index: number) =>
			luxButtons(wrapper, index).map((b) =>
				b.findComponent(CheckSharp).exists()
					? "check"
					: b.findComponent(BlockOutlined).exists()
						? "block"
						: "none"
			);
		// pioneer lux1 only, settler lux2 only
		expect(icons(0)).toEqual(["check", "block"]);
		expect(icons(1)).toEqual(["block", "check"]);
	});

	it("grays out zero values", async () => {
		const { wrapper } = await mountWorkforce();

		const gray = (index: number) =>
			cells(wrapper, index).map((td) =>
				td.classes().includes("text-white/50!")
			);

		// name, need, supply, open, lux1, lux2, efficiency
		expect(gray(2)).toEqual([false, true, true, true, false, false, true]);
		expect(gray(0)).toEqual([
			false,
			false,
			false,
			false,
			false,
			false,
			false,
		]);
		// settler lacks 50 workers, a negative open value stays visible
		expect(gray(1)[3]).toBe(false);
	});

	it("grays out each zero value on its own", async () => {
		const { wrapper } = await mountWorkforce({
			workforceData: {
				...WORKFORCE,
				technician: wf("technician", { required: 5, left: 0 }),
				scientist: wf("scientist", { capacity: 5, efficiency: 0.2 }),
			},
		});

		const gray = (index: number) =>
			cells(wrapper, index).map((td) =>
				td.classes().includes("text-white/50!")
			);

		expect(gray(2)).toEqual([false, false, true, true, false, false, true]);
		expect(gray(4)).toEqual([
			false,
			true,
			false,
			true,
			false,
			false,
			false,
		]);
	});

	it("toggles lux1 on and tracks it", async () => {
		const { wrapper, component } = await mountWorkforce();

		// settler has no lux1 yet
		await luxButtons(wrapper, 1).at(0)!.trigger("click");

		expect(component.emitted("update:lux")).toEqual([
			["settler", "lux1", true],
		]);
		expect(trackEvent).toHaveBeenCalledWith("plan_update_workforce", {
			planetNaturalId: "ZZ-000a",
			workforceType: "settler",
			luxType: "Lux1",
			value: true,
		});
	});

	it("toggles lux2 off and tracks it", async () => {
		const { wrapper, component } = await mountWorkforce();

		// settler has lux2
		await luxButtons(wrapper, 1).at(1)!.trigger("click");

		expect(component.emitted("update:lux")).toEqual([
			["settler", "lux2", false],
		]);
		expect(trackEvent).toHaveBeenCalledWith("plan_update_workforce", {
			planetNaturalId: "ZZ-000a",
			workforceType: "settler",
			luxType: "Lux2",
			value: false,
		});
	});

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
				pioneer: wf("pioneer", { required: 5000, lux2: true }),
			},
		});

		expect(texts(wrapper, 0).slice(1, 4)).toEqual(["5,000", "0", "0"]);
		expect(luxButtons(wrapper, 0).map((b) => b.props("type"))).toEqual([
			"secondary",
			"success",
		]);
	});

	it("disables the luxury buttons", async () => {
		const { wrapper } = await mountWorkforce({ disabled: true });

		expect(
			wrapper
				.findAll("tbody button")
				.every((b) => b.attributes("disabled") !== undefined)
		).toBe(true);
	});

	it("enables the luxury buttons", async () => {
		const { wrapper } = await mountWorkforce();

		expect(
			wrapper
				.findAll("tbody button")
				.some((b) => b.attributes("disabled") !== undefined)
		).toBe(false);
	});
});
