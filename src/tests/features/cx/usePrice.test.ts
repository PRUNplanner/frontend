import { describe, it, expect, beforeAll } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePlanningStore } from "@/stores/planningStore";
import { usePrice } from "@/features/cx/usePrice";
import { Ref, ref } from "vue";
import { buildingsStore } from "@/database/stores";
import { exchangesStore } from "@/database/stores";
import { useBuildingData } from "@/database/services/useBuildingData";

// test data
import exchanges from "@/tests/test_data/api_data_exchanges.json";
import cx_definition from "@/tests/test_data/api_data_cx_definition.json";
import buildings from "@/tests/test_data/api_data_buildings.json";
import planet_single from "@/tests/test_data/api_data_planet_etherwind.json";
import { flushPromises } from "@vue/test-utils";

const fakeCXUuid: string = "2a83a2ca-db0c-49d2-9c43-0db08c1675bb";

describe("usePrice", async () => {
	let planningStore: any;

	beforeAll(async () => {
		setActivePinia(createPinia());
		planningStore = usePlanningStore();

		planningStore.cxs[fakeCXUuid] = cx_definition;

		// @ts-expect-error date
		await exchangesStore.setMany(exchanges);
		//@ts-expect-error mock data
		await buildingsStore.setMany(buildings);
		const { preloadBuildings } = await useBuildingData();

		await preloadBuildings();
		await flushPromises();
	});

	it("cache clearing, just trigger", async () => {
		const cx: Ref<string | undefined> = ref(undefined);
		usePrice(cx, ref(undefined));
		cx.value = "foo";
	});

	describe("calculateInfrastructureCosts", async () => {
		it("should calculate infrastructure costs using mocked getMaterialIOTotalPrice", async () => {
			const mockPlanet = planet_single;

			const { calculateInfrastructureCosts } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			// @ts-expect-error mock planet data
			const result = await calculateInfrastructureCosts(mockPlanet);

			// Each building ticker should have a cost of -100
			Object.keys(result).forEach((r) => {
				expect(result[r]).toBeGreaterThan(0);
			});
		});
	});

	describe("getPrice", async () => {
		it("unknown cx uuid", async () => {
			const { getPrice } = await usePrice(ref("meow"), ref("foo"));

			expect(await getPrice("LSE", "BUY")).toBe(0);
		});

		it("with cx uuid and planet material and ticker preference", async () => {
			const { getPrice } = await usePrice(
				ref(fakeCXUuid),
				ref("OT-580c")
			);

			expect(await getPrice("LSE", "BUY")).toBe(10829.888422315536);
			expect(await getPrice("FEO", "BUY")).toBe(146.47124767786104);
		});

		it("with cx uuid and planet exchange pref", async () => {
			const { getPrice } = await usePrice(
				ref(fakeCXUuid),
				ref("UV-796b")
			);

			expect(await getPrice("LSE", "BUY")).toBe(10829.888422315536);
			expect(await getPrice("FEO", "BUY")).toBe(146.47124767786104);
		});

		it("with cx uuid and empire exchange pref", async () => {
			const { getPrice } = await usePrice(ref(fakeCXUuid), ref("foo"));

			expect(await getPrice("LSE", "BUY")).toBe(10829.888422315536);
		});

		it("nothing set on empire", async () => {
			planningStore.cxs[fakeCXUuid].cx_data.cx_empire = [];
			const { getPrice } = await usePrice(ref(fakeCXUuid), ref("foo"));

			expect(await getPrice("LSE", "BUY")).toBe(10829.888422315536);
		});
	});

	describe("getMaterialIOTotalPrice", async () => {
		it("undefined empire uuid", async () => {
			const { getMaterialIOTotalPrice } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			const result = await getMaterialIOTotalPrice(
				[
					{ ticker: "C", input: 1, output: 0 },
					{ ticker: "N", input: 1, output: 3 },
				],
				"BUY"
			);

			expect(result).toBe(-628.8656643217855);
		});
	});

	describe("enhanceMaterialIOMaterial", async () => {
		it("undefined empire uuid", async () => {
			const { enhanceMaterialIOMaterial } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			const result = await enhanceMaterialIOMaterial([
				// @ts-expect-error mock data
				{ ticker: "C", delta: -1 },
				// @ts-expect-error mock data
				{ ticker: "N", delta: 2 },
			]);

			expect(result[0].price).toBe(-959.9907349774703);
			expect(result[1].price).toBe(331.12507065568474);
		});
	});

	describe("getExchangeCodeKey", async () => {
		it("Too many splits", async () => {
			const { getExchangeCodeKey } = await usePrice(
				ref(undefined),
				ref(undefined)
			);
			//@ts-expect-error fake data
			expect(() => getExchangeCodeKey("FOO_MOO_MEOW")).toThrowError();
		});

		it("UNIVERSE", async () => {
			const { getExchangeCodeKey } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			const result = getExchangeCodeKey("UNIVERSE_30D");

			expect(result.exchangeCode).toBe("UNIVERSE");
			expect(result.key).toBe("vwap_30d");
		});

		it("PP7Ds", async () => {
			const { getExchangeCodeKey } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			const result = getExchangeCodeKey("AI1_7D");

			expect(result.exchangeCode).toBe("AI1");
			expect(result.key).toBe("vwap_7d");
		});

		it("PP30Ds", async () => {
			const { getExchangeCodeKey } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			const result = getExchangeCodeKey("NC1_30D");

			expect(result.exchangeCode).toBe("NC1");
			expect(result.key).toBe("vwap_30d");
		});

		it("CX BUY", async () => {
			const { getExchangeCodeKey } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			//@ts-expect-error fake data
			const result = getExchangeCodeKey("AI1_BUY");

			expect(result.exchangeCode).toBe("AI1");
			expect(result.key).toBe("vwap_30d");
		});

		it("CX SELL", async () => {
			const { getExchangeCodeKey } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			const result = getExchangeCodeKey("AI1_30D");

			expect(result.exchangeCode).toBe("AI1");
			expect(result.key).toBe("vwap_30d");
		});

		it("Invalid two part", async () => {
			const { getExchangeCodeKey } = await usePrice(
				ref(undefined),
				ref(undefined)
			);

			//@ts-expect-error fake data
			const result = getExchangeCodeKey("FOO_MOO");

			expect(result.exchangeCode).toBe("FOO");
			expect(result.key).toBe("vwap_30d");
		});
	});
});
