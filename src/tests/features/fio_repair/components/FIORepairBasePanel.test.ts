import { beforeEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { createPinia, type Pinia, setActivePinia } from "pinia";

import fio from "@/locales/en_US/fio.json";

// Stores
import { useUserStore } from "@/stores/userStore";

// Composables
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { useXITAction } from "@/features/xit/useXITAction";

// Components
import FIORepairBasePanel from "@/features/fio_repair/components/FIORepairBasePanel.vue";
import { PSelect } from "@/ui";
import { mountComponent } from "@/tests/mountComponent";
import {
	BOBER_SITE,
	OTHER_PLAN_UUID,
	bober,
	shiptronia,
} from "@/tests/features/fio_repair/components/fioRepairBase";

// Types & Interfaces
import type { IFIORepairBase } from "@/features/fio_repair/fioRepair.types";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock(
	"@/features/material_tile/components/MaterialTile.vue",
	async () => (await import("@/tests/stubs")).materialTile
);

const messages = { fio };
const FLIGHT = {
	load: {
		materials: [
			{
				ticker: "TSH",
				amount: 17,
				cost: 675000,
				weight: 150,
				volume: 200,
			},
			{ ticker: "LDE", amount: 35, cost: 455000, weight: 51, volume: 69 },
		],
		cost: 1130000,
		weight: 201,
		volume: 269,
	},
	fromStore: [{ ticker: "BSE", input: 5, output: 0 }],
	extra: 480,
};

let pinia: Pinia;

async function mountPanel(
	base: IFIORepairBase = bober(),
	props: Record<string, unknown> = {}
) {
	return mountComponent(
		FIORepairBasePanel,
		{
			base,
			flight: FLIGHT,
			interval: 60,
			usePlans: true,
			cxName: "Home AI1",
			useStore: true,
			...props,
		},
		{ pinia, messages }
	);
}

const body = () => new DOMWrapper(document.body);

describe("FIORepairBasePanel", () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		vi.mocked(trackEvent).mockClear();
	});

	it("header, types, flight and load", async () => {
		const { wrapper } = await mountPanel();
		const text = wrapper.text();
		expect(text).toContain("17 production buildings");
		expect(text).toContain("Overdue 2 d");
		expect(
			wrapper
				.findAll("[data-testid=fio-repair-type]")
				.map((r) => r.text())
		).toStrictEqual([
			"10× POL70 d72 d92.5 % Overdue 2 d",
			"7× LAB75 d72 d92.5 % Due in 3 d",
		]);
		expect(wrapper.find("[data-testid=fio-repair-extra]").text()).toBe(
			"+480 ȼ vs. repairing today"
		);
		expect(wrapper.find("[data-testid=fio-repair-weight]").text()).toBe(
			"201 t"
		);
		expect(
			wrapper.findAll("[data-testid=fio-repair-material]")
		).toHaveLength(2);
		expect(wrapper.find("[data-testid=fio-repair-from-store]").text()).toBe(
			"From the base store: 5 BSE"
		);
		expect(wrapper.find("[data-testid=fio-repair-total]").text()).toBe(
			"1,130,000 ȼ"
		);
		expect(text).toContain("Total · Exchange Preference Home AI1");
		expect(text).toContain("Load · all 17 buildings");
		expect(text).toContain("2 materials · 201 t · 269 m³");
		expect(text).toContain(
			"Pick the ship when you run the XIT, fly to Bober, unload and run BRA."
		);
	});

	it("picks a plan or no plan per SiteId", async () => {
		const userStore = useUserStore();
		const { wrapper } = await mountPanel();
		const select = wrapper.findComponent(PSelect);

		expect(
			select.props("options").map((o: { label: string }) => o.label)
		).toStrictEqual([
			"Bober NR+PG · 100 % match · Sky Productions",
			"meow · 50 % match",
			"No plan · every 60 days",
		]);
		expect(wrapper.find("[data-testid=fio-repair-confidence]").text()).toBe(
			"Matched"
		);
		expect(wrapper.find("[data-testid=fio-repair-auto]").exists()).toBe(
			false
		);

		select.vm.$emit("update:value", OTHER_PLAN_UUID);
		expect(userStore.preferences.fioRepairPlanLinks).toStrictEqual({
			[BOBER_SITE]: { planUuid: OTHER_PLAN_UUID },
		});
		expect(trackEvent).toHaveBeenCalledWith("fio_repair:plan_link_set", {
			to: "plan",
		});

		select.vm.$emit("update:value", "none");
		expect(
			userStore.preferences.fioRepairPlanLinks[BOBER_SITE]
		).toStrictEqual({ planUuid: null });
		expect(trackEvent).toHaveBeenCalledWith("fio_repair:plan_link_set", {
			to: "none",
		});
	});

	it("back to automatic deletes the link", async () => {
		const userStore = useUserStore();
		userStore.preferences.fioRepairPlanLinks = {
			[BOBER_SITE]: { planUuid: null },
		};
		const { wrapper } = await mountPanel(
			bober({
				match: {
					...bober().match,
					candidate: undefined,
					confidence: "nopick",
				},
			})
		);
		expect(wrapper.findComponent(PSelect).props("value")).toBe("none");
		expect(wrapper.text()).toContain(
			"You chose no plan for this base. Repairs every 60 days."
		);

		await wrapper.find("[data-testid=fio-repair-auto]").trigger("click");
		expect(userStore.preferences.fioRepairPlanLinks).toStrictEqual({});
		expect(trackEvent).toHaveBeenCalledWith("fio_repair:plan_link_set", {
			to: "auto",
		});
	});

	it("without SiteId the pick is disabled; no plans offers to create one", async () => {
		const userStore = useUserStore();
		const { wrapper } = await mountPanel(shiptronia());
		const select = wrapper.findComponent(PSelect);
		expect(select.props("disabled")).toBe(true);

		select.vm.$emit("update:value", "none");
		expect(userStore.preferences.fioRepairPlanLinks).toStrictEqual({});

		expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
			"/plan/VH-331e"
		);
		expect(wrapper.text()).toContain("Create a plan for Shiptronia");
		expect(wrapper.text()).toContain(
			"No plan on this planet. Repairs every 60 days."
		);
		expect(wrapper.text()).toContain("built 41 d");
	});

	it("reasons: likely, picked, none with candidates, plans off", async () => {
		const likely = bober({
			match: { ...bober().match, confidence: "likely" },
		});
		likely.match.candidate = { ...likely.match.candidate!, score: 0.96 };
		const { wrapper, setProps } = await mountPanel(likely);
		expect(wrapper.text()).toContain(
			"96 % of the buildings match FIO. Check that this is the plan you run."
		);

		await setProps({
			base: bober({ match: { ...bober().match, confidence: "picked" } }),
		});
		expect(wrapper.find("[data-testid=fio-repair-confidence]").text()).toBe(
			"Your choice"
		);

		await setProps({
			base: bober({
				match: {
					...bober().match,
					candidate: undefined,
					confidence: "none",
				},
			}),
		});
		expect(wrapper.text()).toContain(
			"No plan here matches FIO well enough. Pick one, or keep every 60 days."
		);

		await setProps({ usePlans: false });
		expect(wrapper.find("[data-testid=fio-repair-confidence]").text()).toBe(
			"No plan"
		);
		expect(wrapper.text()).toContain(
			"Matched plans are off. Repairs every 60 days."
		);
	});

	it("store checkbox, arrival days, navigation", async () => {
		const userStore = useUserStore();
		const onStore = vi.fn();
		const onChange = vi.fn();
		const onClose = vi.fn();
		const { wrapper, setProps } = await mountPanel(bober(), {
			"onUpdate:useStore": onStore,
			onChange,
			onClose,
			nav: "back",
			flight: { ...FLIGHT, extra: 0, fromStore: [] },
		});

		expect(wrapper.find("[data-testid=fio-repair-extra]").text()).toBe(
			"amounts as of today"
		);
		await wrapper
			.find("[data-testid=fio-repair-store] input")
			.setValue(false);
		expect(onStore).toHaveBeenCalledWith(false);

		await wrapper
			.find<HTMLInputElement>("[data-testid=fio-repair-arrival] input")
			.setValue("5");
		expect(userStore.preferences.fioRepairArrivalDays).toBe(5);
		expect(onChange).toHaveBeenCalledWith("arrival");

		await wrapper.find("[data-testid=fio-repair-back]").trigger("click");
		await setProps({ nav: "close" });
		await wrapper.find("[data-testid=fio-repair-close]").trigger("click");
		expect(onClose).toHaveBeenCalledTimes(2);

		await setProps({
			flight: {
				load: { materials: [], cost: 0, weight: 0, volume: 0 },
				fromStore: [],
				extra: 0,
			},
		});
		expect(wrapper.text()).toContain(
			"Nothing to load: the base store covers the whole repair."
		);
	});

	it("XIT Repair: the load, a generic name, shared origin and CX buy", async () => {
		const userStore = useUserStore();
		userStore.preferences.burnOrigin = "Antares Station Warehouse";
		userStore.preferences.defaultBuyItemsFromCX = true;
		const { wrapper } = await mountPanel();

		const xit = wrapper
			.findAll("button")
			.find((b) => b.text() === "XIT Repair")!;
		await xit.trigger("click");
		await flushPromises();

		const dialog = body().find("[role=dialog]");
		expect(dialog.text()).toContain("XIT Repair · Bober");
		const json = (dialog.find("textarea").element as HTMLTextAreaElement)
			.value;
		const { transferJSON } = useXITAction();
		expect(json).toBe(
			transferJSON(
				[
					{ ticker: "TSH", value: 17 },
					{ ticker: "LDE", value: 35 },
				],
				{
					name: "Repair",
					origin: "Antares Station Warehouse",
					buy: true,
				}
			).value
		);
		expect(JSON.parse(json).global.name).toBe("PRUNplanner Repair");
		expect(JSON.parse(json).actions[0].type).toBe("CX Buy");
		expect(JSON.parse(json).actions[1].dest).toBe("Configure on Execution");
		expect(dialog.find("[data-testid=xit-transfer-note]").text()).toBe(
			"The ship is picked when the XIT runs. It needs 201 t and 269 m³ of free cargo."
		);
	});
});
