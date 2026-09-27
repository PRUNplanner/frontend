import {
	describe,
	it,
	expect,
	beforeAll,
	afterEach,
	onTestFinished,
	vi,
} from "vitest";
import { h } from "vue";
import { DOMWrapper, flushPromises, type VueWrapper } from "@vue/test-utils";

import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import XITBurnActionButton from "@/features/xit/components/XITBurnActionButton.vue";
import PSelect from "@/ui/components/PSelect.vue";
import PInputNumber from "@/ui/components/PInputNumber.vue";
import { mountComponent } from "@/tests/mountComponent";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/features/material_tile/components/MaterialTile.vue", () => ({
	default: {
		name: "MaterialTile",
		props: { ticker: String },
		render: () => h("div"),
	},
}));

// the burn math is covered by useXITBurnAction.test.ts, this checks the
// wiring: elements, days, overrides and inactives into the table and JSON
const ELEMENTS = [
	// burns 10 days, needs 10 * days - 100
	{ ticker: "DW", stock: 100, delta: -10 },
	// burns 0.5 days, needs 100 * days - 50
	{ ticker: "RAT", stock: 50, delta: -100 },
	// produced, never runs out
	{ ticker: "FE", stock: 30, delta: 5 },
	// burns 100 days, enough stock for 20 days
	{ ticker: "H2O", stock: 500, delta: -5 },
];

const CONFIGURE = "Configure on Execution";

async function mountButton(props: Record<string, unknown> = {}) {
	return mountComponent(XITBurnActionButton, {
		elements: ELEMENTS,
		drawerTitle: "Burn of Plan A",
		...props,
	});
}

const body = () => new DOMWrapper(document.body);

async function open(wrapper: VueWrapper) {
	await wrapper.find("button").trigger("click");
	await flushPromises();
}

const materialRows = () => body().findAll(".n-drawer tbody:last-of-type tr");

/** stock, delta, burn and amount per material row */
const rowTexts = () =>
	materialRows().map((tr) =>
		tr
			.findAll("td")
			.slice(2, 6)
			.map((td) => td.text())
	);

const days = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PInputNumber).at(0)!;

const rowInputs = (wrapper: VueWrapper) =>
	wrapper.findAllComponents(PInputNumber).slice(1);

const rowCheckboxes = () =>
	body().findAll(".n-drawer tbody:last-of-type input[type=checkbox]");

const xitJSON = () =>
	JSON.parse(
		(body().find(".n-drawer textarea").element as HTMLTextAreaElement).value
	);

const transferred = () => xitJSON().groups[0].materials;

async function clickFit(label: string) {
	await body()
		.findAll(".n-drawer button")
		.find((b) => b.text() === label)!
		.trigger("click");
	await flushPromises();
}

const shownDays = (wrapper: VueWrapper) =>
	(days(wrapper).find("input").element as HTMLInputElement).value;

describe("XITBurnActionButton", () => {
	beforeAll(async () => {
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	afterEach(() => {
		vi.mocked(trackEvent).mockClear();
	});

	it("renders only the button until shown", async () => {
		const { wrapper } = await mountButton({
			buttonText: "Burn XIT",
			buttonSize: "sm",
		});

		expect(wrapper.find("button").text()).toBe("Burn XIT");
		expect(body().find(".n-drawer").exists()).toBe(false);
		expect(wrapper.findAllComponents(PInputNumber)).toHaveLength(0);
	});

	it("opens the drawer once per show", async () => {
		const { wrapper } = await mountButton();

		await open(wrapper);
		expect(body().find(".n-drawer").exists()).toBe(true);
		expect(body().find(".n-drawer-header").text()).toContain(
			"Burn of Plan A"
		);

		// a second click while open does not show it again
		await open(wrapper);
		expect(
			vi
				.mocked(trackEvent)
				.mock.calls.filter(([e]) => e === "xit_burn_show")
		).toHaveLength(1);
	});

	it("lists the elements with burn and resupply amount", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		// 20 resupply days by default
		expect(rowTexts()).toEqual([
			// 10 * 20 - 100
			["100", "-10.00", "10.00", "100"],
			// 100 * 20 - 50, 50 / 100 burn days
			["50", "-100.00", "0.50", "1,950"],
			["30", "5.00", "∞", "∞"],
			// 5 * 20 - 500 is below 0
			["500", "-5.00", "100.00", "0"],
		]);
		expect(shownDays(wrapper)).toBe("20");
	});

	it("highlights low burn days", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		const burnClass = materialRows().map((tr) =>
			tr.findAll("td").at(4)!.find("span").classes()
		);

		// red up to 5 days, yellow up to 10
		expect(burnClass).toEqual([
			["text-black", "bg-positive", "px-2", "py-0.75"],
			["text-white", "bg-negative", "px-2", "py-0.75"],
			[],
			[],
		]);
	});

	it("generates the XIT JSON of the finite, positive amounts", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		expect(xitJSON()).toEqual({
			actions: [
				{
					type: "MTRA",
					name: "TransferAction",
					group: "A1",
					origin: CONFIGURE,
					dest: CONFIGURE,
				},
			],
			global: { name: "PRUNplanner Burn Supply" },
			groups: [
				{
					type: "Manual",
					name: "A1",
					materials: { DW: 100, RAT: 1950 },
				},
			],
		});
		// no station, no CX to buy from
		expect(body().text()).toContain("xit.form.buy_from_cx_warning");
	});

	it("recalculates with the resupply days", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		await days(wrapper).find("input").setValue("120");
		await flushPromises();

		// 10 * 120 - 100, 100 * 120 - 50, 5 * 120 - 500
		expect(transferred()).toEqual({ DW: 1100, RAT: 11950, H2O: 100 });
	});

	it("uses positive material overrides", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		// rows: DW, RAT, FE, H2O
		await rowInputs(wrapper).at(0)!.find("input").setValue("555");
		await rowInputs(wrapper).at(3)!.find("input").setValue("40");
		await flushPromises();
		expect(transferred()).toEqual({ DW: 555, RAT: 1950, H2O: 40 });

		// an override of 0 falls back to the calculated amount
		await rowInputs(wrapper).at(0)!.find("input").setValue("0");
		await flushPromises();
		expect(transferred()).toEqual({ DW: 100, RAT: 1950, H2O: 40 });
	});

	it("leaves inactive materials out until re-activated", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		await rowCheckboxes().at(1)!.setValue(false);
		await flushPromises();
		expect(transferred()).toEqual({ DW: 100 });
		expect(
			(rowCheckboxes().at(1)!.element as HTMLInputElement).checked
		).toBe(false);

		await rowCheckboxes().at(1)!.setValue(true);
		await flushPromises();
		expect(transferred()).toEqual({ DW: 100, RAT: 1950 });
	});

	it("hides materials that never run out", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		// without a station the buy checkbox is hidden, hide infinite is first
		await body()
			.findAll(".n-drawer input[type=checkbox]")
			.at(0)!
			.setValue(true);
		await flushPromises();

		expect(rowTexts().map((r) => r[3])).toEqual(["100", "1,950", "0"]);
	});

	it.each([
		// weight 22 * days - 20.5 <= 500
		["500", "23"],
		// 22 * days - 20.5 <= 1000
		["1k", "46"],
		["2k", "91"],
		// volume 11 * days - 15 <= 1000
		["3k/1k", "92"],
		["1k/3k", "46"],
		// capped at 100 days
		["5k", "100"],
	])("fits a %s ship in %s days", async (label, expected) => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		await clickFit(label);

		expect(shownDays(wrapper)).toBe(expected);
	});

	it("adds a CX buy action for a station origin", async () => {
		const { wrapper } = await mountButton();
		await open(wrapper);

		wrapper
			.findComponent(PSelect)
			.vm.$emit("update:value", "Antares Station Warehouse");
		await flushPromises();

		expect(xitJSON().actions).toEqual([
			{
				group: "A1",
				exchange: "AI1",
				priceLimits: {},
				buyPartial: false,
				useCXInv: true,
				name: "BuyItems",
				type: "CX Buy",
			},
			{
				type: "MTRA",
				name: "TransferAction",
				group: "A1",
				origin: "Antares Station Warehouse",
				dest: CONFIGURE,
			},
		]);

		// buying is a preference, the first checkbox once a station is set
		await body()
			.findAll(".n-drawer input[type=checkbox]")
			.at(0)!
			.setValue(false);
		await flushPromises();
		expect(xitJSON().actions.map((a: { type: string }) => a.type)).toEqual([
			"MTRA",
		]);
	});

	it("does not write typing into the generated JSON", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		onTestFinished(() => {
			warn.mockRestore();
		});
		const { wrapper } = await mountButton();
		await open(wrapper);

		await body().find(".n-drawer textarea").setValue("test-typing");

		// a write would fail: "computed value is readonly"
		expect(warn).not.toHaveBeenCalled();
	});

	it("copies the XIT JSON", async () => {
		const writeText = vi.fn(() => Promise.resolve());
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		const { wrapper } = await mountButton();
		await open(wrapper);

		await body()
			.findAll(".n-drawer button")
			.find((b) => b.text() === "xit.buttons.copy_json")!
			.trigger("click");

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(JSON.parse(writeText.mock.calls[0][0])).toEqual(xitJSON());
		// @ts-expect-error jsdom has no clipboard, remove the stub again
		delete navigator.clipboard;
	});

	it("renders an empty table without elements", async () => {
		const { wrapper } = await mountButton({ elements: [] });
		await open(wrapper);

		expect(rowCheckboxes()).toHaveLength(0);
		expect(transferred()).toEqual({});
	});
});
