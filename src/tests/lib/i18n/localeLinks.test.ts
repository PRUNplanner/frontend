import { describe, expect, it } from "vitest";

const modules = import.meta.glob("@/locales/en_US/*.json", { eager: true });

// flattened "<file>.<path>" -> message
const messages = new Map<string, string>();

function flatten(prefix: string, value: unknown) {
	if (typeof value === "string") messages.set(prefix, value);
	else if (value && typeof value === "object")
		for (const [k, v] of Object.entries(value))
			flatten(`${prefix}.${k}`, v);
}

for (const [path, module] of Object.entries(modules)) {
	const file = path.split("/").pop()!.replace(".json", "");
	flatten(file, (module as { default: object }).default);
}

// vue-i18n linked messages: @:{'a.b'} or @:a.b (a trailing "." ends the path)
const LINK = /@(?:\.\w+)?:(?:\{'([^']+)'\}|([\w.]+))/g;

describe("en_US linked messages", () => {
	it("every @: link points to an existing key", () => {
		const unresolved: string[] = [];

		for (const [key, message] of messages) {
			for (const m of message.matchAll(LINK)) {
				const target = m[1] ?? m[2].replace(/\.+$/, "");
				if (!messages.has(target))
					unresolved.push(`${key} -> ${target}`);
			}
		}

		expect(unresolved).toStrictEqual([]);
	});
});
