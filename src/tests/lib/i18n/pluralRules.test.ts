import { afterEach, describe, expect, it } from "vitest";

import { i18n, type AppLocale } from "@/lib/i18n";

const t = i18n.global.t as (key: string, n: number) => string;

describe("ru_RU plural rule", () => {
	i18n.global.setLocaleMessage("ru_RU" as AppLocale, {
		four: "нет баз | {n} база | {n} базы | {n} баз",
		three: "нет | один | много",
		two: "база | базы",
	});

	afterEach(() => {
		i18n.global.locale.value = "en_US";
	});

	it("picks zero | one | few | many from four forms", () => {
		i18n.global.locale.value = "ru_RU" as AppLocale;
		const cases: [number, string][] = [
			[0, "нет баз"],
			[1, "1 база"],
			[3, "3 базы"],
			[5, "5 баз"],
			[11, "11 баз"],
			[12, "12 баз"],
			[21, "21 база"],
			[22, "22 базы"],
			[111, "111 баз"],
		];
		for (const [n, expected] of cases) expect(t("four", n)).toBe(expected);
	});

	it("keeps en_US's zero | one | many shape for three forms", () => {
		i18n.global.locale.value = "ru_RU" as AppLocale;
		expect([0, 1, 3, 5].map((n) => t("three", n))).toEqual([
			"нет",
			"один",
			"много",
			"много",
		]);
	});

	it("keeps the default for two forms", () => {
		i18n.global.locale.value = "ru_RU" as AppLocale;
		expect([0, 1, 2, 21].map((n) => t("two", n))).toEqual([
			"базы",
			"база",
			"базы",
			"базы",
		]);
	});
});
