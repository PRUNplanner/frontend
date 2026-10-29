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

	it("parses the game data env vars as numbers", async () => {
		vi.stubEnv("VITE_GAME_DATA_STALE_MINUTES_EXCHANGES", "15");
		vi.stubEnv("VITE_GAME_DATA_WRITE_DELAY_MS", "0");
		vi.resetModules();

		const { default: freshConfig } = await import("@/lib/config");

		expect(freshConfig.GAME_DATA_STALE_MINUTES_EXCHANGES).toBe(15);
		// 0 is a value, not a missing one
		expect(freshConfig.GAME_DATA_WRITE_DELAY_MS).toBe(0);
	});

	it("falls back to the defaults for unset or invalid env vars", async () => {
		vi.stubEnv("VITE_GAME_DATA_STALE_MINUTES_PLANETS", "soon");
		vi.resetModules();

		const { default: freshConfig } = await import("@/lib/config");

		expect(freshConfig.GAME_DATA_STALE_MINUTES_PLANETS).toBe(3 * 60);
		expect(freshConfig.GAME_DATA_STALE_MINUTES_BUILDINGS).toBe(24 * 60);
		expect(freshConfig.GAME_DATA_MAX_AGE_MINUTES_RECIPES).toBe(7 * 24 * 60);
		expect(freshConfig.GAME_DATA_WRITE_DELAY_MS).toBe(5000);
	});
});
