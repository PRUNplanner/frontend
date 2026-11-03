import { describe, expect, it } from "vitest";
import { formatDate, humanizeTimeMs, relativeFromDate } from "@/util/date";

describe("Util: date", async () => {
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
		expect(nan).toStrictEqual("never");
		expect(humanizeTimeMs(Infinity)).toStrictEqual("never");
	});

	it("relativeFromDate", async () => {
		const rel = relativeFromDate(new Date());
		const und = relativeFromDate(undefined);

		expect(rel).toBe("a few seconds ago");
		expect(und).toBe("—");
	});
});
