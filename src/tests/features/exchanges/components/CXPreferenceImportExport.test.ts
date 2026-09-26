import { describe, it, expect, afterEach, vi } from "vitest";
import { VueWrapper } from "@vue/test-utils";

import CXPreferenceImportExport from "@/features/exchanges/components/CXPreferenceImportExport.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import {
	ICXDataExchangeOption,
	ICXDataTickerOption,
} from "@/stores/planningStore.types";
import { ICXPlanetMap } from "@/features/exchanges/manageCX.types";

const CX_EMPIRE: ICXDataExchangeOption[] = [
	{ type: "BOTH", exchange: "AI1_30D" },
];
const EMPIRE_TICKERS: ICXDataTickerOption[] = [
	{ type: "BUY", ticker: "RAT", value: 150 },
	{ type: "SELL", ticker: "DW", value: 80.5 },
];
const CX_PLANETS: ICXPlanetMap[string][] = [
	{
		planet: "ZV-307c",
		exchanges: [{ type: "SELL", exchange: "NC1_7D" }],
		ticker: [],
	},
];
const PLANET_TICKERS: ICXPlanetMap[string][] = [
	{
		planet: "OT-580b",
		exchanges: [],
		ticker: [
			{ type: "BUY", ticker: "H2O", value: 30 },
			{ type: "BOTH", ticker: "C", value: 90 },
		],
	},
];

// what the export writes for the props above
const CSV = [
	"Location;Type;CX;Ticker;Price",
	"EMPIRE;BOTH;AI1_30D;;",
	"ZV-307c;SELL;NC1_7D;;",
	"EMPIRE;BUY;;RAT;150",
	"EMPIRE;SELL;;DW;80.5",
	"OT-580b;BUY;;H2O;30",
	"OT-580b;BOTH;;C;90",
].join("\n");

async function mountImportExport() {
	return mountComponent(CXPreferenceImportExport, {
		cxEmpire: CX_EMPIRE,
		cxPlanets: CX_PLANETS,
		empireTickerOptions: EMPIRE_TICKERS,
		planetTickerOptions: PLANET_TICKERS,
	});
}

function button(wrapper: VueWrapper, key: "import" | "export") {
	const b = wrapper
		.findAll("button")
		.find(
			(b) =>
				b.text() ===
				`exchanges.components.csv_import_export.buttons.${key}`
		);
	expect(b).toBeDefined();
	return b!;
}

/** selects a file in the hidden input */
async function selectFile(wrapper: VueWrapper, content: string) {
	const input = wrapper.find("input[type=file]");
	const file = new File([content], "prefs.csv", { type: "text/csv" });
	Object.defineProperty(input.element, "files", {
		value: [file],
		configurable: true,
	});
	// jsdom keeps a file input's value empty, a browser shows the path
	let value = "C:\\fakepath\\prefs.csv";
	Object.defineProperty(input.element, "value", {
		get: () => value,
		set: (v: string) => (value = v),
		configurable: true,
	});
	await input.trigger("change");
	return input.element as HTMLInputElement;
}

const EVENTS = [
	"update:cxEmpire",
	"update:empireTickerOptions",
	"update:cxPlanets",
	"update:planetTickerOptions",
];

describe("CXPreferenceImportExport", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("exports all preferences as a CSV download", async () => {
		// jsdom has no object URLs
		const blobs: Blob[] = [];
		URL.createObjectURL = vi.fn((b: Blob) => {
			blobs.push(b);
			return "blob:prefs";
		});
		URL.revokeObjectURL = vi.fn();
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				expect(this.getAttribute("download")).toBe(
					"PRUNPlannerExchangePreferences.csv"
				);
				expect(this.href).toBe("blob:prefs");
			});
		const { wrapper } = await mountImportExport();

		await button(wrapper, "export").trigger("click");

		expect(click).toHaveBeenCalledTimes(1);
		expect(blobs).toHaveLength(1);
		expect(blobs[0].type).toBe("text/csv;charset=utf-8;");
		expect(await blobs[0].text()).toBe(CSV);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:prefs");
		// the temporary link is removed again
		expect(document.body.querySelector("a[download]")).toBeNull();
	});

	it("opens the file selection on import", async () => {
		const { wrapper } = await mountImportExport();
		const click = vi.spyOn(
			wrapper.find("input[type=file]").element as HTMLInputElement,
			"click"
		);

		await button(wrapper, "import").trigger("click");

		expect(click).toHaveBeenCalledTimes(1);
	});

	it("imports an exported file into all four preference lists", async () => {
		const { wrapper, component } = await mountImportExport();

		const input = await selectFile(wrapper, CSV);

		await vi.waitFor(() =>
			expect(component.emitted("update:planetTickerOptions")).toBeDefined()
		);
		expect(component.emitted("update:cxEmpire")).toEqual([[CX_EMPIRE]]);
		expect(component.emitted("update:empireTickerOptions")).toEqual([
			[EMPIRE_TICKERS],
		]);
		expect(component.emitted("update:cxPlanets")).toEqual([[CX_PLANETS]]);
		expect(component.emitted("update:planetTickerOptions")).toEqual([
			[PLANET_TICKERS],
		]);
		// the same file can be selected again
		expect(input.value).toBe("");
	});

	it("groups planet rows by planet", async () => {
		const { wrapper, component } = await mountImportExport();

		await selectFile(
			wrapper,
			[
				"Location;Type;CX;Ticker;Price",
				"ZV-307c;BUY;AI1_7D;;",
				"OT-580b;SELL;IC1_30D;;",
				"ZV-307c;SELL;CI1_ASK;;",
				"ZV-307c;BUY;;FE;12",
			].join("\n")
		);

		await vi.waitFor(() =>
			expect(component.emitted("update:cxPlanets")).toBeDefined()
		);
		expect(component.emitted("update:cxPlanets")![0][0]).toEqual([
			{
				planet: "ZV-307c",
				exchanges: [
					{ type: "BUY", exchange: "AI1_7D" },
					{ type: "SELL", exchange: "CI1_ASK" },
				],
				ticker: [],
			},
			{
				planet: "OT-580b",
				exchanges: [{ type: "SELL", exchange: "IC1_30D" }],
				ticker: [],
			},
		]);
		expect(component.emitted("update:planetTickerOptions")![0][0]).toEqual(
			[
				{
					planet: "ZV-307c",
					exchanges: [],
					ticker: [{ type: "BUY", ticker: "FE", value: 12 }],
				},
			]
		);
		expect(component.emitted("update:cxEmpire")).toEqual([[[]]]);
	});

	it("does nothing without a selected file", async () => {
		const error = vi.spyOn(console, "error");
		const { wrapper, component } = await mountImportExport();
		const input = wrapper.find("input[type=file]");
		Object.defineProperty(input.element, "files", { value: [] });

		await input.trigger("change");
		await new Promise((r) => setTimeout(r, 50));

		for (const event of EVENTS)
			expect(component.emitted(event)).toBeUndefined();
		// not even an attempt to parse
		expect(error).not.toHaveBeenCalled();
	});

	it.each([
		["a file that is not a preference export", '{"cx_empire": []}'],
		["an empty file", ""],
		[
			"an unknown preference type",
			"Location;Type;CX;Ticker;Price\nEMPIRE;MAYBE;AI1_30D;;",
		],
		[
			"an unknown exchange",
			"Location;Type;CX;Ticker;Price\nEMPIRE;BUY;AI1_BUY;;",
		],
		[
			"a price that is not a number",
			"Location;Type;CX;Ticker;Price\nEMPIRE;BUY;;RAT;cheap",
		],
		[
			"a ticker row without price",
			"Location;Type;CX;Ticker;Price\nZV-307c;SELL;;RAT;",
		],
	])("keeps the preferences on %s", async (_name, content) => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, component } = await mountImportExport();

		const input = await selectFile(wrapper, content);

		await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1));
		for (const event of EVENTS) expect(component.emitted(event)).toBeUndefined();
		expect(input.value).toBe("");
	});
});
