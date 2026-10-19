import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { effectScope, type EffectScope } from "vue";
import { flushPromises } from "@vue/test-utils";

import { useGameDataLoader } from "@/features/wrapper/useGameDataLoader";

// Types & Interfaces
import type { GameDataLoaderProps } from "@/features/wrapper/gameDataLoader.types";

const execute = vi.fn();
vi.mock("@/lib/query_cache/queryStore", () => ({
	useQueryStore: () => ({ execute }),
}));
vi.mock("vue-i18n", () => ({
	useI18n: () => ({
		t: (key: string, params?: Record<string, string>) =>
			params ? `${key} ${Object.values(params).join("|")}` : key,
	}),
}));

let scope: EffectScope;

function load(props: GameDataLoaderProps) {
	const emits = vi.fn();
	const loader = scope.run(() => useGameDataLoader(props, emits))!;
	return { ...loader, emits };
}

const emitted = (emits: ReturnType<typeof vi.fn>, name: string) =>
	emits.mock.calls.filter(([e]) => e === name).map(([, data]) => data);

describe("useGameDataLoader", () => {
	beforeEach(() => {
		scope = effectScope();
		execute.mockReset();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});
	afterEach(() => scope.stop());

	it("loads only the requested data and completes once", async () => {
		execute.mockImplementation(async (name: string) => [name]);
		const { emits, done, results, loadingSteps } = load({
			loadMaterials: true,
			loadRecipes: true,
		});

		expect(loadingSteps.value.map((s) => s.name)).toStrictEqual([
			"wrapper.gamedata.material_data",
			"wrapper.gamedata.recipe_data",
		]);
		await flushPromises();

		expect(execute.mock.calls.map(([name]) => name)).toStrictEqual([
			"GetMaterials",
			"GetRecipes",
		]);
		expect(emitted(emits, "data:materials")).toStrictEqual([
			["GetMaterials"],
		]);
		expect(emitted(emits, "data:recipes")).toStrictEqual([["GetRecipes"]]);
		expect(emitted(emits, "complete")).toHaveLength(1);
		expect(done.value).toBe(true);
		expect(results.value.recipeData).toStrictEqual(["GetRecipes"]);
		expect(results.value.buildingData).toBeNull();
	});

	it("asks for the requested planets", async () => {
		execute.mockResolvedValue({ planet_natural_id: "OT-580b" });
		const { emits } = load({
			loadPlanet: "OT-580b",
			loadPlanetMultiple: ["OT-580b", "KW-688c"],
		});
		await flushPromises();

		expect(execute).toHaveBeenCalledWith("GetPlanet", {
			planetNaturalId: "OT-580b",
		});
		expect(execute).toHaveBeenCalledWith("GetMultiplePlanets", {
			planetNaturalIds: ["OT-580b", "KW-688c"],
		});
		expect(emitted(emits, "data:planet")).toHaveLength(1);
		expect(emitted(emits, "data:planet:multiple")).toHaveLength(1);
	});

	it("shows a failed step and retries only that one", async () => {
		execute.mockImplementation(async (name: string) => {
			if (name === "GetBuildings") throw "offline";
			return [name];
		});
		const { emits, hasError, loadingSteps, retry, done } = load({
			loadExchanges: true,
			loadBuildings: true,
		});
		await flushPromises();

		expect(hasError.value).toBe(true);
		expect(loadingSteps.value[1].error?.message).toBe("offline");
		expect(emitted(emits, "complete")).toHaveLength(0);

		execute.mockResolvedValue(["GetBuildings"]);
		retry();
		await flushPromises();

		expect(execute).toHaveBeenCalledTimes(3);
		expect(execute.mock.calls[2][0]).toBe("GetBuildings");
		expect(hasError.value).toBe(false);
		expect(emitted(emits, "complete")).toHaveLength(1);
		expect(done.value).toBe(true);
	});

	it("completes right away when nothing is requested", () => {
		const { emits, done } = load({ minimal: true });

		expect(execute).not.toHaveBeenCalled();
		expect(emitted(emits, "complete")).toHaveLength(1);
		expect(done.value).toBe(true);
	});

	it("names the planets in the steps", async () => {
		execute.mockResolvedValue({});
		const { loadingSteps } = load({
			loadPlanet: "OT-580b",
			loadPlanetMultiple: ["OT-580b", "KW-688c"],
		});

		expect(loadingSteps.value.map((s) => s.name)).toStrictEqual([
			"wrapper.gamedata.planet_data OT-580b",
			"wrapper.gamedata.planet_multiple_data OT-580b, KW-688c",
		]);
		await flushPromises();
	});

	it("keeps the error a step failed with", async () => {
		const failure = new Error("server down");
		execute.mockRejectedValue(failure);
		const { loadingSteps, hasError, done } = load({ loadExchanges: true });
		await flushPromises();

		expect(loadingSteps.value[0].error).toBe(failure);
		expect(hasError.value).toBe(true);
		expect(done.value).toBe(false);
		expect(console.error).toHaveBeenCalledWith(failure);
	});

	it("loads buildings and emits them", async () => {
		execute.mockResolvedValue([{ building_ticker: "FP" }]);
		const { emits, results } = load({ loadBuildings: true });
		await flushPromises();

		expect(emitted(emits, "data:buildings")).toStrictEqual([
			[{ building_ticker: "FP" }],
		]);
		expect(emitted(emits, "data:exchanges")).toStrictEqual([]);
		expect(results.value.buildingData).toStrictEqual([
			{ building_ticker: "FP" },
		]);
	});
});
