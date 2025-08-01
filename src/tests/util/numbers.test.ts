import { describe, expect, it } from "vitest";
import {
	formatNumber,
	formatAmount,
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
			expect(result).toStrictEqual("∞");
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
			expect(result).toStrictEqual("∞");
		});
	});

	describe("formatAmount", async () => {
		it("infinity", async () => {
			const result = formatAmount(Infinity);
			expect(result).toStrictEqual("∞");
		});

		it("nan", async () => {
			const result = formatAmount(NaN);
			expect(result).toStrictEqual("∞");
		});

		it("normal amount", async () => {
			const result = formatAmount(12358);
			expect(result).toStrictEqual("12,358");
		});
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
});
