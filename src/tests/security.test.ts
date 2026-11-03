import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { injectLanding } from "@/prerender";

const sha256 = (code: string) =>
	`'sha256-${createHash("sha256").update(code).digest("base64")}'`;

// executable inline scripts; JSON-LD is data, CSP doesn't apply to it
const inlineScripts = (html: string) =>
	[...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)]
		.filter(([, attrs = ""]) => !/src=|application\/ld\+json/.test(attrs))
		.map(([, , code]) => code!);

const doc = readFileSync("docs/security.md", "utf8");

describe("CSP draft (docs/security.md)", () => {
	const shell = readFileSync("index.html", "utf8");
	const built = (entry: string) =>
		injectLanding(
			shell.replace(
				'<script type="module" src="/src/main.ts"></script>',
				`<script type="module" crossorigin src="${entry}"></script>`
			),
			"<h1>landing</h1>"
		);

	it("lists the hash of every inline script the build serves", () => {
		const scripts = inlineScripts(built("/assets/index.abc.js"));
		expect(scripts).toHaveLength(2);
		for (const code of scripts) expect(doc).toContain(sha256(code));
	});

	it("keeps the hashes across builds", () => {
		expect(inlineScripts(built("/assets/index.abc.js"))).toEqual(
			inlineScripts(built("/assets/index.xyz.js"))
		);
	});
});
