import { describe, expect, it } from "vitest";
import {
	formatDate,
	getDifferenceMinutes,
	timestampFromString,
	humanizeTimeMs,
	relativeFromDate,
	dateStringFromEpoch,
} from "@/util/date";

describe("Util: date", async () => {
	describe("getDifferenceMinutes", async () => {
		it("defined", () => {
			const startDate: Date = new Date(1745834400000);
			const endDate: Date = new Date(1745834100000);

			const minutes: number = getDifferenceMinutes(startDate, endDate);

			expect(minutes).toBe(5);
		});

		it("start undefined", async () => {
			const startDate: Date = new Date(1745834400000);

			const minutes: number = getDifferenceMinutes(startDate, undefined);

			expect(minutes).toBe(0);
		});

		it("end undefined", async () => {
			const endDate: Date = new Date(1745834100000);

			const minutes: number = getDifferenceMinutes(undefined, endDate);

			expect(minutes).toBe(0);
		});
	});

	describe("timestampFromString", async () => {
		it("Return Unix timestamp from Date as String", () => {
			const result: number = timestampFromString(
				"2025-05-02T05:00:00+00:00"
			);

			expect(result).toStrictEqual(1746162000000);
		});
	});

	describe("formatDate", async () => {
		it("Standard YYYY-MM-DD format", () => {
			const testDate: Date = new Date(2025, 0, 1);

			const result: string = formatDate(testDate);

			expect(result).toStrictEqual("2025-01-01");
		});

		it("Custom YYYY-MM format", async () => {
			const testDate: Date = new Date(2025, 0, 1);

			const result: string = formatDate(testDate, "YYYY-MM");

			expect(result).toStrictEqual("2025-01");
		});
	});

	it("humanizeTimeMs", async () => {
		const recipe = humanizeTimeMs(190080000);
		expect(recipe).toStrictEqual("2d 4h 48m");

		const year = humanizeTimeMs(205390080000);
		expect(year).toStrictEqual("6y 6m 4d 16h 48m");

		const month = humanizeTimeMs(27390080000);
		expect(month).toStrictEqual("10m 12d 20h 21m");

		const hour = humanizeTimeMs(27390000);
		expect(hour).toStrictEqual("7h 36m");

		const nan = humanizeTimeMs(NaN);
		expect(nan).toStrictEqual("∞");
	});

	it("relativeFromDate", async () => {
		const rel = relativeFromDate(new Date());
		const und = relativeFromDate(undefined);

		expect(rel).toBe("a few seconds ago");
		expect(und).toBe("—");
	});

	describe("dateStringFromEpoch", () => {
		it("validates standard formatting, custom patterns, and edge cases", () => {
			// 1713780000000 = April 22, 2024
			expect(dateStringFromEpoch(1713780000000)).toBe("2024-04-22");

			// Custom format string
			expect(dateStringFromEpoch(1713780000000, "DD/MM/YYYY")).toBe(
				"22/04/2024"
			);

			// Unix Epoch start
			expect(dateStringFromEpoch(0)).toBe("1970-01-01");

			// Negative epoch (pre-1970)
			// -631152000000 = 1950-01-01
			expect(dateStringFromEpoch(-631152000000, "YYYY")).toBe("1950");
		});
	});
});
