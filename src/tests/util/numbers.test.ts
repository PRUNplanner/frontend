import { describe, expect, it } from "vitest";
import numbro from "numbro";
import {
	formatNumber,
	formatSmallNumber,
	formatAmount,
	formatPayback,
	formatPercent,
	signed,
	clamp,
	boundaryDescriptor,
} from "@/util/numbers";

describe("Util: text", () => {
	describe("formatNumber", () => {
		it("default config", () => {
			const result = formatNumber(5);
			expect(result).toStrictEqual("5.00");
		});

		it("infinity", () => {
			const result = formatNumber(Infinity);
			expect(result).toStrictEqual("—");
		});

		it("special format", () => {
			const result = formatNumber(123.52115, 4);
			expect(result).toStrictEqual("123.5212");
		});

		it("optional decimals", () => {
			const result = formatNumber(123.5, 4, true);
			expect(result).toStrictEqual("123.5000");
		});

		it("NaN", () => {
			const result = formatNumber(NaN);
			expect(result).toStrictEqual("—");
		});

		it("negative infinity", () => {
			expect(formatNumber(-Infinity)).toStrictEqual("—");
		});

		it("matches numbro exactly", () => {
			const values = [
				0,
				-0,
				Number.MAX_SAFE_INTEGER,
				-Number.MAX_SAFE_INTEGER,
				...[
					0.5, 1.5, 2.5, 1.005, 2.675, 999.995, 123456789.125, 1e-7,
					1e21, 0.004, 0.005, 1.45, 1.55, 0.1 + 0.2,
				].flatMap((v) => [v, -v]),
			];
			// seeded, so a mismatch reproduces
			let seed = 7;
			const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
			for (let i = 0; i < 4000; i++) {
				const magnitude = [1, 100, 1e4, 1e7][i % 4];
				values.push((random() - 0.5) * magnitude);
				values.push(Math.round((random() - 0.5) * magnitude * 1000) / 1000);
			}

			const mismatches: string[] = [];
			for (let decimals = 0; decimals <= 4; decimals++)
				for (const optional of [false, true])
					for (const sign of [false, true])
						for (const v of values) {
							const expected = numbro(v).format({
								thousandSeparated: true,
								mantissa: decimals,
								optionalMantissa: optional,
								forceSign: sign,
							});
							const actual = formatNumber(v, decimals, optional, sign);
							if (actual !== expected)
								mismatches.push(
									`${v} ${decimals} ${optional} ${sign}: ${actual} != ${expected}`
								);
						}

			expect(mismatches).toStrictEqual([]);
			for (const v of [NaN, Infinity, -Infinity])
				expect(formatNumber(v, 3, true, true)).toBe("—");
		});
	});

	describe("signed", () => {
		// the copies it replaced: (v > 0 ? "+" : "") + formatNumber(v, d)
		it.each([
			[1234.4, 0, "+1,234"],
			[0.4, 0, "+0"],
			[0, 0, "0"],
			[-12.6, 0, "-13"],
			[2.5, 2, "+2.50"],
			[-0.004, 2, "0.00"],
			[NaN, 2, "—"],
		])("signed(%s, %s) = %s", (value, decimals, out) => {
			expect(signed(value, decimals)).toBe(out);
			expect(signed(value, decimals)).toBe(
				(value > 0 ? "+" : "") + formatNumber(value, decimals)
			);
		});

		it("uses 2 decimals by default", () => {
			expect(signed(1)).toBe("+1.00");
		});
	});

	describe("formatPercent", () => {
		it("adds the unit to a number", () => {
			expect(formatPercent(12.345)).toBe("12.35 %");
			expect(formatPercent(0)).toBe("0.00 %");
		});

		it("shows a bare dash for ∞ and NaN", () => {
			expect(formatPercent(NaN)).toBe("—");
			expect(formatPercent(Infinity)).toBe("—");
		});
	});

	describe("formatAmount", async () => {
		it("infinity", async () => {
			const result = formatAmount(Infinity);
			expect(result).toStrictEqual("—");
		});

		it("nan", async () => {
			const result = formatAmount(NaN);
			expect(result).toStrictEqual("—");
		});

		it("normal amount", async () => {
			const result = formatAmount(12358);
			expect(result).toStrictEqual("12,358");
		});
	});

	describe("formatPayback", () => {
		it("positive days", () => {
			expect(formatPayback(12.345)).toStrictEqual("12.35 d");
			expect(formatPayback(12.345, false)).toStrictEqual("12.35");
		});

		it("0 pays back at once", () => {
			expect(formatPayback(0)).toStrictEqual("0.00 d");
		});

		it.each([-138.62, Infinity, -Infinity, NaN])(
			"%s never pays back",
			(days) => {
				expect(formatPayback(days)).toStrictEqual("never");
			}
		);
	});

	describe("clamp", async () => {
		it("min", async () => {
			const result = clamp(-10, 0, 10);
			expect(result).toBe(0);
		});

		it("max", async () => {
			const result = clamp(20, 0, 10);
			expect(result).toBe(10);
		});

		it("middle", async () => {
			const result = clamp(5, -10, 10);
			expect(result).toBe(5);
		});
	});

	describe("boundaryDescriptor", async () => {
		it("low", async () => {
			expect(boundaryDescriptor(-10, 0, 0)).toBe("LOW");
		});
		it("normal", async () => {
			expect(boundaryDescriptor(5, 0, 10)).toBe("NORMAL");
		});
		it("high", async () => {
			expect(boundaryDescriptor(10, 0, 5)).toBe("HIGH");
		});
	});

	it("formatSmallNumber keeps tiny values readable", () => {
		expect(formatSmallNumber(0.005)).toBe("0.005");
		expect(formatSmallNumber(0.0024)).toBe("0.0024");
		expect(formatSmallNumber(0.12345)).toBe("0.123");
		expect(formatSmallNumber(0)).toBe("0");
		expect(formatSmallNumber(1.8)).toBe("1.80");
		expect(formatSmallNumber(1234.5)).toBe("1,234.50");
		expect(formatSmallNumber(NaN)).toBe("—");
	});
});
