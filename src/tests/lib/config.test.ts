import { describe, it, expect, vi, afterEach } from "vitest";
import config from "@/lib/config";

describe("Config", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("config defined", () => {
		expect(config.API_BASE_URL).toBe("https://api.prunplanner.org");
	});

	it("honours VITE_INDEXEDDB_DBNAME override", async () => {
		vi.stubEnv("VITE_INDEXEDDB_DBNAME", "custom-db");
		vi.resetModules();

		const { default: freshConfig } = await import("@/lib/config");

		expect(freshConfig.INDEXEDDB_DBNAME).toBe("custom-db");
	});
});
