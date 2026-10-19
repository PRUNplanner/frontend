import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, type VueWrapper } from "@vue/test-utils";

import CXHeader from "@/features/exchanges/components/CXHeader.vue";
import { useCXImportExport } from "@/features/exchanges/useCXImportExport";
import { mountComponent } from "@/tests/mountComponent";
import { pendingConfirm, settleConfirm } from "@/ui/useConfirm";
import { toasts } from "@/ui/useToast";

// Types & Interfaces
import type { CXData } from "@/features/api/schemas/cxData.schemas";

const { push, parse } = vi.hoisted(() => ({ push: vi.fn(), parse: vi.fn() }));

vi.mock("vue-router", async (original) => ({
	...(await original<typeof import("vue-router")>()),
	useRouter: () => ({ push }),
}));
vi.mock("@/features/help/components/HelpDrawer.vue", () => ({
	default: { name: "HelpDrawer", props: ["fileName"], render: () => null },
}));
// the file reading is tested in useCXImportExport.test.ts
vi.mock("@/features/exchanges/useCXImportExport", async (original) => {
	const actual =
		await original<
			typeof import("@/features/exchanges/useCXImportExport")
		>();
	return {
		useCXImportExport: () => ({
			...actual.useCXImportExport(),
			parseSettingsCSV: parse,
		}),
	};
});

const cxData: CXData = {
	cx_empire: [{ type: "BOTH", exchange: "NC1_30D" }],
	cx_planets: [
		{ planet: "A", preferences: [{ type: "BUY", exchange: "AI1_7D" }] },
	],
	ticker_empire: [{ type: "BUY", ticker: "RAT", value: 75 }],
	ticker_planets: [
		{
			planet: "A",
			preferences: [{ type: "BOTH", ticker: "DW", value: 5 }],
		},
	],
};

// plural forms read the count, so the confirm shows the numbers
const messages = {
	exchanges: {
		csv: {
			exchange_rules: "{n} exchange rule | {n} exchange rules",
			fixed_prices: "{n} fixed price | {n} fixed prices",
			confirm: "{preference} <- {file}: {exchanges}, {fixed}",
			error: "{file}: {reason}",
		},
	},
};

async function mountHeader(props: Record<string, unknown> = {}) {
	const { wrapper, component } = await mountComponent(
		CXHeader,
		{ name: "Home", cxData, ...props },
		{ attach: true, messages }
	);
	return { wrapper, component };
}

const button = (wrapper: VueWrapper, text: string) =>
	wrapper.findAll("button").find((b) => b.text() === text)!;

async function chooseFile(wrapper: VueWrapper, file?: File) {
	const input = wrapper.find<HTMLInputElement>("input[type=file]");
	Object.defineProperty(input.element, "files", {
		value: file ? [file] : [],
		configurable: true,
	});
	await input.trigger("change");
	await flushPromises();
	return input;
}

const body = () => document.body;
const menuItem = (label: string) =>
	Array.from(body().querySelectorAll<HTMLElement>("[role=menuitem]")).find(
		(e) => e.textContent?.includes(label)
	)!;

describe("CXHeader", () => {
	beforeEach(() => {
		push.mockClear();
		parse.mockReset();
		toasts.value = [];
	});
	afterEach(() => settleConfirm(false));

	it("shows the preference name, else the view title", async () => {
		const { wrapper, setProps } = await mountComponent(
			CXHeader,
			{ name: "Home", cxData },
			{ messages }
		);
		expect(wrapper.find("h1").text()).toBe("Home");

		await setProps({ name: "" });
		expect(wrapper.find("h1").text()).toBe("exchanges.title");
	});

	it("opens the exchanges help", async () => {
		const { wrapper } = await mountHeader();

		expect(
			wrapper.getComponent({ name: "HelpDrawer" }).props("fileName")
		).toBe("exchanges");
	});

	it("disables import and export, and hides the menu without a preference", async () => {
		const { wrapper } = await mountHeader({ cxData: undefined });

		expect(
			button(wrapper, "exchanges.header.import").attributes("disabled")
		).toBeDefined();
		expect(
			button(wrapper, "exchanges.header.export").attributes("disabled")
		).toBeDefined();
		expect(wrapper.find("[aria-haspopup=menu]").exists()).toBe(false);
	});

	describe("export", () => {
		it("downloads the rules as CSV", async () => {
			let blob: Blob | undefined;
			URL.createObjectURL = vi.fn((b: Blob) => {
				blob = b;
				return "blob:x";
			});
			URL.revokeObjectURL = vi.fn();
			let download: string | null = null;
			const click = vi
				.spyOn(HTMLAnchorElement.prototype, "click")
				.mockImplementation(function (this: HTMLAnchorElement) {
					download = this.getAttribute("download");
				});
			const { wrapper } = await mountHeader();

			await button(wrapper, "exchanges.header.export").trigger("click");

			const expected = useCXImportExport().generateSettingsCSV(
				cxData.cx_empire,
				cxData.ticker_empire,
				[
					{
						planet: "A",
						exchanges: cxData.cx_planets[0].preferences,
						ticker: [],
					},
				],
				[
					{
						planet: "A",
						exchanges: [],
						ticker: cxData.ticker_planets[0].preferences,
					},
				]
			);
			expect(await blob!.text()).toBe(expected);
			expect(blob!.type).toBe("text/csv;charset=utf-8;");
			expect(click).toHaveBeenCalledTimes(1);
			expect(download).toBe("PRUNPlannerExchangePreferences.csv");
			expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
			click.mockRestore();
		});
	});

	describe("import", () => {
		const parsed = {
			empireCX: [{ type: "BUY", exchange: "CI1_ASK" }],
			empireTickerOptions: [],
			planetsCX: [
				{
					planet: "B",
					exchanges: [
						{ type: "BUY", exchange: "AI1_7D" },
						{ type: "SELL", exchange: "IC1_ASK" },
					],
					ticker: [],
				},
			],
			plantesTickerOptions: [
				{
					planet: "B",
					exchanges: [],
					ticker: [{ type: "BOTH", ticker: "DW", value: 1 }],
				},
			],
		};

		it("opens the file picker from the import button", async () => {
			const { wrapper } = await mountHeader();
			const click = vi
				.spyOn(HTMLInputElement.prototype, "click")
				.mockImplementation(() => {});

			await button(wrapper, "exchanges.header.import").trigger("click");

			expect(click).toHaveBeenCalledTimes(1);
			click.mockRestore();
		});

		it("ignores a cancelled file dialog", async () => {
			const { wrapper } = await mountHeader();

			await chooseFile(wrapper);

			expect(parse).not.toHaveBeenCalled();
			expect(pendingConfirm.value).toBeNull();
			expect(toasts.value).toEqual([]);
		});

		it("asks with the counts of the file, then emits the data", async () => {
			parse.mockResolvedValue(parsed);
			const { wrapper, component } = await mountHeader();

			const input = await chooseFile(
				wrapper,
				new File(["x"], "rules.csv")
			);

			// the input resets, so the same file can be picked again
			expect(input.element.value).toBe("");
			expect(pendingConfirm.value?.options).toMatchObject({
				title: "exchanges.csv.confirm_title",
				content: "Home <- rules.csv: 3 exchange rules, 1 fixed price",
				positiveText: "exchanges.csv.replace",
			});
			settleConfirm(true);
			await flushPromises();

			expect(component.emitted("import")).toEqual([
				[
					{
						cx_empire: parsed.empireCX,
						ticker_empire: [],
						cx_planets: [
							{
								planet: "B",
								preferences: parsed.planetsCX[0].exchanges,
							},
						],
						ticker_planets: [
							{
								planet: "B",
								preferences:
									parsed.plantesTickerOptions[0].ticker,
							},
						],
					},
				],
			]);
		});

		it("keeps the rules when the replacement is declined", async () => {
			parse.mockResolvedValue(parsed);
			const { wrapper, component } = await mountHeader();

			await chooseFile(wrapper, new File(["x"], "rules.csv"));
			settleConfirm(false);
			await flushPromises();

			expect(component.emitted("import")).toBeUndefined();
		});

		it.each([
			[
				"an Error's message",
				new Error("Missing CSV columns: CX"),
				"Missing CSV columns: CX",
			],
			["a thrown string", "broken", "broken"],
		])("toasts %s when the file can't be read", async (_, err, reason) => {
			parse.mockRejectedValue(err);
			const { wrapper, component } = await mountHeader();

			await chooseFile(wrapper, new File(["x"], "rules.csv"));

			expect(pendingConfirm.value).toBeNull();
			expect(toasts.value.at(-1)).toMatchObject({
				type: "error",
				text: `rules.csv: ${reason}`,
			});
			expect(component.emitted("import")).toBeUndefined();
		});
	});

	describe("menu", () => {
		const openMenu = async (wrapper: VueWrapper) => {
			await wrapper.find("[aria-haspopup=menu]").trigger("click");
			await flushPromises();
		};

		it("lists rename and manage", async () => {
			const { wrapper } = await mountHeader();
			await openMenu(wrapper);

			expect(
				Array.from(body().querySelectorAll("[role=menuitem]")).map(
					(e) => e.textContent?.trim()
				)
			).toEqual(["exchanges.header.rename", "exchanges.header.manage"]);
		});

		it("goes to the preference management", async () => {
			const { wrapper } = await mountHeader();
			await openMenu(wrapper);

			menuItem("exchanges.header.manage").click();
			await flushPromises();

			expect(push).toHaveBeenCalledWith("/manage");
		});

		describe("rename", () => {
			const dialog = () =>
				body().querySelector<HTMLElement>("[role=dialog]")!;
			const input = () =>
				dialog().querySelector<HTMLInputElement>("input")!;
			const apply = () =>
				Array.from(dialog().querySelectorAll("button")).find(
					(b) => b.textContent?.trim() === "exchanges.header.apply"
				)!;
			const type = async (value: string) => {
				input().value = value;
				input().dispatchEvent(new Event("input", { bubbles: true }));
				await flushPromises();
			};

			async function openRename(wrapper: VueWrapper) {
				await openMenu(wrapper);
				menuItem("exchanges.header.rename").click();
				await flushPromises();
			}

			it("prefills the name and emits the trimmed new one", async () => {
				const { wrapper, component } = await mountHeader();
				await openRename(wrapper);
				expect(input().value).toBe("Home");

				await type("  Renamed  ");
				apply().click();
				await flushPromises();

				expect(component.emitted("rename")).toEqual([["Renamed"]]);
				expect(body().querySelector("[role=dialog]")).toBeNull();
			});

			it("refuses a blank name", async () => {
				const { wrapper, component } = await mountHeader();
				await openRename(wrapper);

				await type("   ");

				expect(apply().disabled).toBe(true);
				// submitting the form with Enter is refused as well
				dialog()
					.querySelector("form")!
					.dispatchEvent(new Event("submit", { cancelable: true }));
				await flushPromises();
				expect(component.emitted("rename")).toBeUndefined();
				expect(body().querySelector("[role=dialog]")).not.toBeNull();
			});

			it("closes on cancel without renaming", async () => {
				const { wrapper, component } = await mountHeader();
				await openRename(wrapper);

				Array.from(dialog().querySelectorAll("button"))
					.find(
						(b) => b.textContent?.trim() === "common.buttons.cancel"
					)!
					.click();
				await flushPromises();

				expect(body().querySelector("[role=dialog]")).toBeNull();
				expect(component.emitted("rename")).toBeUndefined();
			});
		});
	});
});
