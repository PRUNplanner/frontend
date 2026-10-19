import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { flushPromises, RouterLinkStub } from "@vue/test-utils";
import { createPinia, type Pinia } from "pinia";
import AxiosMockAdapter from "axios-mock-adapter";

import { apiService } from "@/lib/apiService";
import axiosSetup from "@/util/axiosSetup";
import { trackEvent } from "@/lib/analytics/useAnalytics";
import { exchangesStore, materialsStore } from "@/database/stores";
import { useMaterialData } from "@/database/services/useMaterialData";
import { usePlanningStore } from "@/stores/planningStore";
import PlanCOGM from "@/features/planning/components/tools/PlanCOGM.vue";
import CXFixedPriceTable from "@/features/exchanges/components/CXFixedPriceTable.vue";
import SaveBar from "@/features/save_bar/components/SaveBar.vue";
import SaveConflictDialog from "@/features/save_conflict/components/SaveConflictDialog.vue";
import SaveConflictNotice from "@/features/save_conflict/components/SaveConflictNotice.vue";
import { mountComponent } from "@/tests/mountComponent";

// Types & Interfaces
import type { VueWrapper } from "@vue/test-utils";
import type { CX, CXData } from "@/features/api/schemas/cxData.schemas";
import type { IMaterialCOGM } from "@/features/exchanges/useExchangePlanData.types";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import materials from "@/tests/test_data/api_data_materials.json";

vi.mock("@/lib/analytics/useAnalytics", () => ({ trackEvent: vi.fn() }));

// the linked plans and their COGMs, crafted; without them the real ones
const planData = vi.hoisted(() => ({
	bases: undefined as unknown,
	cogms: undefined as unknown,
}));
vi.mock("@/features/exchanges/useExchangePlanData", async (importActual) => {
	const actual =
		await importActual<
			typeof import("@/features/exchanges/useExchangePlanData")
		>();
	const { computed } = await import("vue");
	return {
		...actual,
		useExchangePlanData: (
			...args: Parameters<typeof actual.useExchangePlanData>
		) => {
			const real = actual.useExchangePlanData(...args);
			return {
				...real,
				bases: computed(() => planData.bases ?? real.bases.value),
				materialCOGMs: computed(
					() => planData.cogms ?? real.materialCOGMs.value
				),
			};
		},
	};
});

const mock = new AxiosMockAdapter(apiService.client);

// CX responses are validated as uuids
const CX_UUID = "00000001-0000-4000-8000-000000000000";
const PLANET = "ZV-307c";
const PUT_URL = new RegExp(`planning/cx/${CX_UUID}/$`);

const pref = (
	ticker: string,
	type: "BUY" | "SELL" | "BOTH",
	value: number
) => ({ ticker, type, value });

function cxData(): CXData {
	return {
		cx_empire: [{ type: "BOTH", exchange: "AI1_30D" }],
		cx_planets: [],
		ticker_empire: [],
		ticker_planets: [
			{ planet: "OT-580b", preferences: [pref("DW", "SELL", 80)] },
			{ planet: PLANET, preferences: [pref("H2O", "BUY", 30)] },
		],
	};
}

const COGM = {
	runtime: 43200000,
	runtimeShare: 0.5,
	efficiency: 1.25,
	degradation: 100,
	degradationShare: 50,
	workforceCost: 200,
	workforceCostTotal: 400,
	inputCost: [
		{ ticker: "GRN", amount: 1, costUnit: 470, costTotal: 470 },
		{ ticker: "H2O", amount: 1, costUnit: 30, costTotal: 30 },
	],
	inputTotal: 500,
	outputCOGM: [
		{ ticker: "RAT", amount: 10, costSplit: 64.432, costTotal: 64.432 },
	],
	totalCost: 644.32,
	outputRevenue: 1700,
	totalProfit: 1055.68,
};

const empire = (
	uuid: string,
	name: string,
	planets: string[] = []
): CX["empires"][number] => ({
	uuid,
	empire_name: name,
	plans: planets.map((planet, i) => ({
		uuid: `00000003-0000-4000-8000-00000000000${i}`,
		plan_name: `Plan ${planet}`,
		planet_natural_id: planet,
	})),
});
const SKY = empire("00000002-0000-4000-8000-000000000000", "Sky Productions");

function seedCX(pinia: Pinia, data: CXData, empires = [SKY]) {
	usePlanningStore(pinia).setCXs([
		{
			uuid: CX_UUID,
			cx_name: "Home NC1",
			cx_data: data,
			empires,
			modified_at: "v1",
		},
	]);
}

async function mountCOGM(
	props: Record<string, unknown> = { cxUuid: CX_UUID, planetId: PLANET },
	data = cxData(),
	options: {
		empires?: CX["empires"];
		messages?: Record<string, unknown>;
	} = {}
) {
	const pinia = createPinia();
	seedCX(pinia, data, options.empires);
	const mounted = await mountComponent(
		PlanCOGM,
		{ cogmData: COGM, ...props },
		{ pinia, messages: options.messages }
	);
	return { ...mounted, pinia };
}

const find = (wrapper: VueWrapper, selector: string) => wrapper.find(selector);

async function click(wrapper: VueWrapper, selector: string) {
	await find(wrapper, selector).trigger("click");
	await flushPromises();
}

async function clickText(wrapper: VueWrapper, text: string) {
	const button = wrapper.findAll("button").find((b) => b.text() === text);
	expect(button).toBeDefined();
	await button!.trigger("click");
	await flushPromises();
}

const putPayload = () => JSON.parse(mock.history.put.at(-1)!.data);

describe("PlanCOGM", () => {
	beforeAll(async () => {
		axiosSetup();
		// @ts-expect-error mock data
		await exchangesStore.setMany(exchanges);
		await materialsStore.setMany(materials);
		await useMaterialData().preload();
	});

	beforeEach(() => {
		vi.mocked(trackEvent).mockClear();
		planData.bases = planData.cogms = undefined;
		mock.reset();
		// the backend answers with the saved CX
		mock.onPut(PUT_URL).reply((config) => [
			200,
			{
				uuid: CX_UUID,
				empires: [],
				...JSON.parse(config.data),
				modified_at: "v2",
			},
		]);
	});

	it("opens without a preference, priced from Universe, with a note", async () => {
		const { wrapper } = await mountCOGM({ planetId: PLANET });

		// runtime share 0.5 -> 50 % of the day, efficiency 125 %
		expect(wrapper.text()).toContain("50.00");
		expect(wrapper.text()).toContain("125.00 %");
		const note = find(wrapper, "[data-no-preference]");
		expect(note.text()).toContain("plan.tools.cogm.no_preference");
		expect(note.findComponent(RouterLinkStub).props("to")).toBe("/manage");
		expect(find(wrapper, "[data-prices]").exists()).toBe(false);

		// sources shown, but no rule to open
		const sources = wrapper.findAll("[data-source]");
		expect(sources).toHaveLength(2);
		expect(sources[0].element.tagName).toBe("SPAN");
		expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(1);
	});

	it("shows only the table in the ROI overview, without a planet", async () => {
		const { wrapper } = await mountCOGM({});

		expect(wrapper.text()).toContain("plan.tools.cogm.info");
		expect(find(wrapper, "[data-no-preference]").exists()).toBe(false);
		expect(find(wrapper, "[data-prices]").exists()).toBe(false);
		expect(wrapper.findAll("[data-source]")).toHaveLength(0);
	});

	it("names the preference and links each input to its rule", async () => {
		const { wrapper } = await mountCOGM();

		expect(wrapper.text()).toContain("plan.tools.cogm.prices_from_empire");
		const links = wrapper
			.findAllComponents(RouterLinkStub)
			.map((l) => l.props("to"));
		// GRN from the all-planets exchange rule, H2O fixed on the planet
		expect(links).toContain(`/exchanges/${CX_UUID}?scope=all`);
		expect(links).toContain(`/exchanges/${CX_UUID}?scope=${PLANET}`);
		expect(wrapper.find("[data-open-exchanges]").exists()).toBe(true);
		// the market price waits on the game data queries, which read
		// IndexedDB first (flushPromises doesn't wait for it)
		await vi.waitFor(() =>
			expect(find(wrapper, "[data-market=RAT]").exists()).toBe(true)
		);
		expect(find(wrapper, "[data-buy-all]").text()).toBe(
			"plan.tools.cogm.prices.not_fixed"
		);
	});

	it("uses the COGM as the all-planets buy price and saves it", async () => {
		const { wrapper, pinia } = await mountCOGM();
		expect(wrapper.findComponent(SaveBar).exists()).toBe(false);

		await click(wrapper, "[data-use-cogm]");

		expect(trackEvent).toHaveBeenCalledWith("exchange:use_cogm", {
			location: "cogm",
			material_ticker: "RAT",
		});
		expect(find(wrapper, "[data-buy-all]").text()).toBe("64.43 ȼ");
		expect(find(wrapper, "[data-matches]").exists()).toBe(true);
		const bar = wrapper.findComponent(SaveBar);
		expect(bar.props("count")).toBe(1);

		bar.vm.$emit("save");
		await flushPromises();

		expect(mock.history.put).toHaveLength(1);
		const payload = putPayload();
		expect(payload.cx_name).toBe("Home NC1");
		expect(payload.cx_data).toEqual({
			...cxData(),
			ticker_empire: [pref("RAT", "BUY", 64.43)],
		});
		expect(trackEvent).toHaveBeenCalledWith("exchange:update", {
			cx_uuid: CX_UUID,
			location: "cogm",
		});
		expect(
			usePlanningStore(pinia).getCX(CX_UUID).cx_data.ticker_empire
		).toEqual([pref("RAT", "BUY", 64.43)]);
		expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
	});

	it("offers to update a fixed buy price that drifted from the COGM", async () => {
		const data = cxData();
		data.ticker_empire = [pref("RAT", "BOTH", 75)];
		const { wrapper } = await mountCOGM(undefined, data);

		expect(find(wrapper, "[data-use-cogm]").exists()).toBe(false);
		expect(find(wrapper, "[data-drift]").text()).toContain(
			"plan.tools.cogm.prices.drift"
		);

		await click(wrapper, "[data-update-cogm]");

		expect(find(wrapper, "[data-drift]").exists()).toBe(false);
		expect(find(wrapper, "[data-matches]").exists()).toBe(true);
		wrapper.findComponent(SaveBar).vm.$emit("save");
		await flushPromises();

		// the sell side keeps its price
		expect(putPayload().cx_data.ticker_empire).toEqual([
			pref("RAT", "BUY", 64.43),
			pref("RAT", "SELL", 75),
		]);
	});

	it("shows a buy price within 2 % of the COGM as matching", async () => {
		const data = cxData();
		data.ticker_empire = [pref("RAT", "BUY", 65)];
		const { wrapper } = await mountCOGM(undefined, data);

		expect(find(wrapper, "[data-drift]").exists()).toBe(false);
		expect(find(wrapper, "[data-matches]").exists()).toBe(true);
	});

	it("edits this planet's fixed prices on the planet scope", async () => {
		const { wrapper } = await mountCOGM();
		const table = () => wrapper.findComponent(CXFixedPriceTable);

		expect(table().props("prices")).toEqual([]);
		expect(table().props("cogms")).toBeInstanceOf(Map);

		await click(wrapper, "[data-scope-planet]");

		expect(table().props("prices")).toEqual([pref("H2O", "BUY", 30)]);
		expect(table().props("cogms")).toBeUndefined();
		table().vm.$emit("update:prices", [
			pref("H2O", "BUY", 30),
			pref("GRN", "BUY", 400),
		]);
		await flushPromises();

		const bar = wrapper.findComponent(SaveBar);
		expect(bar.props("count")).toBe(1);
		bar.vm.$emit("save");
		await flushPromises();

		expect(putPayload().cx_data.ticker_planets).toEqual([
			{ planet: "OT-580b", preferences: [pref("DW", "SELL", 80)] },
			{
				planet: PLANET,
				preferences: [pref("H2O", "BUY", 30), pref("GRN", "BUY", 400)],
			},
		]);
	});

	it("discards unsaved edits", async () => {
		const { wrapper } = await mountCOGM();

		await click(wrapper, "[data-use-cogm]");
		wrapper.findComponent(SaveBar).vm.$emit("discard");
		await flushPromises();

		expect(trackEvent).toHaveBeenCalledWith("exchange:discard", {
			location: "cogm",
		});
		expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
		expect(find(wrapper, "[data-buy-all]").text()).toBe(
			"plan.tools.cogm.prices.not_fixed"
		);
		expect(mock.history.put).toHaveLength(0);
	});

	it("keeps the edits and shows the error when saving fails", async () => {
		mock.resetHandlers();
		mock.onPut(PUT_URL).reply(500);
		const { wrapper } = await mountCOGM();

		await click(wrapper, "[data-use-cogm]");
		wrapper.findComponent(SaveBar).vm.$emit("save");
		await flushPromises();

		expect(mock.history.put).toHaveLength(1);
		expect(wrapper.findComponent(SaveBar).props("state")).toBe("error");
		expect(find(wrapper, "[data-buy-all]").text()).toBe("64.43 ȼ");
	});

	it("reloads a CX saved in another tab without unsaved edits", async () => {
		const { wrapper, pinia } = await mountCOGM();

		const data = cxData();
		data.ticker_empire = [pref("RAT", "BUY", 64.43)];
		usePlanningStore(pinia).setCXs([
			{
				uuid: CX_UUID,
				cx_name: "Home NC1",
				cx_data: data,
				empires: [],
				modified_at: "v2",
			},
		]);
		await flushPromises();

		expect(find(wrapper, "[data-buy-all]").text()).toBe("64.43 ȼ");
		await clickText(wrapper, "plan.tools.cogm.prices.all_planets");
		expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
	});

	describe("empire, linked plans and COGMs", () => {
		it("names the CX's empire with a plan on this planet", async () => {
			const { wrapper } = await mountCOGM(undefined, undefined, {
				empires: [
					empire(
						"00000002-0000-4000-8000-000000000001",
						"Elsewhere",
						["OT-580b"]
					),
					empire("00000002-0000-4000-8000-000000000002", "Here Inc", [
						"OT-580b",
						PLANET,
					]),
				],
				messages: {
					plan: {
						tools: {
							cogm: {
								prices_from_empire: "{preference} of {empire}",
								prices_from: "{preference} only",
							},
						},
					},
				},
			});

			expect(wrapper.text()).toContain("Home NC1 of Here Inc");
		});

		it("names no empire when several of the CX have no plan here", async () => {
			const { wrapper } = await mountCOGM(undefined, undefined, {
				empires: [
					empire("00000002-0000-4000-8000-000000000001", "One", [
						"OT-580b",
					]),
					empire("00000002-0000-4000-8000-000000000002", "Two"),
				],
				messages: {
					plan: {
						tools: {
							cogm: {
								prices_from_empire: "{preference} of {empire}",
								prices_from: "{preference} only",
							},
						},
					},
				},
			});

			expect(wrapper.text()).toContain("Home NC1 only");
			expect(wrapper.text()).not.toContain("of One");
		});

		it("names the linked plans that buy an output, once each", async () => {
			const base = (
				planName: string,
				...materials: [string, number][]
			) => ({
				planName,
				materials: materials.map(([ticker, delta]) => ({
					ticker,
					delta,
				})),
			});
			planData.bases = [
				base("Alpha", ["RAT", -4]),
				base("Alpha", ["RAT", -1]),
				base("Beta", ["RAT", -2], ["FE", 5]),
				// sells RAT, buys something else
				base("Gamma", ["RAT", 3], ["FE", -1]),
			];
			const { wrapper } = await mountCOGM(undefined, undefined, {
				messages: {
					plan: {
						tools: {
							cogm: {
								prices: { buyers: "{plans} buy {ticker}" },
							},
						},
					},
				},
			});

			expect(find(wrapper, "[data-output=RAT]").text()).toContain(
				"Alpha, Beta buy RAT"
			);
		});

		it("says nothing about buyers without linked plans", async () => {
			const { wrapper } = await mountCOGM(undefined, undefined, {
				messages: {
					plan: {
						tools: {
							cogm: { prices: { buyers: "{plans} bought" } },
						},
					},
				},
			});

			expect(find(wrapper, "[data-output=RAT]").text()).not.toContain(
				"bought"
			);
		});

		it("keeps the linked plans' COGM of an output", async () => {
			const linked: IMaterialCOGM = {
				ticker: "RAT",
				value: 70,
				entries: [
					{
						planUuid: "p1",
						planName: "Alpha",
						planet: "OT-580b",
						value: 70,
					},
				],
			};
			planData.cogms = new Map([["RAT", linked]]);
			const { wrapper } = await mountCOGM();

			const cogms = wrapper
				.findComponent(CXFixedPriceTable)
				.props("cogms") as Map<string, IMaterialCOGM>;
			expect(cogms.get("RAT")).toEqual(linked);
			expect(cogms.size).toBe(1);
		});

		it("falls back to this recipe's COGM for an output no plan has", async () => {
			planData.cogms = new Map();
			const { wrapper } = await mountCOGM();

			const cogms = wrapper
				.findComponent(CXFixedPriceTable)
				.props("cogms") as Map<string, IMaterialCOGM>;
			expect(cogms.get("RAT")).toEqual({
				ticker: "RAT",
				value: 64.432,
				entries: [
					{
						planUuid: "",
						planName: "plan.tools.cogm.prices.this_plan",
						planet: PLANET,
						value: 64.432,
					},
				],
			});
		});
	});

	describe("fixed prices", () => {
		it("edits the all-planets prices", async () => {
			const { wrapper } = await mountCOGM();

			wrapper
				.findComponent(CXFixedPriceTable)
				.vm.$emit("update:prices", [pref("GRN", "BUY", 400)]);
			await flushPromises();

			expect(wrapper.findComponent(SaveBar).props("count")).toBe(1);
			wrapper.findComponent(SaveBar).vm.$emit("save");
			await flushPromises();
			expect(putPayload().cx_data.ticker_empire).toEqual([
				pref("GRN", "BUY", 400),
			]);
		});

		it("starts an empty list for a planet without fixed prices", async () => {
			const data = cxData();
			data.ticker_planets = [];
			const { wrapper } = await mountCOGM(undefined, data);

			await click(wrapper, "[data-scope-planet]");
			const table = () => wrapper.findComponent(CXFixedPriceTable);
			expect(table().props("prices")).toEqual([]);

			table().vm.$emit("update:prices", [pref("H2O", "BUY", 25)]);
			await flushPromises();
			wrapper.findComponent(SaveBar).vm.$emit("save");
			await flushPromises();

			expect(putPayload().cx_data.ticker_planets).toEqual([
				{ planet: PLANET, preferences: [pref("H2O", "BUY", 25)] },
			]);
		});
	});

	describe("saving", () => {
		const edited = async () => {
			const mounted = await mountCOGM();
			await click(mounted.wrapper, "[data-use-cogm]");
			return mounted;
		};
		const notice = (w: VueWrapper) =>
			w.findComponent(SaveConflictNotice).props("notice");

		it("keeps the edits and says so when the CX was deleted meanwhile", async () => {
			mock.resetHandlers();
			mock.onPut(PUT_URL).reply(404);
			const { wrapper } = await edited();

			wrapper.findComponent(SaveBar).vm.$emit("save");
			await flushPromises();

			expect(notice(wrapper)).toBe("deleted");
			expect(wrapper.findComponent(SaveBar).props("state")).toBe("idle");
			expect(wrapper.findComponent(SaveBar).props("count")).toBe(1);
		});

		describe("when it was saved in another tab meanwhile", () => {
			beforeEach(() => {
				mock.resetHandlers();
				mock.onPut(PUT_URL).replyOnce(409, { code: "conflict" });
				mock.onPut(PUT_URL).reply((config) => [
					200,
					{
						uuid: CX_UUID,
						empires: [],
						...JSON.parse(config.data),
						modified_at: "v3",
					},
				]);
				// the dialog's look at the saved version
				mock.onGet().reply(500);
				vi.spyOn(console, "error").mockImplementation(() => {});
			});

			const dialog = async (wrapper: VueWrapper) => {
				await vi.waitFor(() =>
					expect(
						wrapper.findComponent(SaveConflictDialog).exists()
					).toBe(true)
				);
				return wrapper.findComponent(SaveConflictDialog);
			};

			it("keeps the edits when the dialog is closed", async () => {
				const { wrapper } = await edited();
				wrapper.findComponent(SaveBar).vm.$emit("save");

				const conflict = (await dialog(wrapper)).props("conflict");
				conflict.choose(null);
				await flushPromises();

				expect(trackEvent).toHaveBeenCalledWith(
					"exchange:save_conflict",
					{
						location: "cogm",
						choice: "close",
					}
				);
				expect(mock.history.put).toHaveLength(1);
				expect(wrapper.findComponent(SaveBar).props("count")).toBe(1);
				expect(find(wrapper, "[data-buy-all]").text()).toBe("64.43 ȼ");
			});

			it("saves over the other version on overwrite", async () => {
				const { wrapper } = await edited();
				wrapper.findComponent(SaveBar).vm.$emit("save");

				const conflict = (await dialog(wrapper)).props("conflict");
				conflict.choose("overwrite");
				await flushPromises();

				expect(mock.history.put).toHaveLength(2);
				expect(
					JSON.parse(mock.history.put[1].data).base_modified_at
				).toBe(undefined);
				expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
			});
		});
	});

	describe("when the CX changes in another tab", () => {
		const stored = (pinia: Pinia, over: Partial<CX> | null) =>
			usePlanningStore(pinia).setCXs(
				over === null
					? []
					: [
							{
								uuid: CX_UUID,
								cx_name: "Home NC1",
								cx_data: cxData(),
								empires: [],
								modified_at: "v2",
								...over,
							},
						]
			);
		const notice = (w: VueWrapper) =>
			w.findComponent(SaveConflictNotice).props("notice");

		it("offers to reload when there are unsaved edits", async () => {
			const { wrapper, pinia } = await mountCOGM();
			await click(wrapper, "[data-use-cogm]");

			const data = cxData();
			data.ticker_empire = [pref("RAT", "BUY", 99)];
			stored(pinia, { cx_data: data });
			await flushPromises();

			expect(notice(wrapper)).toBe("saved");
			// the edits stay
			expect(find(wrapper, "[data-buy-all]").text()).toBe("64.43 ȼ");

			wrapper.findComponent(SaveConflictNotice).vm.$emit("reload");
			await flushPromises();

			expect(notice(wrapper)).toBe(null);
			expect(find(wrapper, "[data-buy-all]").text()).toBe("99.00 ȼ");
			expect(wrapper.findComponent(SaveBar).exists()).toBe(false);
		});

		it("ignores the CX stored again as the same version", async () => {
			const { wrapper, pinia } = await mountCOGM();
			await click(wrapper, "[data-use-cogm]");

			stored(pinia, { modified_at: "v1" });
			await flushPromises();

			expect(notice(wrapper)).toBe(null);
			expect(trackEvent).not.toHaveBeenCalledWith(
				"app:remote_change",
				expect.anything()
			);
			expect(find(wrapper, "[data-buy-all]").text()).toBe("64.43 ȼ");
		});

		it("says so when it was deleted", async () => {
			const { wrapper, pinia } = await mountCOGM();

			stored(pinia, null);
			await flushPromises();

			expect(notice(wrapper)).toBe("deleted");
			expect(trackEvent).toHaveBeenCalledWith("app:remote_change", {
				object_type: "cx",
				has_unsaved_edits: false,
				is_deleted: true,
			});
		});
	});
});
