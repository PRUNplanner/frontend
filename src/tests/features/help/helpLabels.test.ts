import { describe, it, expect } from "vitest";

// the English help files, as written
const EN_FILES = import.meta.glob("@/assets/help/en_US/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// every English UI string
const LOCALES = import.meta.glob(["@/locales/en_US/*.json", "!**/help.json"], {
	import: "default",
	eager: true,
}) as Record<string, unknown>;

// bold text in help that isn't a UI string on purpose
const ALLOWED = new Set<string>([]);

// the messages by namespace, as vue-i18n sees them: terms.json -> terms.*
const MESSAGES = Object.fromEntries(
	Object.entries(LOCALES).map(([path, json]) => [
		path.split("/").pop()!.replace(".json", ""),
		json,
	])
);

/** a linked message `@:terms.cx Preference` with its target filled in */
function resolve(text: string, depth = 0): string {
	if (depth > 5) return text;
	return text.replace(/@(?:\.\w+)?:([\w.-]+)/g, (link, key: string) => {
		const target = key
			.split(".")
			.reduce<unknown>(
				(node, part) => (node as Record<string, unknown>)?.[part],
				MESSAGES
			);
		// a plural target links its first form
		return typeof target === "string"
			? resolve(target.split(" | ")[0]!.trim(), depth + 1)
			: link;
	});
}

function strings(value: unknown): string[] {
	if (typeof value === "string")
		// a plural message: each form on its own
		return value.split(" | ").map((s) => resolve(s.trim()));
	if (value && typeof value === "object")
		return Object.values(value).flatMap(strings);
	return [];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "{n} plans" matches "3 plans" and "{n} plans" alike
const labels = strings(Object.values(LOCALES));
const exact = new Set(labels);
const patterns = labels
	.filter((l) => /\{[^}]*\}/.test(l))
	.map(
		(l) =>
			new RegExp(
				`^${l
					.split(/\{[^}]*\}/)
					.map(escape)
					.join(".+")}$`
			)
	);

const isLabel = (text: string) =>
	exact.has(text) || ALLOWED.has(text) || patterns.some((p) => p.test(text));

describe("help quotes the UI's labels", () => {
	it.each(Object.keys(EN_FILES))("%s: every bold span is a label", (path) => {
		const bold = [...EN_FILES[path]!.matchAll(/\*\*([^*]+?)\*\*/g)].map(
			(m) => m[1]!
		);
		expect(bold.filter((b) => !isLabel(b))).toEqual([]);
	});
});
