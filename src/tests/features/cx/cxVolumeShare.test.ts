import { describe, it, expect } from "vitest";

import {
	CX_VOLUME_ILLIQUID_7D,
	calculateCXVolumeShare,
	levelOfShare,
	volumeWindow,
	worstLevel,
} from "@/features/cx/cxVolumeShare";

// Types & Interfaces
import { ICXVolumeThresholds } from "@/features/cx/cxVolumeShare.types";

const thresholds: ICXVolumeThresholds = { yellowPercent: 5, redPercent: 15 };

describe("cxVolumeShare", () => {
	describe("volumeWindow", () => {
		it("measures a sale against the windows daily volume", () => {
			// 70 over 7 days = 10 / day, selling 1 / day = 10%
			expect(volumeWindow(1, 70, 7).share).toBeCloseTo(0.1, 8);
		});

		it("carries no share while nothing trades", () => {
			expect(volumeWindow(1, 0, 7).share).toBeUndefined();
		});
	});

	describe("levelOfShare", () => {
		it("colours by the thresholds", () => {
			expect(levelOfShare(0.01, thresholds)).toBe("none");
			expect(levelOfShare(0.05, thresholds)).toBe("yellow");
			expect(levelOfShare(0.15, thresholds)).toBe("red");
			expect(levelOfShare(undefined, thresholds)).toBe("none");
		});
	});

	describe("worstLevel", () => {
		it("never disagrees in the users favour", () => {
			expect(worstLevel("none", "red")).toBe("red");
			expect(worstLevel("yellow", "none")).toBe("yellow");
			expect(worstLevel("none", "none")).toBe("none");
		});
	});

	describe("calculateCXVolumeShare", () => {
		it("colours by the worse of the 7d and 30d window", () => {
			// 7d fine (1%), 30d red (20%): the market just went quiet
			const share = calculateCXVolumeShare(
				"RAT",
				"AI1",
				1,
				{ sumTraded7d: 700, sumTraded30d: 150 },
				thresholds
			);

			expect(share.window7d.share).toBeCloseTo(0.01, 8);
			expect(share.window30d.share).toBeCloseTo(0.2, 8);
			expect(share.level).toBe("red");
		});

		it("flags a barely trading exchange as illiquid", () => {
			const share = calculateCXVolumeShare(
				"RAT",
				"AI1",
				1,
				{ sumTraded7d: CX_VOLUME_ILLIQUID_7D - 1, sumTraded30d: 100 },
				thresholds
			);

			expect(share.illiquid).toBe(true);
			expect(share.level).toBe("red");
		});

		it("never warns about a negligible sale", () => {
			const share = calculateCXVolumeShare(
				"RAT",
				"AI1",
				0.1,
				{ sumTraded7d: 0, sumTraded30d: 0 },
				thresholds
			);

			expect(share.illiquid).toBe(false);
			expect(share.level).toBe("none");
		});

		it("respects custom thresholds", () => {
			// 10% share, strict user reds at 8%
			const share = calculateCXVolumeShare(
				"RAT",
				"AI1",
				1,
				{ sumTraded7d: 70, sumTraded30d: 300 },
				{ yellowPercent: 2, redPercent: 8 }
			);

			expect(share.level).toBe("red");
		});
	});
});
