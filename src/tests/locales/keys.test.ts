import { describe, it, expect } from "vitest";

const messages = import.meta.glob<Record<string, unknown>>(
	"/src/locales/en_US/*.json",
	{ eager: true, import: "default" }
);
const sources = import.meta.glob<string>(
	["/src/**/*.{vue,ts}", "!/src/tests/**"],
	{ eager: true, query: "?raw", import: "default" }
);

const en: Record<string, unknown> = Object.fromEntries(
	Object.entries(messages).map(([path, m]) => [
		path.split("/").pop()!.replace(".json", ""),
		m,
	])
);

const resolves = (key: string) =>
	key
		.split(".")
		.reduce<unknown>(
			(node, part) =>
				node && typeof node === "object"
					? (node as Record<string, unknown>)[part]
					: undefined,
			en
		) !== undefined;

// static keys only, template-literal lookups can't be checked this way
const KEY_RX =
	/(?<![\w.])(?:\$t|t|te)\(\s*["']([a-z_0-9]+(?:\.\w+)+)["']|keypath=["']([a-z_0-9]+(?:\.\w+)+)["']/g;
const LINK_RX = /@:(?:\{')?([a-z_0-9]+(?:\.\w+)+)/g;

describe("en_US keys", () => {
	it("resolves every static key used in src", () => {
		const missing = Object.entries(sources).flatMap(([file, code]) =>
			[...code.matchAll(KEY_RX)]
				.map((m) => m[1] ?? m[2])
				.filter((key) => key.split(".")[0] in en && !resolves(key))
				.map((key) => `${file}: ${key}`)
		);
		expect(missing).toEqual([]);
	});

	it("resolves every @: linked key", () => {
		const missing = [...JSON.stringify(en).matchAll(LINK_RX)]
			.map((m) => m[1])
			.filter((key) => !resolves(key));
		expect(missing).toEqual([]);
	});
});
