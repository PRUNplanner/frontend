import { describe, it, expect } from "vitest";

import {
	decodeCheck,
	DEFAULT_MIN,
	DEFAULT_PAYBACK,
	encodeCheck,
} from "@/features/production_chain/useChainCheck";

describe("check link", () => {
	it("restores empire, chains, threshold, payback, setup and picks (AC 10, 17)", () => {
		const state = {
			empire: "uuid-1",
			targets: ["DW", "RAT"],
			min: 500,
			setup: false,
			payback: 60,
			picks: { "G:FRM:GRN": "VH-331a", "B:RIG:H2O": "PB-132c" },
		};
		const query = encodeCheck(state);
		expect(query).toEqual({
			mode: "check",
			empire: "uuid-1",
			t: "DW,RAT",
			min: "500",
			setup: "0",
			pay: "60",
			loc: "G:FRM:GRN:VH-331a,B:RIG:H2O:PB-132c",
		});
		expect(decodeCheck(query)).toEqual(state);
	});

	it("leaves the defaults out and falls back on broken values", () => {
		expect(
			encodeCheck({
				empire: undefined,
				targets: [],
				min: DEFAULT_MIN,
				setup: true,
				payback: DEFAULT_PAYBACK,
				picks: {},
			})
		).toEqual({ mode: "check" });
		expect(
			decodeCheck({
				mode: "check",
				t: "DW,dw,TOOLONG,DW,,RAT",
				min: "-5",
				pay: "soon",
				setup: "1",
				loc: "G:FRM:GRN,::x:y,A:B:C:D,broken",
			})
		).toEqual({
			empire: undefined,
			targets: ["DW", "RAT"],
			min: DEFAULT_MIN,
			setup: true,
			payback: DEFAULT_PAYBACK,
			picks: { "A:B:C": "D" },
		});
		expect(decodeCheck({ t: ["OVE", "DW"], min: "0" })).toMatchObject({
			targets: ["OVE"],
			min: 0,
		});
	});
});
