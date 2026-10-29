import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { memoryStorage } from "@/tests/memoryStorage";
import {
	defaultBaseROISettings,
	useBaseROISettings,
} from "@/features/base_roi/useBaseROISettings";

const KEY = "prunplanner_base_roi";

describe("useBaseROISettings (criteria 2, 14)", () => {
	let storage: Storage;
	beforeEach(() => {
		storage = memoryStorage();
		vi.stubGlobal("localStorage", storage);
	});
	afterEach(() => vi.unstubAllGlobals());

	it("starts with Knottly's defaults and the LCB, nothing stored", () => {
		const { settings, hasStored } = useBaseROISettings();
		expect(hasStored.value).toBe(false);
		expect(settings.value).toMatchObject({
			cogc: "matching",
			experts: "ramp",
			bufferDays: 9,
			minMarketCapacity: 0.7,
			logistics: "ship",
			ship: "LCB",
			visitDays: 3,
			manualWeight: 600,
			manualVolume: 200,
			targetPermit: 0,
			roundTripHours: 0,
			maxJumps: 7,
			showResources: true,
			showRecipes: true,
			showNegative: false,
			expertise: "",
			building: "",
			hiddenColumns: [],
		});
	});

	it("persists changes, hidden columns included, across a reload", async () => {
		const first = useBaseROISettings();
		first.settings.value = {
			...first.settings.value,
			bufferDays: 14,
			hiddenColumns: ["cargo", "workforce"],
		};
		await nextTick();

		const reloaded = useBaseROISettings();
		expect(reloaded.hasStored.value).toBe(true);
		expect(reloaded.settings.value.bufferDays).toBe(14);
		expect(reloaded.settings.value.hiddenColumns).toEqual([
			"cargo",
			"workforce",
		]);
	});

	it("a corrupt value falls back to its default, the rest stays", () => {
		storage.setItem(
			KEY,
			JSON.stringify({ bufferDays: 13, ship: "XXX", maxJumps: 4 })
		);
		const { settings } = useBaseROISettings();
		expect(settings.value.bufferDays).toBe(9);
		expect(settings.value.ship).toBe("LCB");
		expect(settings.value.maxJumps).toBe(4);
	});

	it("unreadable storage gives the defaults", () => {
		storage.setItem(KEY, "{not json");
		expect(useBaseROISettings().settings.value).toEqual(
			defaultBaseROISettings()
		);
		storage.setItem(KEY, "[1, 2]");
		expect(useBaseROISettings().settings.value).toEqual(
			defaultBaseROISettings()
		);
	});
});
