import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

import { TOOLS } from "@/mcp/tools";
import { PROMPTS } from "@/mcp/prompts";
import { MCP_SERVER_URL } from "@/features/api_keys/apiEndpoints";

// the help article players set up their assistant from (spec mcp-03-help)
const ARTICLE = readFileSync("src/assets/help/en_US/mcp.md", "utf8");
const BLOCKS = [...ARTICLE.matchAll(/```(\w+)\n([\s\S]*?)```/g)].map((m) => ({
	lang: m[1]!,
	code: m[2]!,
}));

describe("the mcp help article", () => {
	it.each(TOOLS.map((t) => t.name))("names the tool %s", (name) => {
		expect(ARTICLE).toContain(`\`${name}\``);
	});

	it.each(PROMPTS.map((p) => [p.name, p.title]))(
		"names the prompt %s (%s)",
		(name, title) => {
			expect(ARTICLE).toContain(`\`${name}\``);
			expect(ARTICLE).toContain(title);
		}
	);

	it("has parseable JSON snippets", () => {
		const json = BLOCKS.filter((b) => b.lang === "json");
		expect(json.length).toBeGreaterThan(0);
		for (const b of json) expect(() => JSON.parse(b.code)).not.toThrow();
	});

	it("points every snippet at the server with the key placeholder", () => {
		expect(BLOCKS.length).toBeGreaterThan(0);
		for (const { code } of BLOCKS) {
			expect(code).toContain(MCP_SERVER_URL);
			// only the production server, no other host
			expect(code.match(/https?:\/\/[^\s"]+/g)).toEqual(
				code.match(/https?:\/\/[^\s"]+/g)!.map(() => MCP_SERVER_URL)
			);
			// the key: the placeholder or a variable holding it
			expect(code).toMatch(/Api-Key (<YOUR_KEY>|\$\{[^}]+\})/);
		}
	});
});
