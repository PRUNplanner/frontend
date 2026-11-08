import { describe, it, expect } from "vitest";

import {
	materialIOCsv,
	materialIOTotals,
} from "@/features/planning/planView.util";
import { io } from "@/tests/features/planning/usePlanCalculation.fixtures";

describe("materialIOTotals", () => {
	it("splits exports and imports by the delta's sign", () => {
		expect(
			materialIOTotals([
				io("RAT", 10, { price: 500 }),
				io("H2O", -20, { price: -80 }),
				io("DW", 0),
			])
		).toStrictEqual({ exports: 500, imports: -80 });
	});
});

describe("materialIOCsv", () => {
	it("writes a header and one line per material", () => {
		const rat = io("RAT", 10, {
			price: 500,
			totalWeight: 10,
			totalVolume: 5,
		});
		expect(materialIOCsv([rat])).toBe(
			"ticker,input,output,delta,value,weight,volume\nRAT,0,10,10,500,10,5"
		);
		expect(materialIOCsv([rat, io("DW", -2.5, { price: -12.75 })]))
			.toMatchInlineSnapshot(`
			"ticker,input,output,delta,value,weight,volume
			RAT,0,10,10,500,10,5
			DW,2.5,0,-2.5,-12.75,0,0"
		`);
	});
});
