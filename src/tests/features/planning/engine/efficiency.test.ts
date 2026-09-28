import { describe, expect, it } from "vitest";

import { zeroEfficiencyReason } from "@/features/planning/engine/efficiency";

describe("zeroEfficiencyReason", () => {
	it("returns the first factor that is zero", () => {
		expect(
			zeroEfficiencyReason([
				{ efficiencyType: "HQ", value: 1.1 },
				{ efficiencyType: "FERTILITY", value: 0 },
				{ efficiencyType: "WORKFORCE", value: 0 },
			])
		).toBe("FERTILITY");
	});

	it("returns undefined without a zero factor", () => {
		expect(
			zeroEfficiencyReason([{ efficiencyType: "WORKFORCE", value: 0.5 }])
		).toBeUndefined();
		expect(zeroEfficiencyReason([])).toBeUndefined();
	});
});
