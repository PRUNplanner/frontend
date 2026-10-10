import { describe, it, expect } from "vitest";

import {
	getVolumeOfAllStorages,
	getWeightOfAllStorages,
	isStorageInfrastructure,
} from "@/features/planning/calculations/infrastructureCalculations";

describe("infrastructureCalculations", () => {
	// STV and STW hold different weight and volume
	const storages = { STO: 2, STA: 0, STE: 1, STV: 3, STW: 1 };

	it("adds weight per storage times amount to the base 1500", () => {
		// 1500 + 2x5000 + 10000 + 3x2500 + 7500
		expect(getWeightOfAllStorages(storages)).toBe(36500);
	});

	it("adds volume per storage times amount to the base 1500", () => {
		// 1500 + 2x5000 + 10000 + 3x7500 + 2500
		expect(getVolumeOfAllStorages(storages)).toBe(46500);
	});

	it("tells storages from other infrastructure", () => {
		expect(isStorageInfrastructure("STV")).toBe(true);
		expect(isStorageInfrastructure("HB1")).toBe(false);
	});
});
