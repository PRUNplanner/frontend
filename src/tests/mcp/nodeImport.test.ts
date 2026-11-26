// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// The MCP server runs in Node without the app: importing it, the plan
// engine and the price book must not load Vue, i18n, stores or the data layer
const { forbidden } = vi.hoisted(() => ({
	forbidden: (name: string) => () => {
		throw new Error(`${name} imported by the MCP server`);
	},
}));
vi.mock("vue", forbidden("vue"));
vi.mock("vue-i18n", forbidden("vue-i18n"));
vi.mock("pinia", forbidden("pinia"));
vi.mock("posthog-js", forbidden("posthog-js"));
vi.mock("@/lib/i18n", forbidden("@/lib/i18n"));
vi.mock("@/database/stores", forbidden("@/database/stores"));
vi.mock("@/stores/planningStore", forbidden("@/stores/planningStore"));

describe("MCP Node import guard", () => {
	it("imports the server and the engine package without the app", async () => {
		const modules = await Promise.all([
			import("@/mcp/app"),
			import("@prunplanner/engine"),
			import("@prunplanner/engine/schemas"),
		]);
		expect(modules.every(Boolean)).toBe(true);
	});
});
