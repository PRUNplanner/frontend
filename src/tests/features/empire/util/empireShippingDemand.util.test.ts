import { describe, it, expect } from "vitest";

import { calculateEmpireShippingDemand } from "@/features/empire/util/empireShippingDemand.util";

// Types & Interfaces
import type {
	IMaterialIO,
	IPlanResult,
} from "@/features/planning/usePlanCalculation.types";

const io = (delta: number, totalWeight: number, totalVolume: number) =>
	({ delta, totalWeight, totalVolume }) as IMaterialIO;

const plan = (
	materialio: IMaterialIO[]
): Pick<IPlanResult, "materialio" | "storage"> => ({
	materialio,
	storage: {} as IPlanResult["storage"],
});

describe("calculateEmpireShippingDemand", () => {
	it("sums each plan's max(import, export) and the import/export totals", () => {
		const result = calculateEmpireShippingDemand([
			// import 10 t / 4 m³, export 6 t / 8 m³
			plan([io(-2, -10, -4), io(3, 6, 8)]),
			// import 1 t / 2 m³, export 5 t / 1 m³
			plan([io(-1, -1, -2), io(1, 5, 1)]),
		]);

		expect(result).toStrictEqual({
			dailyWeightImport: 11,
			dailyWeightExport: 11,
			dailyVolumeImport: 6,
			dailyVolumeExport: 9,
			// per plan, not max of the sums: 10 + 5 and 8 + 2
			dailyWeight: 15,
			dailyVolume: 10,
		});
	});

	it("is all zero for an empty empire", () => {
		expect(calculateEmpireShippingDemand([])).toStrictEqual({
			dailyWeightImport: 0,
			dailyWeightExport: 0,
			dailyVolumeImport: 0,
			dailyVolumeExport: 0,
			dailyWeight: 0,
			dailyVolume: 0,
		});
	});

	it("uses the imports of a plan that only imports", () => {
		const result = calculateEmpireShippingDemand([plan([io(-1, -3, -7)])]);

		expect(result.dailyWeightExport).toBe(0);
		expect(result.dailyWeight).toBe(3);
		expect(result.dailyVolume).toBe(7);
	});

	it("is zero, never NaN, for plans without material I/O", () => {
		const result = calculateEmpireShippingDemand([plan([]), plan([])]);

		expect(Object.values(result).every((v) => v === 0)).toBe(true);
	});
});
